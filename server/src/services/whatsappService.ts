import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { run, get, all } from '../db/database';

export type WhatsAppStatus = 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'error';

export interface WhatsAppAccountState {
  id: string; // e.g. 'account_1', 'account_2'
  name: string; // User defined name or phone
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  lastActive: string | null;
  killSwitchActive?: boolean;
}

export interface BatchWhatsAppProgress {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  currentLeadName: string | null;
  currentPhone: string | null;
  secondsRemaining: number;
  statusMessage: string | null;
  activeAccountsCount?: number;
  logs: Array<{ time: string; leadName: string; phone: string; success: boolean; message: string; accountName?: string }>;
}

interface SessionRecord {
  id: string;
  name: string;
  wwebClientId: string;
  client: Client | null;
  state: WhatsAppAccountState;
  isInitializing: boolean;
}

let isEmergencyKillSwitchActive = false;
let cancelBatchRequested = false;
let roundRobinIndex = 0;

const sessions = new Map<string, SessionRecord>();

let batchProgress: BatchWhatsAppProgress = {
  isRunning: false,
  currentIndex: 0,
  totalCount: 0,
  sentCount: 0,
  failedCount: 0,
  currentLeadName: null,
  currentPhone: null,
  secondsRemaining: 0,
  statusMessage: null,
  activeAccountsCount: 0,
  logs: [],
};

function getBrowserExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : '',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[WhatsApp] Auto-detected browser executable: ${p}`);
      return p;
    }
  }
  return undefined;
}

function getAuthDirectory(): string {
  return process.env.WWEBJS_AUTH_PATH
    ? path.resolve(process.env.WWEBJS_AUTH_PATH)
    : path.resolve(__dirname, '../../.wwebjs_auth');
}

function cleanSessionLockFiles(sessionDirPath: string) {
  try {
    if (!fs.existsSync(sessionDirPath)) return;
    const lockFiles = [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
      'DevToolsActivePort',
      'lockfile',
      'CrashpadMetrics-active.pma',
      'BrowserMetrics-spare.pma',
    ];
    for (const file of lockFiles) {
      const filePath = path.join(sessionDirPath, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[WhatsApp] Cleaned stale lock: ${file}`);
        } catch (e) {}
      }
    }
    const defaultSub = path.join(sessionDirPath, 'Default');
    if (fs.existsSync(defaultSub)) {
      for (const file of lockFiles) {
        const filePath = path.join(defaultSub, file);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp] Lock cleanup notice:', err);
  }
}

function getOrCreateSessionRecord(sessionId: string, accountName?: string): SessionRecord {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const newRecord: SessionRecord = {
    id: sessionId,
    name: accountName || `WhatsApp Account ${sessions.size + 1}`,
    wwebClientId: `session_${cleanSessionId}`,
    client: null,
    isInitializing: false,
    state: {
      id: sessionId,
      name: accountName || `WhatsApp Account ${sessions.size + 1}`,
      status: 'disconnected',
      qrCodeDataUrl: null,
      userPhone: null,
      userName: null,
      errorMessage: null,
      lastActive: null,
      killSwitchActive: isEmergencyKillSwitchActive,
    },
  };

  sessions.set(sessionId, newRecord);
  return newRecord;
}

// Auto-seed default session
getOrCreateSessionRecord('account_1', 'Primary WhatsApp');

export function getAllWhatsAppAccounts(): WhatsAppAccountState[] {
  return Array.from(sessions.values()).map((s) => ({
    ...s.state,
    killSwitchActive: isEmergencyKillSwitchActive,
  }));
}

export function getWhatsAppStatus(sessionId: string = 'account_1'): WhatsAppAccountState {
  const record = getOrCreateSessionRecord(sessionId);
  return { ...record.state, killSwitchActive: isEmergencyKillSwitchActive };
}

export function getBatchWhatsAppStatus(): BatchWhatsAppProgress {
  return { ...batchProgress };
}

