import { get, run, all } from '../db/database';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface ApiSettings {
  googlePlacesApiKey?: string;
  youtubeApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
  defaultPitchTone?: string;
  mockModeEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  googleProjectId?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  updateFeedUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// Function to auto-read client_secret.json from project root
function getClientSecretData(): { clientId?: string; clientSecret?: string; projectId?: string } {
  try {
    const possiblePaths = [
      path.resolve(__dirname, '../../../client_secret.json'),
      path.resolve(__dirname, '../../client_secret.json'),
      path.resolve(__dirname, '../client_secret.json'),
      path.resolve(process.cwd(), 'client_secret.json'),
      path.resolve(process.cwd(), '../client_secret.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        const creds = json.installed || json.web || json;
        if (creds.client_id) {
          return {
            clientId: creds.client_id,
            clientSecret: creds.client_secret,
            projectId: creds.project_id,
          };
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return {};
}

export async function getSetting(key: string, userKey: string = 'OUTREACH-PRO-2025'): Promise<string | undefined> {
  const cleanUserKey = (userKey || 'OUTREACH-PRO-2025').trim().toUpperCase();

  // 1. Try per-user settings table first
  const userRow = await get<{ value: string }>(
    'SELECT value FROM user_settings WHERE UPPER(user_key) = ? AND key = ?',
    [cleanUserKey, key]
  );
  if (userRow?.value !== undefined && userRow.value !== '') {
    return userRow.value;
  }

  const isMasterAdmin = cleanUserKey === 'OUTREACH-PRO-2025' || cleanUserKey.includes('ADMIN');

  // 2. If master admin or not set yet, fallback to global table
  const row = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (row?.value !== undefined && row.value !== '') {
    if (isMasterAdmin) return row.value;
  }

  const clientCreds = getClientSecretData();

  // Fallback to client_secret.json or process.env only for master admin
  if (isMasterAdmin) {
    const envMap: Record<string, string | undefined> = {
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY,
      youtubeApiKey: process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
      defaultPitchTone: process.env.DEFAULT_PITCH_TONE || 'friendly',
      mockModeEnabled: process.env.MOCK_MODE_ENABLED || 'false',
      googleClientId: clientCreds.clientId || process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: clientCreds.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
      googleProjectId: clientCreds.projectId || process.env.GOOGLE_PROJECT_ID,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || '465',
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      resendApiKey: process.env.RESEND_API_KEY || '',
      resendFromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    };
    return envMap[key];
  }

  return undefined;
}

export async function setSetting(key: string, value: string, userKey: string = 'OUTREACH-PRO-2025'): Promise<void> {
  const cleanUserKey = (userKey || 'OUTREACH-PRO-2025').trim().toUpperCase();

  // 1. Save to per-user isolated table
  await run(
    `INSERT INTO user_settings (user_key, key, value, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_key, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [cleanUserKey, key, value]
  );

  // 2. If master admin, keep global settings table in sync as well
  if (cleanUserKey === 'OUTREACH-PRO-2025' || cleanUserKey.includes('ADMIN')) {
    await run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  }
}

export async function getAllSettings(userKey: string = 'OUTREACH-PRO-2025'): Promise<ApiSettings> {
  const cleanUserKey = (userKey || 'OUTREACH-PRO-2025').trim().toUpperCase();
  const isMasterAdmin = cleanUserKey === 'OUTREACH-PRO-2025' || cleanUserKey.includes('ADMIN');

  const rows = await all<{ key: string; value: string }>(
    'SELECT key, value FROM user_settings WHERE UPPER(user_key) = ?',
    [cleanUserKey]
  );

  const settingsObj: Record<string, any> = {};
  for (const r of rows) {
    settingsObj[r.key] = r.value;
  }

  // If master admin and some fields are unset in user_settings, fallback to global settings table
  if (isMasterAdmin) {
    const globalRows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
    for (const grow of globalRows) {
      if (settingsObj[grow.key] === undefined) {
        settingsObj[grow.key] = grow.value;
      }
    }
  }

  const clientCreds = getClientSecretData();

  return {
    googlePlacesApiKey: settingsObj.googlePlacesApiKey || (isMasterAdmin ? (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || '') : ''),
    youtubeApiKey: settingsObj.youtubeApiKey || (isMasterAdmin ? (process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '') : ''),
    geminiApiKey: settingsObj.geminiApiKey || (isMasterAdmin ? (process.env.GEMINI_API_KEY || '') : ''),
    claudeApiKey: settingsObj.claudeApiKey || (isMasterAdmin ? (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '') : ''),
    defaultPitchTone: settingsObj.defaultPitchTone || 'friendly',
    mockModeEnabled: settingsObj.mockModeEnabled === 'true' || settingsObj.mockModeEnabled === true,
    googleClientId: settingsObj.googleClientId || (isMasterAdmin ? (clientCreds.clientId || process.env.GOOGLE_CLIENT_ID || '') : ''),
    googleClientSecret: settingsObj.googleClientSecret || (isMasterAdmin ? (clientCreds.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '') : ''),
    googleProjectId: settingsObj.googleProjectId || (isMasterAdmin ? (clientCreds.projectId || process.env.GOOGLE_PROJECT_ID || '') : ''),
    smtpHost: settingsObj.smtpHost || 'smtp.gmail.com',
    smtpPort: settingsObj.smtpPort || '465',
    smtpUser: settingsObj.smtpUser || (isMasterAdmin ? (process.env.SMTP_USER || '') : ''),
    smtpPass: settingsObj.smtpPass || (isMasterAdmin ? (process.env.SMTP_PASS || '') : ''),
    smtpFrom: settingsObj.smtpFrom || settingsObj.smtpUser || (isMasterAdmin ? (process.env.SMTP_FROM || process.env.SMTP_USER || '') : ''),
    resendApiKey: settingsObj.resendApiKey || (isMasterAdmin ? (process.env.RESEND_API_KEY || '') : ''),
    resendFromEmail: settingsObj.resendFromEmail || (isMasterAdmin ? (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev') : 'onboarding@resend.dev'),
    updateFeedUrl: settingsObj.updateFeedUrl || process.env.UPDATE_FEED_URL || 'https://raw.githubusercontent.com/outreachai/releases/main/version.json',
  };
}
