import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSetting, setSetting } from './settingsService';

const DEFAULT_SUPABASE_URL = 'https://bryrrgzbxggmxtelscyo.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_itQcKFQriTCsBd4yG1CYVA_nNd2EWkP';

let supabaseInstance: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const url = (await getSetting('supabaseUrl')) || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = (await getSetting('supabaseKey')) || process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY;

  if (!url || !url.startsWith('http')) {
    return null;
  }

  try {
    if (!supabaseInstance) {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase Error] Failed to initialize client:', err);
    return null;
  }
}

/**
 * Save / Upsert a passkey to Supabase cloud
 */
export async function savePasskeyToSupabase(keyRecord: {
  key_code: string;
  label: string;
  is_active: number;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase URL not configured' };
    }

    const { data, error } = await supabase
      .from('access_keys')
      .upsert(
        {
          key_code: keyRecord.key_code,
          label: keyRecord.label,
          is_active: keyRecord.is_active === 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key_code' }
      )
      .select();

    if (error) {
      console.warn('[Supabase Warning] Could not upsert key to cloud:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Supabase Error] Error saving key:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verify a passkey with Supabase cloud
 */
export async function verifyPasskeyWithSupabase(keyCode: string): Promise<{
  valid: boolean;
  record?: any;
}> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return { valid: false };

    const { data, error } = await supabase
      .from('access_keys')
      .select('*')
      .eq('key_code', keyCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { valid: false };
    }

    return { valid: true, record: data };
  } catch (err) {
    return { valid: false };
  }
}

/**
 * Fetch all passkeys from Supabase
 */
export async function fetchPasskeysFromSupabase(): Promise<any[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('access_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (err) {
    return [];
  }
}

/**
 * Delete a passkey in Supabase
 */
export async function deletePasskeyFromSupabase(keyCode: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('access_keys')
      .delete()
      .eq('key_code', keyCode.trim().toUpperCase());

    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * Toggle a passkey active status in Supabase
 */
export async function togglePasskeyInSupabase(keyCode: string, isActive: boolean): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('access_keys')
      .update({ is_active: isActive })
      .eq('key_code', keyCode.trim().toUpperCase());

    return !error;
  } catch (err) {
    return false;
  }
}