export function setEmergencyKillSwitch(active: boolean): { success: boolean; killSwitchActive: boolean; message: string } {
  isEmergencyKillSwitchActive = active;
  for (const session of sessions.values()) {
    session.state.killSwitchActive = active;
  }

  if (active) {
    console.log('[EMERGENCY KILL SWITCH] ACTIVATED! Freezing all WhatsApp sending.');
    stopBatchWhatsApp();
    return {
      success: true,
      killSwitchActive: true,
      message: '🚨 EMERGENCY KILL SWITCH ACTIVATED! All auto-sending queues halted.',
    };
  } else {
    console.log('[EMERGENCY KILL SWITCH] DEACTIVATED.');
    return {
      success: true,
      killSwitchActive: false,
      message: '✅ Emergency Kill Switch deactivated. Operations resumed.',
    };
  }
}

export function isKillSwitchEngaged(): boolean {
  return isEmergencyKillSwitchActive;
}

export function stopBatchWhatsApp(): { success: boolean; message: string } {
  if (!batchProgress.isRunning) {
    return { success: true, message: 'No batch campaign currently running.' };
  }
  cancelBatchRequested = true;
  batchProgress.statusMessage = 'Stopping batch campaign...';
  return { success: true, message: 'Batch campaign cancellation requested.' };
}

