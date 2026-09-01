import { get, run } from '../db/database';

export interface PlanCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: 'starter' | 'pro';
  message?: string;
}

export async function checkAndIncrementUsage(
  userKey?: string,
  channel: 'whatsapp' | 'email' = 'whatsapp',
  increment: number = 1
): Promise<PlanCheckResult> {
  // If no user key or master key, treat as admin/pro
  if (!userKey || userKey.toUpperCase().includes('PRO') || userKey.toUpperCase().includes('ADMIN')) {
    return { allowed: true, current: 0, limit: Infinity, plan: 'pro' };
  }

  const cleanKey = userKey.trim().toUpperCase();
  const keyRecord = await get<{ plan_type?: string; daily_limit?: number; is_admin?: number }>(
    'SELECT plan_type, daily_limit, is_admin FROM access_keys WHERE UPPER(key_code) = ?',
    [cleanKey]
  );

  if (!keyRecord || keyRecord.is_admin === 1 || keyRecord.plan_type === 'pro') {
    return { allowed: true, current: 0, limit: Infinity, plan: 'pro' };
  }

  const dailyLimit = keyRecord.daily_limit || 40;
  const today = new Date().toISOString().split('T')[0];

  const usage = await get<{ count: number }>(
    'SELECT count FROM daily_usage WHERE UPPER(key_code) = ? AND channel = ? AND usage_date = ?',
    [cleanKey, channel, today]
  );

  const currentCount = usage?.count || 0;

  if (currentCount + increment > dailyLimit) {
    return {
      allowed: false,
      current: currentCount,
      limit: dailyLimit,
      plan: 'starter',
      message: `Daily limit reached (${currentCount}/${dailyLimit} ${channel} messages sent today). Upgrade to Agency Pro for Unlimited messaging!`,
    };
  }

  // Increment usage count
  if (usage) {
    await run(
      'UPDATE daily_usage SET count = count + ? WHERE UPPER(key_code) = ? AND channel = ? AND usage_date = ?',
      [increment, cleanKey, channel, today]
    );
  } else {
    await run(
      'INSERT INTO daily_usage (key_code, channel, usage_date, count) VALUES (?, ?, ?, ?)',
      [cleanKey, channel, today, increment]
    );
  }

  return {
    allowed: true,
    current: currentCount + increment,
    limit: dailyLimit,
    plan: 'starter',
  };
}

export async function checkMultiAccountAllowed(
  userKey?: string,
  channel: 'whatsapp' | 'email' = 'whatsapp',
  currentAccountCount: number = 0
): Promise<{ allowed: boolean; maxAllowed: number; plan: 'starter' | 'pro'; message?: string }> {
  if (!userKey || userKey.toUpperCase().includes('PRO') || userKey.toUpperCase().includes('ADMIN')) {
    return { allowed: true, maxAllowed: 10, plan: 'pro' };
  }

  const cleanKey = userKey.trim().toUpperCase();
  const keyRecord = await get<{ plan_type?: string; is_admin?: number }>(
    'SELECT plan_type, is_admin FROM access_keys WHERE UPPER(key_code) = ?',
    [cleanKey]
  );

  if (!keyRecord || keyRecord.is_admin === 1 || keyRecord.plan_type === 'pro') {
    return { allowed: true, maxAllowed: 10, plan: 'pro' };
  }

  // Starter plan only allows 1 account
  if (currentAccountCount >= 1) {
    return {
      allowed: false,
      maxAllowed: 1,
      plan: 'starter',
      message: `Your Starter Plan is limited to 1 ${channel} account. Upgrade to Agency Pro for Multiple Accounts & Round-Robin dispatch!`,
    };
  }

  return { allowed: true, maxAllowed: 1, plan: 'starter' };
}
