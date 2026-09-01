import { Router, Request, Response } from 'express';
import { getAllSettings, setSetting, getSetting } from '../services/settingsService';
import { setEmergencyKillSwitch, getWhatsAppStatus } from '../services/whatsappService';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const router = Router();

function getDetectedClientSecret() {
  try {
    const rootPath = path.resolve(__dirname, '../../..');
    const secretPath = path.join(rootPath, 'client_secret.json');
    if (fs.existsSync(secretPath)) {
      const raw = fs.readFileSync(secretPath, 'utf8');
      const data = JSON.parse(raw);
      const installed = data.installed || data.web;
      if (installed && (installed.client_id || installed.project_id)) {
        return {
          found: true,
          projectId: installed.project_id || '',
          clientId: installed.client_id || '',
        };
      }
    }
  } catch (err) {
    console.error('Error reading client_secret.json:', err);
  }
  return { found: false };
}

export function extractUserKey(req: Request): string {
  const headerKey = req.headers['x-access-key'] as string;
  if (headerKey && typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim().toUpperCase();
  }

  const authHeader = req.headers['authorization'] as string;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '').trim();
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (decoded.key) {
        return String(decoded.key).trim().toUpperCase();
      }
    } catch (e) {
      // ignore
    }
  }

  return 'OUTREACH-PRO-2025';
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userKey = extractUserKey(req);
    const settings = await getAllSettings(userKey);
    const detectedSecret = getDetectedClientSecret();
    const waStatus = await getWhatsAppStatus();

    // Mask API keys for safe display in UI
    const maskedSettings = {
      ...settings,
      googlePlacesApiKey: maskKey(settings.googlePlacesApiKey),
      youtubeApiKey: maskKey(settings.youtubeApiKey),
      geminiApiKey: maskKey(settings.geminiApiKey),
      claudeApiKey: maskKey(settings.claudeApiKey),
      resendApiKey: maskKey(settings.resendApiKey),
      hasGooglePlacesKey: Boolean(settings.googlePlacesApiKey),
      hasYoutubeKey: Boolean(settings.youtubeApiKey),
      hasGeminiKey: Boolean(settings.geminiApiKey),
      hasClaudeKey: Boolean(settings.claudeApiKey),
      hasResendKey: Boolean(settings.resendApiKey),
      detectedGoogleProject: detectedSecret,
      killSwitchActive: waStatus.killSwitchActive,
      smtpHost: settings.smtpHost || 'smtp.gmail.com',
      smtpPort: settings.smtpPort || '465',
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass ? maskKey(settings.smtpPass) : '',
      smtpFrom: settings.smtpFrom || '',
      resendFromEmail: settings.resendFromEmail || 'onboarding@resend.dev',
    };
    return res.json(maskedSettings);
  } catch (error: any) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userKey = extractUserKey(req);
    const {
      googlePlacesApiKey,
      youtubeApiKey,
      geminiApiKey,
      claudeApiKey,
      defaultPitchTone,
      mockModeEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      resendApiKey,
      resendFromEmail,
      updateFeedUrl,
    } = req.body;

    if (googlePlacesApiKey !== undefined && !googlePlacesApiKey.includes('••••')) {
      await setSetting('googlePlacesApiKey', googlePlacesApiKey.trim(), userKey);
    }
    if (youtubeApiKey !== undefined && !youtubeApiKey.includes('••••')) {
      await setSetting('youtubeApiKey', youtubeApiKey.trim(), userKey);
    }
    if (geminiApiKey !== undefined && !geminiApiKey.includes('••••')) {
      await setSetting('geminiApiKey', geminiApiKey.trim(), userKey);
    }
    if (claudeApiKey !== undefined && !claudeApiKey.includes('••••')) {
      await setSetting('claudeApiKey', claudeApiKey.trim(), userKey);
    }
    if (defaultPitchTone !== undefined) {
      await setSetting('defaultPitchTone', defaultPitchTone, userKey);
    }
    if (mockModeEnabled !== undefined) {
      await setSetting('mockModeEnabled', String(mockModeEnabled), userKey);
    }
    if (smtpHost !== undefined) {
      await setSetting('smtpHost', smtpHost.trim(), userKey);
    }
    if (smtpPort !== undefined) {
      await setSetting('smtpPort', String(smtpPort).trim(), userKey);
    }
    if (smtpUser !== undefined) {
      await setSetting('smtpUser', smtpUser.trim(), userKey);
    }
    if (smtpPass !== undefined && !smtpPass.includes('••••')) {
      await setSetting('smtpPass', smtpPass.trim(), userKey);
    }
    if (smtpFrom !== undefined) {
      await setSetting('smtpFrom', smtpFrom.trim(), userKey);
    }
    if (resendApiKey !== undefined && !resendApiKey.includes('••••')) {
      await setSetting('resendApiKey', resendApiKey.trim(), userKey);
    }
    if (resendFromEmail !== undefined) {
      await setSetting('resendFromEmail', resendFromEmail.trim(), userKey);
    }
    if (updateFeedUrl !== undefined) {
      await setSetting('updateFeedUrl', updateFeedUrl.trim(), userKey);
    }

    return res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    console.error('Save settings error:', error);
    return res.status(500).json({ error: error.message });
  }
});

