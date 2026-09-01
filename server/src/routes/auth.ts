import { Router, Request, Response } from 'express';
import { run, get, all } from '../db/database';
import crypto from 'crypto';
import {
  savePasskeyToSupabase,
  verifyPasskeyWithSupabase,
  togglePasskeyInSupabase,
  deletePasskeyFromSupabase,
  fetchPasskeysFromSupabase,
} from '../services/supabaseService';

const router = Router();

export interface AccessKeyRecord {
  id: number;
  key_code: string;
  label: string;
  is_active: number;
  is_admin?: number;
  plan_type?: 'starter' | 'pro';
  daily_limit?: number;
  max_whatsapp_accounts?: number;
  max_email_accounts?: number;
  bound_device_id?: string | null;
  bound_device_info?: string | null;
  bound_at?: string | null;
  device_lock_enabled?: number;
  created_at: string;
  last_used_at?: string;
}

/**
 * Helper to generate secure readable license keys
 * Format: OUTREACH-XXXX-XXXX-XXXX
 */
function generateRandomKey(prefix: string = 'OUTREACH'): string {
  const segment1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const segment2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const segment3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${segment1}-${segment2}-${segment3}`;
}

/**
 * POST /api/auth/login
 * Validates the provided Access Key against local DB and Supabase
 * Enforces Single-Device Hardware Binding (1 Key = 1 Device)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { accessKey, deviceId, deviceInfo } = req.body;

    if (!accessKey || typeof accessKey !== 'string' || !accessKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Access Key to continue.',
      });
    }

    const cleanKey = accessKey.trim().toUpperCase();

    // 1. Query local database
    let record = await get<AccessKeyRecord>(
      'SELECT * FROM access_keys WHERE UPPER(key_code) = ? AND is_active = 1',
      [cleanKey]
    );

    // 2. Check Supabase cloud if not found locally
    if (!record) {
      const supaResult = await verifyPasskeyWithSupabase(cleanKey);
      if (supaResult.valid && supaResult.record) {
        // Cache to local DB
        const insertRes = await run(
          'INSERT INTO access_keys (key_code, label, is_active, is_admin) VALUES (?, ?, 1, 0)',
          [supaResult.record.key_code, supaResult.record.label || 'Supabase Cloud Key']
        );
        record = await get<AccessKeyRecord>('SELECT * FROM access_keys WHERE id = ?', [insertRes.id]);
      }
    }

    if (!record) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or deactivated Access Key. Please check with your administrator.',
      });
    }

    const isAdmin = Boolean(
      record.is_admin === 1 ||
      cleanKey === 'OUTREACH-PRO-2025' ||
      cleanKey.includes('ADMIN')
    );

    const cleanDeviceId = (deviceId && typeof deviceId === 'string') ? deviceId.trim() : null;
    const cleanDeviceInfo = (deviceInfo && typeof deviceInfo === 'string') ? deviceInfo.trim() : 'Registered Browser';

    // 3. Single-User Device Lock Check (1 Key = 1 Device)
    if (!isAdmin && record.device_lock_enabled !== 0) {
      if (!record.bound_device_id) {
        // First login: bind this device permanently to this passkey
        if (cleanDeviceId) {
          await run(
            'UPDATE access_keys SET bound_device_id = ?, bound_device_info = ?, bound_at = CURRENT_TIMESTAMP WHERE id = ?',
            [cleanDeviceId, cleanDeviceInfo, record.id]
          );
          record.bound_device_id = cleanDeviceId;
          record.bound_device_info = cleanDeviceInfo;
        }
      } else if (cleanDeviceId && record.bound_device_id !== cleanDeviceId) {
        // Device mismatch! User is attempting to share this passkey on another computer/phone
        return res.status(403).json({
          success: false,
          deviceLocked: true,
          error: `🔒 Single-Device Lock: This passkey is already registered to another device (${record.bound_device_info || 'Bound Device'}). Key sharing is prohibited. Contact administrator to reset your device binding.`,
        });
      }
    }

    // Update last_used_at timestamp
    await run(
      'UPDATE access_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [record.id]
    );

    // Create a lightweight session token
    const sessionToken = Buffer.from(
      JSON.stringify({
        id: record.id,
        key: record.key_code,
        label: record.label,
        isAdmin,
        loginAt: Date.now(),
      })
    ).toString('base64');

    return res.json({
      success: true,
      message: 'Access granted successfully!',
      token: sessionToken,
      keyInfo: {
        id: record.id,
        keyCode: record.key_code,
        label: record.label,
        isAdmin,
      },
    });
  } catch (err: any) {
    console.error('[Auth Error] Login failure:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during authentication.',
    });
  }
});

/**
 * POST /api/auth/verify
 * Validates active session token or stored key
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { accessKey, deviceId } = req.body;

    if (!accessKey || typeof accessKey !== 'string') {
      return res.status(401).json({ success: false, valid: false });
    }

    const cleanKey = accessKey.trim().toUpperCase();

    let record = await get<AccessKeyRecord>(
      'SELECT id, key_code, label, is_active, is_admin, bound_device_id, bound_device_info, device_lock_enabled FROM access_keys WHERE UPPER(key_code) = ? AND is_active = 1',
      [cleanKey]
    );

    if (!record) {
      const supaResult = await verifyPasskeyWithSupabase(cleanKey);
      if (supaResult.valid && supaResult.record) {
        const isAdmin = Boolean(cleanKey === 'OUTREACH-PRO-2025' || cleanKey.includes('ADMIN'));
        return res.json({
          success: true,
          valid: true,
          keyInfo: {
            id: 0,
            keyCode: supaResult.record.key_code,
            label: supaResult.record.label || 'Supabase Key',
            isAdmin,
          },
        });
      }
      return res.status(401).json({ success: false, valid: false, error: 'Key expired or deactivated' });
    }

    const isAdmin = Boolean(
      record.is_admin === 1 ||
      cleanKey === 'OUTREACH-PRO-2025' ||
      cleanKey.includes('ADMIN')
    );

    // If device lock is active, verify that this session's device matches
    if (!isAdmin && record.device_lock_enabled !== 0 && record.bound_device_id && deviceId) {
      if (record.bound_device_id !== deviceId.trim()) {
        return res.status(403).json({
          success: false,
          valid: false,
          deviceMismatch: true,
          error: `🚫 Device mismatch: This passkey is registered to another device (${record.bound_device_info || 'Bound Device'}).`,
        });
      }
    }

    return res.json({
      success: true,
      valid: true,
      keyInfo: {
        id: record.id,
        keyCode: record.key_code,
        label: record.label,
        isAdmin,
      },
    });
  } catch (err: any) {
    console.error('[Auth Error] Verify failure:', err);
    return res.status(500).json({ success: false, valid: false });
  }
});

/**
 * GET /api/auth/keys
 * Admin endpoint: List all access keys with subscription plans & device bindings
 */
router.get('/keys', async (_req: Request, res: Response) => {
  try {
    const keys = await all<AccessKeyRecord>(`
      SELECT 
        k.id, 
        k.key_code, 
        k.label, 
        k.is_active, 
        k.is_admin,
        COALESCE(k.plan_type, 'pro') as plan_type, 
        COALESCE(k.daily_limit, 40) as daily_limit, 
        COALESCE(k.max_whatsapp_accounts, 1) as max_whatsapp_accounts, 
        COALESCE(k.max_email_accounts, 1) as max_email_accounts,
        k.bound_device_id,
        k.bound_device_info,
        k.bound_at,
        COALESCE(k.device_lock_enabled, 1) as device_lock_enabled,
        k.created_at, 
        k.last_used_at,
        COALESCE((SELECT count FROM daily_usage WHERE UPPER(daily_usage.key_code) = UPPER(k.key_code) AND channel = 'whatsapp' AND usage_date = DATE('now')), 0) as today_whatsapp_count
      FROM access_keys k 
      ORDER BY k.id DESC
    `);
    return res.json({ success: true, keys });
  } catch (err: any) {
    console.error('[Auth Error] List keys failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve access keys.' });
  }
});

/**
 * POST /api/auth/keys
 * Admin endpoint: Generate or add a new access key (Saves to SQLite + Supabase)
 */
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const { label, customKey, planType = 'pro' } = req.body;

    const keyLabel = (label || 'Client Workspace').trim();
    const keyCode = (customKey || generateRandomKey()).trim().toUpperCase();
    const dailyLimit = planType === 'starter' ? 40 : 999999;
    const maxWhatsapp = planType === 'starter' ? 1 : 10;
    const maxEmail = planType === 'starter' ? 1 : 10;

    const existing = await get<AccessKeyRecord>(
      'SELECT id FROM access_keys WHERE UPPER(key_code) = ?',
      [keyCode]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An access key with this code already exists. Please use a unique code.',
      });
    }

    const result = await run(
      'INSERT INTO access_keys (key_code, label, is_active, plan_type, daily_limit, max_whatsapp_accounts, max_email_accounts) VALUES (?, ?, 1, ?, ?, ?, ?)',
      [keyCode, keyLabel, planType, dailyLimit, maxWhatsapp, maxEmail]
    );

    const newKey = await get<AccessKeyRecord>(
      'SELECT * FROM access_keys WHERE id = ?',
      [result.id]
    );

    // Save asynchronously to Supabase cloud
    if (newKey) {
      savePasskeyToSupabase({
        key_code: newKey.key_code,
        label: newKey.label,
        is_active: newKey.is_active,
      }).catch((e) => console.warn('[Supabase Sync Warn]:', e.message));
    }

    return res.json({
      success: true,
      message: 'New access key created and saved to Supabase!',
      key: newKey,
    });
  } catch (err: any) {
    console.error('[Auth Error] Create key failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to create access key.' });
  }
});

/**
 * PATCH /api/auth/keys/:id/toggle
 * Admin endpoint: Activate or Deactivate a key
 */
router.patch('/keys/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const targetKey = await get<AccessKeyRecord>('SELECT * FROM access_keys WHERE id = ?', [id]);
    const newStatus = isActive ? 1 : 0;
    await run('UPDATE access_keys SET is_active = ? WHERE id = ?', [newStatus, id]);

    if (targetKey) {
      togglePasskeyInSupabase(targetKey.key_code, Boolean(isActive)).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Access key ${newStatus === 1 ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (err: any) {
    console.error('[Auth Error] Toggle key failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to update access key status.' });
  }
});

/**
 * PATCH /api/auth/keys/:id/plan
 * Admin endpoint: Update client subscription plan (Starter vs Pro)
 */
router.patch('/keys/:id/plan', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { planType } = req.body;

    if (planType !== 'starter' && planType !== 'pro') {
      return res.status(400).json({ success: false, error: 'Invalid plan type. Must be starter or pro.' });
    }

    const dailyLimit = planType === 'starter' ? 40 : 999999;
    const maxWhatsapp = planType === 'starter' ? 1 : 10;
    const maxEmail = planType === 'starter' ? 1 : 10;

    await run(
      'UPDATE access_keys SET plan_type = ?, daily_limit = ?, max_whatsapp_accounts = ?, max_email_accounts = ? WHERE id = ?',
      [planType, dailyLimit, maxWhatsapp, maxEmail, id]
    );

    return res.json({
      success: true,
      message: `Client plan updated to ${planType === 'starter' ? 'Starter (₹199/mo)' : 'Agency Pro (Unlimited)'}.`,
    });
  } catch (err: any) {
    console.error('[Auth Error] Update plan failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to update subscription plan.' });
  }
});

/**
 * POST /api/auth/keys/:id/reset-device
 * Super Admin endpoint: Reset / unbind device lock for a client
 */
router.post('/keys/:id/reset-device', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetKey = await get<AccessKeyRecord>('SELECT * FROM access_keys WHERE id = ?', [id]);
    if (!targetKey) {
      return res.status(404).json({ success: false, error: 'Access key not found.' });
    }

    await run(
      'UPDATE access_keys SET bound_device_id = NULL, bound_device_info = NULL, bound_at = NULL WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: `Device binding for "${targetKey.label}" (${targetKey.key_code}) has been reset. The client can now bind on a new device on next login.`,
    });
  } catch (err: any) {
    console.error('[Auth Error] Reset device failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset device binding.' });
  }
});

/**
 * DELETE /api/auth/keys/:id
 * Admin endpoint: Delete an access key
 */
router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const countRow = await get<{ total: number }>('SELECT count(*) as total FROM access_keys');
    if (countRow && countRow.total <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the only remaining access key in the system.',
      });
    }

    const targetKey = await get<AccessKeyRecord>('SELECT * FROM access_keys WHERE id = ?', [id]);
    await run('DELETE FROM access_keys WHERE id = ?', [id]);

    if (targetKey) {
      deletePasskeyFromSupabase(targetKey.key_code).catch(() => {});
    }

    return res.json({ success: true, message: 'Access key deleted successfully.' });
  } catch (err: any) {
    console.error('[Auth Error] Delete key failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete access key.' });
  }
});

/**
 * POST /api/auth/change-master-key
 * Super Admin endpoint: Update master private key
 */
router.post('/change-master-key', async (req: Request, res: Response) => {
  try {
    const { newMasterKey } = req.body;

    if (!newMasterKey || typeof newMasterKey !== 'string' || newMasterKey.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid private master key (at least 4 characters).',
      });
    }

    const cleanKey = newMasterKey.trim().toUpperCase();

    // Get old master key
    const oldAdminKey = await get<AccessKeyRecord>('SELECT * FROM access_keys WHERE is_admin = 1 LIMIT 1');

    if (oldAdminKey) {
      // Delete old from Supabase
      deletePasskeyFromSupabase(oldAdminKey.key_code).catch(() => {});
      // Update in local DB
      await run('UPDATE access_keys SET key_code = ? WHERE id = ?', [cleanKey, oldAdminKey.id]);
      // Carry over user settings to new key so settings remain intact
      await run('UPDATE user_settings SET user_key = ? WHERE user_key = ?', [cleanKey, oldAdminKey.key_code]).catch(() => {});
    } else {
      await run('INSERT INTO access_keys (key_code, label, is_active, is_admin) VALUES (?, ?, 1, 1)', [cleanKey, 'Master Access Key']);
    }

    // Save new to Supabase
    savePasskeyToSupabase({
      key_code: cleanKey,
      label: 'Master Access Key',
      is_active: 1,
    }).catch(() => {});

    return res.json({
      success: true,
      newKey: cleanKey,
      message: 'Private Master Passkey updated successfully! Keep it confidential.',
    });
  } catch (err: any) {
    console.error('[Auth Error] Change master key failure:', err);
    return res.status(500).json({ success: false, error: 'Failed to update master passkey.' });
  }
});

export default router;