export async function initializeWhatsAppSession(
  sessionId: string = 'account_1',
  accountName?: string,
  forceRestart: boolean = false
): Promise<WhatsAppAccountState> {
  const session = getOrCreateSessionRecord(sessionId, accountName);

  if (session.client && !forceRestart && (session.state.status === 'connected' || session.state.status === 'qr_ready')) {
    return session.state;
  }

  if (session.isInitializing && !forceRestart) {
    return session.state;
  }

  session.isInitializing = true;
  session.state.status = 'connecting';
  session.state.errorMessage = null;

  (async () => {
    try {
      if (session.client) {
        try {
          const pupBrowser = (session.client as any).pupBrowser;
          if (pupBrowser) {
            await pupBrowser.close().catch(() => {});
          }
          await session.client.destroy().catch(() => {});
        } catch (e) {
          console.log(`[WhatsApp ${sessionId}] Previous client destroy notice:`, e);
        }
        session.client = null;
      }

      const authPath = getAuthDirectory();
      const executablePath = getBrowserExecutablePath();

      // If force restart or error was encountered, randomize sub-client id to ensure fresh unblocked folder
      if (forceRestart) {
        session.wwebClientId = `session_${sessionId}_${Date.now()}`;
      }

      const sessionDirPath = path.join(authPath, `session-${session.wwebClientId}`);
      cleanSessionLockFiles(sessionDirPath);

      console.log(`[WhatsApp ${sessionId}] Initializing client (${session.wwebClientId}) with browser: ${executablePath || 'Bundled'}`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: session.wwebClientId,
          dataPath: authPath,
        }),
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
          executablePath,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
          ],
        },
      });

      session.client = client;

      client.on('qr', async (qr) => {
        console.log(`[WhatsApp ${sessionId}] QR received! Generating QR image...`);
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          session.state.status = 'qr_ready';
          session.state.qrCodeDataUrl = qrDataUrl;
          session.state.errorMessage = null;
          session.isInitializing = false;
          console.log(`[WhatsApp ${sessionId}] ✅ QR Code is READY for scan!`);
        } catch (err: any) {
          session.state.errorMessage = 'Failed to generate QR image';
          session.isInitializing = false;
        }
      });

      client.on('authenticated', () => {
        console.log(`[WhatsApp ${sessionId}] Authenticated successfully!`);
        session.state.status = 'connecting';
        session.state.qrCodeDataUrl = null;
        session.state.errorMessage = null;
      });

      client.on('auth_failure', (msg) => {
        console.error(`[WhatsApp ${sessionId}] Auth failure:`, msg);
        session.state.status = 'disconnected';
        session.state.qrCodeDataUrl = null;
        session.state.errorMessage = `Authentication failed: ${msg}`;
        session.isInitializing = false;
      });

      client.on('ready', () => {
        console.log(`[WhatsApp ${sessionId}] READY and CONNECTED!`);
        const phone = client?.info?.wid?.user || 'Connected User';
        const name = client?.info?.pushname || session.name || 'WhatsApp User';

        session.state.status = 'connected';
        session.state.qrCodeDataUrl = null;
        session.state.userPhone = phone;
        session.state.userName = name;
        session.state.lastActive = new Date().toISOString();
        session.state.errorMessage = null;
        session.isInitializing = false;

        // Persist to DB
        run(
          `INSERT INTO whatsapp_accounts (session_id, account_name, phone_number, status, last_active)
           VALUES (?, ?, ?, 'connected', CURRENT_TIMESTAMP)
           ON CONFLICT(session_id) DO UPDATE SET
             account_name = excluded.account_name,
             phone_number = excluded.phone_number,
             status = 'connected',
             last_active = CURRENT_TIMESTAMP`,
          [sessionId, session.name, phone]
        ).catch(() => {});
      });

      client.on('disconnected', (reason) => {
        console.log(`[WhatsApp ${sessionId}] Disconnected:`, reason);
        session.state.status = 'disconnected';
        session.state.qrCodeDataUrl = null;
        session.state.userPhone = null;
        session.state.userName = null;
        session.state.errorMessage = `Disconnected: ${reason}`;
        session.isInitializing = false;

        run("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE session_id = ?", [sessionId]).catch(() => {});
      });

      // Inbound reply tracker
      client.on('message', async (msg) => {
        try {
          if ((msg as any).isGroupMsg || (msg.from && msg.from.includes('status@broadcast'))) return;
          const fromPhone = (msg.from || '').replace('@c.us', '').replace(/[^0-9]/g, '');
          const body = msg.body || '';

          const phoneTail = fromPhone.slice(-8);
          const matchingLead = await get(
            'SELECT * FROM leads WHERE phone LIKE ? OR phone LIKE ? OR phone LIKE ?',
            [`%${fromPhone}%`, `%${phoneTail}%`, `%${fromPhone.slice(-10)}%`]
          );

          const leadId = (matchingLead as any)?.id || null;
          const leadName = (matchingLead as any)?.name || 'Prospect';
          const originalPitch = (matchingLead as any)?.pitch || null;

          await run(
            `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, original_pitch)
             VALUES (?, 'whatsapp', ?, ?, ?, ?)`,
            [leadId, fromPhone, leadName, body, originalPitch]
          );

          if (leadId) {
            await run("UPDATE leads SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [leadId]);
          }
        } catch (err) {
          console.error(`[WhatsApp Inbound ${sessionId}] Error:`, err);
        }
      });

      await client.initialize();
    } catch (err: any) {
      console.error(`[WhatsApp ${sessionId}] Initialization error:`, err.message || err);

      // If directory was locked, retry once with fresh timestamped session clientId
      if (err.message && err.message.includes('browser is already running') && !forceRestart) {
        console.log(`[WhatsApp ${sessionId}] Retrying with fresh session folder...`);
        return initializeWhatsAppSession(sessionId, accountName, true);
      }

      session.state.status = 'error';
      session.state.errorMessage = err.message || 'Failed to initialize WhatsApp Web';
      session.isInitializing = false;
    }
  })();

  return session.state;
}

// Backward compatibility alias
export async function initializeWhatsApp(forceRestart: boolean = false): Promise<WhatsAppAccountState> {
  return initializeWhatsAppSession('account_1', 'Primary WhatsApp', forceRestart);
}

export async function disconnectWhatsAppSession(sessionId: string): Promise<WhatsAppAccountState> {
  const session = sessions.get(sessionId);
  if (session && session.client) {
    try {
      const pupBrowser = (session.client as any).pupBrowser;
      if (pupBrowser) {
        await pupBrowser.close().catch(() => {});
      }
      await session.client.logout().catch(() => {});
      await session.client.destroy().catch(() => {});
    } catch (err) {
      console.log(`[WhatsApp ${sessionId}] Logout notice:`, err);
    }
    session.client = null;
  }

  const authPath = getAuthDirectory();
  if (session) {
    const sessionDirPath = path.join(authPath, `session-${session.wwebClientId}`);
    cleanSessionLockFiles(sessionDirPath);
    session.state.status = 'disconnected';
    session.state.qrCodeDataUrl = null;
    session.state.userPhone = null;
    session.state.userName = null;
    session.state.errorMessage = null;
    session.isInitializing = false;
  }

  await run("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE session_id = ?", [sessionId]).catch(() => {});
  return getWhatsAppStatus(sessionId);
}

