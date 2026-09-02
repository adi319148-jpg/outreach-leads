import { get, run } from '../db/database';

export interface PlanCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: 'starter' | 'pro';
  message?: string;
}

export interface LeadDiscoveryCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  plan: 'starter' | 'pro';
  message?: string;
}

/**
 * Checks and increments total daily outreach messages (WhatsApp + Email)
 * Starter: Max 40 messages / day
 * Pro: Unlimited
 */
export async function checkAndIncrementUsage(
  userKey?: string,
  channel: 'whatsapp' | 'email' = 'whatsapp',
  increment: number = 1
): Promise<PlanCheckResult> {
  if (!userKey) {
    return {
      allowed: false,
      current: 0,
      limit: 40,
      plan: 'starter',
      message: 'Access passkey required to dispatch messages.',
    };
  }

  const cleanKey = userKey.trim().toUpperCase();

  // Master Admin Key bypass
  if (cleanKey === 'OUTREACH-PRO-2025' || cleanKey.includes('ADMIN')) {
    return { allowed: true, current: 0, limit: Infinity, plan: 'pro' };
  }

  const keyRecord = await get<{ plan_type?: string; daily_limit?: number; is_admin?: number }>(
    'SELECT plan_type, daily_limit, is_admin FROM access_keys WHERE UPPER(key_code) = ?',
    [cleanKey]
  );

  if (keyRecord && (keyRecord.is_admin === 1 || keyRecord.plan_type === 'pro')) {
    return { allowed: true, current: 0, limit: Infinity, plan: 'pro' };
  }

  const dailyLimit = keyRecord?.daily_limit || 40;
  const today = new Date().toISOString().split('T')[0];

  // Calculate total messages sent across BOTH whatsapp and email channels today
  const usage = await get<{ total: number }>(
    "SELECT COALESCE(SUM(count), 0) as total FROM daily_usage WHERE UPPER(key_code) = ? AND channel IN ('whatsapp', 'email') AND usage_date = ?",
    [cleanKey, today]
  );

  const totalSentToday = usage?.total || 0;

  if (totalSentToday + increment > dailyLimit) {
    return {
      allowed: false,
      current: totalSentToday,
      limit: dailyLimit,
      plan: 'starter',
      message: `Daily outreach limit reached (${totalSentToday}/${dailyLimit} messages sent today). Upgrade to Agency Pro for Unlimited messaging!`,
    };
  }

  // Increment usage count for the specific channel
  const channelUsage = await get<{ count: number }>(
    'SELECT count FROM daily_usage WHERE UPPER(key_code) = ? AND channel = ? AND usage_date = ?',
    [cleanKey, channel, today]
  );

  if (channelUsage) {
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
    current: totalSentToday + increment,
    limit: dailyLimit,
    plan: 'starter',
  };
}

/**
 * Checks and increments Google Maps lead extraction
 * Starter: Max 200 leads / day
 * Pro: Unlimited
 */
export async function checkAndIncrementLeadDiscovery(
  userKey?: string,
  increment: number = 0
): Promise<LeadDiscoveryCheckResult> {
  if (!userKey) {
    return {
      allowed: false,
      current: 0,
      limit: 200,
      remaining: 0,
      plan: 'starter',
      message: 'Access passkey required to extract leads.',
    };
  }

  const cleanKey = userKey.trim().toUpperCase();

  // Master Admin Key bypass
  if (cleanKey === 'OUTREACH-PRO-2025' || cleanKey.includes('ADMIN')) {
    return { allowed: true, current: 0, limit: Infinity, remaining: Infinity, plan: 'pro' };
  }

  const keyRecord = await get<{ plan_type?: string; is_admin?: number }>(
    'SELECT plan_type, is_admin FROM access_keys WHERE UPPER(key_code) = ?',
    [cleanKey]
  );

  if (keyRecord && (keyRecord.is_admin === 1 || keyRecord.plan_type === 'pro')) {
    return { allowed: true, current: 0, limit: Infinity, remaining: Infinity, plan: 'pro' };
  }

  const dailyLeadLimit = 200;
  const today = new Date().toISOString().split('T')[0];

  const usage = await get<{ count: number }>(
    "SELECT count FROM daily_usage WHERE UPPER(key_code) = ? AND channel = 'google_maps_leads' AND usage_date = ?",
    [cleanKey, today]
  );

  const currentCount = usage?.count || 0;
  const remaining = Math.max(0, dailyLeadLimit - currentCount);

  if (currentCount >= dailyLeadLimit) {
    return {
      allowed: false,
      current: currentCount,
      limit: dailyLeadLimit,
      remaining: 0,
      plan: 'starter',
      message: `Starter Plan Daily Discovery Limit reached (${currentCount}/${dailyLeadLimit} Google Maps leads extracted today). Upgrade to Agency Pro for Unlimited extraction!`,
    };
  }

  if (increment > 0) {
    const toAdd = Math.min(increment, remaining);
    if (usage) {
      await run(
        "UPDATE daily_usage SET count = count + ? WHERE UPPER(key_code) = ? AND channel = 'google_maps_leads' AND usage_date = ?",
        [toAdd, cleanKey, today]
      );
    } else {
      await run(
        "INSERT INTO daily_usage (key_code, channel, usage_date, count) VALUES (?, 'google_maps_leads', ?, ?)",
        [cleanKey, today, toAdd]
      );
    }

    const newCurrent = currentCount + toAdd;
    return {
      allowed: true,
      current: newCurrent,
      limit: dailyLeadLimit,
      remaining: Math.max(0, dailyLeadLimit - newCurrent),
      plan: 'starter',
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit: dailyLeadLimit,
    remaining,
    plan: 'starter',
  };
}

/**
 * Checks if client is allowed to add multiple accounts
 * Starter: Max 1 Account
 * Pro: Unlimited (Up to 10 simultaneous)
 */
export async function checkMultiAccountAllowed(
  userKey?: string,
  channel: 'whatsapp' | 'email' = 'whatsapp',
  currentAccountCount: number = 0
): Promise<{ allowed: boolean; maxAllowed: number; plan: 'starter' | 'pro'; message?: string }> {
  if (!userKey) {
    return { allowed: false, maxAllowed: 1, plan: 'starter', message: 'Valid passkey required.' };
  }

  const cleanKey = userKey.trim().toUpperCase();
  if (cleanKey === 'OUTREACH-PRO-2025' || cleanKey.includes('ADMIN')) {
    return { allowed: true, maxAllowed: 10, plan: 'pro' };
  }

  const keyRecord = await get<{ plan_type?: string; is_admin?: number }>(
    'SELECT plan_type, is_admin FROM access_keys WHERE UPPER(key_code) = ?',
    [cleanKey]
  );

  if (keyRecord && (keyRecord.is_admin === 1 || keyRecord.plan_type === 'pro')) {
    return { allowed: true, maxAllowed: 10, plan: 'pro' };
  }

  // Starter plan strictly allows 1 account only
  if (currentAccountCount >= 1) {
    return {
      allowed: false,
      maxAllowed: 1,
      plan: 'starter',
      message: `Starter Plan is restricted to 1 ${channel} account. Upgrade to Agency Pro for Multiple Accounts & Round-Robin automation!`,
    };
  }

  return { allowed: true, maxAllowed: 1, plan: 'starter' };
}
