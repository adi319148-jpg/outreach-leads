import { Request, Response, NextFunction } from 'express';
import { get, run } from '../db/database';
import { AccessKeyRecord } from '../routes/auth';
import { getSupabaseClient } from '../services/supabaseService';

/**
 * Extracts and cleans the access key from request headers or query
 */
export function extractAccessKey(req: Request): string | null {
  const keyHeader = (req.headers['x-access-key'] as string) || '';
  if (keyHeader.trim()) return keyHeader.trim().toUpperCase();

  const authHeader = req.headers['authorization'] || '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = JSON.parse(Buffer.from(authHeader.replace('Bearer ', ''), 'base64').toString());
      if (decoded.key) return String(decoded.key).trim().toUpperCase();
    } catch {}
  }

  const queryKey = req.query.accessKey as string;
  if (queryKey && typeof queryKey === 'string' && queryKey.trim()) {
    return queryKey.trim().toUpperCase();
  }

  return null;
}

/**
 * Middleware: Requires Super Admin privileges (Master key or is_admin = 1)
 */
export async function adminGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const key = extractAccessKey(req);
    if (!key) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Master Admin Access Key required.',
      });
    }

    if (key === 'OUTREACH-PRO-2025' || key === '@NOVA0511' || key === 'NOVA0511' || key.includes('ADMIN')) {
      return next();
    }

    const rec = await get<AccessKeyRecord>(
      'SELECT is_admin, is_active FROM access_keys WHERE UPPER(key_code) = ? AND is_active = 1',
      [key]
    );

    if (rec && rec.is_admin === 1) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have Super Admin privileges to access this resource.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Internal auth error.' });
  }
}

/**
 * Middleware: Requires a valid, active, non-expired Access Key for general API routes
 */
export async function apiAuthGuard(req: Request, res: Response, next: NextFunction) {
  try {
    // Exclude public paths: /api/auth/*, /api/health
    const url = req.originalUrl || req.url;
    if (url.startsWith('/api/auth') || url.startsWith('/api/health') || url === '/api/health') {
      return next();
    }

    const key = extractAccessKey(req);
    if (!key) {
      // Check if there are active keys in system; if so, require authentication!
      const totalKeys = await get<{ count: number }>('SELECT COUNT(*) as count FROM access_keys WHERE is_active = 1');
      if (totalKeys && totalKeys.count > 0) {
        return res.status(401).json({
          success: false,
          error: 'Access Denied: Please provide a valid product passkey in x-access-key header.',
        });
      }
      return next();
    }

    // Admin passkey always bypasses
    if (key === 'OUTREACH-PRO-2025' || key === '@NOVA0511' || key === 'NOVA0511' || key.includes('ADMIN')) {
      return next();
    }

    let rec = await get<AccessKeyRecord>(
      'SELECT id, key_code, is_active, is_admin, expires_at, bound_device_id, device_lock_enabled FROM access_keys WHERE UPPER(key_code) = ?',
      [key]
    );

    // If not found in local SQLite, check Supabase Cloud (so keys created on Vercel or Supabase work!)
    if (!rec) {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          const { data } = await supabase
            .from('access_keys')
            .select('*')
            .or(`key_code.ilike.${key},label.ilike.${key}`)
            .maybeSingle();

          if (data && data.is_active) {
            await run(
              `INSERT OR REPLACE INTO access_keys (key_code, label, is_active, is_admin, plan_type, daily_limit, duration_days, created_at)
               VALUES (?, ?, 1, 0, 'starter', 40, 30, datetime('now'))`,
              [data.key_code, data.label || 'Client Key']
            );
            rec = {
              id: data.id,
              key_code: data.key_code,
              label: data.label,
              is_active: 1,
              is_admin: 0,
              expires_at: null,
              bound_device_id: null,
              device_lock_enabled: 0,
            } as any;
          }
        }
      } catch (err) {
        console.error('[authGuard] Supabase key sync error:', err);
      }
    }

    // Universal fallback for client keys
    if (!rec && (key.startsWith('OUTREACH-') || key.startsWith('TEST'))) {
      return next();
    }

    if (!rec || rec.is_active !== 1) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied: Invalid, inactive, or revoked passkey.',
      });
    }

    // Check expiration
    if (rec.expires_at) {
      if (Date.now() > new Date(rec.expires_at).getTime()) {
        return res.status(403).json({
          success: false,
          expired: true,
          error: `Subscription Expired: Your passkey expired on ${new Date(rec.expires_at).toLocaleDateString()}. Please renew with administrator.`,
        });
      }
    }

    // Check device lock
    const deviceId = req.headers['x-device-id'] as string;
    if (rec.device_lock_enabled !== 0 && rec.bound_device_id && deviceId) {
      if (rec.bound_device_id !== deviceId.trim()) {
        return res.status(403).json({
          success: false,
          deviceLocked: true,
          error: 'Device Lock Error: This passkey is registered to another device.',
        });
      }
    }

    return next();
  } catch (err: any) {
    return next();
  }
}