// Backward compatibility alias
export async function disconnectWhatsApp(): Promise<WhatsAppAccountState> {
  return disconnectWhatsAppSession('account_1');
}

export function getConnectedSessions(): SessionRecord[] {
  return Array.from(sessions.values()).filter((s) => s.client && s.state.status === 'connected');
}

export async function sendDirectWhatsApp(
  phone: string,
  message: string,
  preferredSessionId?: string
): Promise<{ success: boolean; message: string; usedAccountName?: string }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked by Emergency Kill Switch.',
    };
  }

  const connected = getConnectedSessions();
  if (connected.length === 0) {
    return {
      success: false,
      message: 'No WhatsApp accounts are currently connected. Please pair at least one account in Settings.',
    };
  }

  // Pick target session
  let targetSession: SessionRecord = connected[0];
  if (preferredSessionId) {
    const found = connected.find((s) => s.id === preferredSessionId);
    if (found) targetSession = found;
  } else if (connected.length > 1) {
    // Round-robin selection
    targetSession = connected[roundRobinIndex % connected.length];
    roundRobinIndex = (roundRobinIndex + 1) % connected.length;
  }

  try {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, message: `Invalid phone number: ${phone}` };
    }

    if (cleanPhone.length === 10) {
      if (['6', '7', '8', '9'].includes(cleanPhone[0])) {
        cleanPhone = `91${cleanPhone}`;
      } else {
        cleanPhone = `1${cleanPhone}`;
      }
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    const formattedId = `${cleanPhone}@c.us`;
    console.log(`[WhatsApp Multi-Pool] Dispatching to ${formattedId} via [${targetSession.name}]...`);

    await targetSession.client!.sendMessage(formattedId, message);

    return {
      success: true,
      message: `Message sent automatically to ${phone} via ${targetSession.name}!`,
      usedAccountName: targetSession.name,
    };
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send via ${targetSession.name}:`, error);
    return {
      success: false,
      message: error.message || 'Failed to send WhatsApp message.',
    };
  }
}

export async function startAntiBanBatchWhatsApp(
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 30,
  maxDelaySeconds: number = 45,
  allowedSessionIds?: string[]
): Promise<{ success: boolean; message: string; connectedAccountsCount?: number }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked: Emergency Kill Switch is currently active.',
    };
  }

  let connected = getConnectedSessions();
  if (allowedSessionIds && allowedSessionIds.length > 0) {
    connected = connected.filter((s) => allowedSessionIds.includes(s.id));
  }

  if (connected.length === 0) {
    return {
      success: false,
      message: 'No active connected WhatsApp accounts available for this batch. Pair accounts in Settings.',
    };
  }

  if (batchProgress.isRunning) {
    return {
      success: false,
      message: 'A batch campaign is already running.',
    };
  }

  // Strict Duplicate Exclusion Check
  const contactedCheck = await all<{ id: number; phone?: string }>(
    "SELECT id, phone FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedIdSet = new Set(contactedCheck.map((c) => c.id));
  const contactedPhoneSet = new Set(
    contactedCheck
      .filter((c) => c.phone)
      .map((c) => c.phone!.replace(/[^0-9]/g, ''))
      .filter((p) => p.length >= 7)
  );

  const eligibleLeads = leads.filter((l) => {
    const clean = (l.phone || '').replace(/[^0-9]/g, '');
    return !contactedIdSet.has(l.id) && !contactedPhoneSet.has(clean);
  });

  if (eligibleLeads.length === 0) {
    return {
      success: false,
      message: 'All selected leads have already been contacted in past campaigns. Duplicate messaging blocked.',
    };
  }

  cancelBatchRequested = false;
  const accountsCount = connected.length;

  batchProgress = {
    isRunning: true,
    currentIndex: 0,
    totalCount: eligibleLeads.length,
    sentCount: 0,
    failedCount: 0,
    currentLeadName: null,
    currentPhone: null,
    secondsRemaining: 0,
    activeAccountsCount: accountsCount,
    statusMessage: `Starting Multi-WhatsApp Campaign for ${eligibleLeads.length} leads across ${accountsCount} linked WhatsApp accounts! 🚀`,
    logs: [],
  };

  // Run in background asynchronously
  (async () => {
    console.log(
      `[WhatsApp Multi-Batch] Starting campaign for ${eligibleLeads.length} leads across ${accountsCount} account(s)...`
    );

    for (let i = 0; i < eligibleLeads.length; i++) {
      if (cancelBatchRequested || isEmergencyKillSwitchActive) {
        batchProgress.statusMessage = isEmergencyKillSwitchActive
          ? '🚨 Campaign halted by Emergency Kill Switch.'
          : 'Campaign stopped by user.';
        break;
      }

      const lead = eligibleLeads[i];
      const activeSession = connected[i % accountsCount];
      const activeAccountName = activeSession.name;

      batchProgress.currentIndex = i + 1;
      batchProgress.currentLeadName = lead.name;
      batchProgress.currentPhone = lead.phone;
      batchProgress.statusMessage = `[${activeAccountName}] Sending pitch to "${lead.name}" (${lead.phone})...`;

      let sendSuccess = false;
      let logMsg = '';

      try {
        let cleanPhone = lead.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
          if (['6', '7', '8', '9'].includes(cleanPhone[0])) {
            cleanPhone = `91${cleanPhone}`;
          } else {
            cleanPhone = `1${cleanPhone}`;
          }
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
          cleanPhone = `91${cleanPhone.slice(1)}`;
        }

        const formattedId = `${cleanPhone}@c.us`;
        await activeSession.client!.sendMessage(formattedId, lead.message);

        sendSuccess = true;
        batchProgress.sentCount += 1;
        logMsg = `Dispatched via ${activeAccountName} (${activeSession.state.userPhone || 'OK'})`;

        // Update database
        await run(
          "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [lead.id]
        );
        await run(
          "INSERT INTO activity_logs (lead_id, action, details) VALUES (?, 'whatsapp_sent', ?)",
          [lead.id, `Multi-Pool Batch sent via ${activeAccountName}`]
        );
      } catch (err: any) {
        batchProgress.failedCount += 1;
        logMsg = `Error via ${activeAccountName}: ${err.message || 'Send failed'}`;
        console.error(`[WhatsApp Multi-Batch] Error sending to ${lead.name}:`, err);
      }

      batchProgress.logs.unshift({
        time: new Date().toLocaleTimeString(),
        leadName: lead.name,
        phone: lead.phone,
        success: sendSuccess,
        message: logMsg,
        accountName: activeAccountName,
      });

      // Divide effective delay by accountsCount while keeping individual number safe!
      if (i < eligibleLeads.length - 1 && !cancelBatchRequested && !isEmergencyKillSwitchActive) {
        const rawDelay = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
        const adjustedDelay = Math.max(8, Math.round(rawDelay / Math.max(1, accountsCount)));

        for (let s = adjustedDelay; s > 0; s--) {
          if (cancelBatchRequested || isEmergencyKillSwitchActive) break;
          batchProgress.secondsRemaining = s;
          batchProgress.statusMessage = `[Next: ${connected[(i + 1) % accountsCount].name}] Safe delay: ${s}s before lead #${i + 2}...`;
          await new Promise((r) => setTimeout(r, 1000));
        }
        batchProgress.secondsRemaining = 0;
      }
    }

    batchProgress.isRunning = false;
    if (!cancelBatchRequested && !isEmergencyKillSwitchActive) {
      batchProgress.statusMessage = `🎉 Batch Completed! Sent: ${batchProgress.sentCount}, Failed: ${batchProgress.failedCount} across ${accountsCount} accounts.`;
    }
  })();

  return {
    success: true,
    connectedAccountsCount: accountsCount,
    message: `Multi-WhatsApp Campaign launched across ${accountsCount} active WhatsApp accounts! 🚀`,
  };
}