const CURRENT_APP_VERSION = '1.0.0';

function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  try {
    const rParts = remoteVer.replace(/^v/, '').split('.').map(Number);
    const cParts = currentVer.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
      const r = rParts[i] || 0;
      const c = cParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Endpoint: Check for App Updates
router.get('/check-update', async (_req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    const feedUrl = settings.updateFeedUrl || 'https://raw.githubusercontent.com/outreachai/releases/main/version.json';

    try {
      const feedRes = await axios.get(feedUrl, { timeout: 4000 });
      const data = feedRes.data;
      const latestVer = data.latestVersion || data.version || '1.0.0';
      const updateAvailable = isNewerVersion(latestVer, CURRENT_APP_VERSION);

      return res.json({
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestVer,
        updateAvailable,
        releaseNotes: data.releaseNotes || data.notes || 'Performance improvements and bug fixes.',
        downloadUrl: data.downloadUrl || data.url || '',
        releaseDate: data.releaseDate || '',
      });
    } catch (feedErr: any) {
      return res.json({
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        updateAvailable: false,
        releaseNotes: '',
        downloadUrl: '',
        message: 'Could not connect to update server.',
      });
    }
  } catch (error: any) {
    return res.json({
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      updateAvailable: false,
    });
  }
});

// Emergency Kill Switch Endpoint
router.post('/kill-switch', async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const result = setEmergencyKillSwitch(Boolean(active));
    return res.json(result);
  } catch (error: any) {
    console.error('Kill switch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Test key validity
router.post('/test-key', async (req: Request, res: Response) => {
  const { service, key } = req.body;
  const testKey = key && !key.includes('••••') ? key : await getSetting(getSettingKeyName(service));

  if (!testKey) {
    return res.status(400).json({ success: false, message: 'No API key provided to test.' });
  }

  try {
    if (service === 'google_places') {
      // Test Places API
      const testRes = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        { textQuery: 'coffee in New York', maxResultCount: 1 },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': testKey,
            'X-Goog-FieldMask': 'places.displayName',
          },
          timeout: 7000,
        }
      );
      if (testRes.status === 200) {
        return res.json({ success: true, message: 'Google Places API connected successfully!' });
      }
    } else if (service === 'youtube') {
      // Test YouTube API
      const testRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { part: 'snippet', type: 'channel', q: 'test', maxResults: 1, key: testKey },
        timeout: 7000,
      });
      if (testRes.status === 200) {
        return res.json({ success: true, message: 'YouTube Data API v3 connected successfully!' });
      }
    } else if (service === 'gemini') {
      // Test Gemini API
      const genAI = new GoogleGenerativeAI(testKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const result = await model.generateContent('Hi');
      const response = await result.response;
      if (response.text()) {
        return res.json({ success: true, message: 'Google Gemini API (Gemini 3.6 Flash) connected successfully!' });
      }
    } else if (service === 'claude') {
      // Test Claude API
      const anthropic = new Anthropic({ apiKey: testKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      if (response.content) {
        return res.json({ success: true, message: 'Anthropic Claude API connected successfully!' });
      }
    }

    return res.status(400).json({ success: false, message: 'Service test failed.' });
  } catch (error: any) {
    console.error('Test key error:', error.response?.data || error.message);
    const msg = error.response?.data?.error?.message || error.message || 'Connection test failed';
    return res.status(400).json({ success: false, message: msg });
  }
});

function maskKey(key?: string): string {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

function getSettingKeyName(service: string): string {
  switch (service) {
    case 'google_places':
      return 'googlePlacesApiKey';
    case 'youtube':
      return 'youtubeApiKey';
    case 'gemini':
      return 'geminiApiKey';
    case 'claude':
      return 'claudeApiKey';
    default:
      return '';
  }
}

export default router;
