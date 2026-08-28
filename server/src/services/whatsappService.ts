import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { run, get, all } from '../db/database';

export type WhatsAppStatus = 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'error';

interface WhatsAppState {
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  lastActive: string | null;
  killSwitchActive: boolean;
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
  logs: Array<{ time: string; leadName: string; phone: string; success: boolean; message: string }>;
}

let isEmergencyKillSwitchActive = false;

const state: WhatsAppState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  userPhone: null,
  userName: null,
  errorMessage: null,
  lastActive: null,
  killSwitchActive: false,
};

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
  logs: [],
};

let cancelBatchRequested = false;
let client: Client | null = null;
let isInitializing = false;

function getBrowserExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    console.log(`[WhatsApp] Using custom PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const possiblePaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `C:\\Users\\${process.env.USERNAME || 'DELL'}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[WhatsApp] Auto-detected installed browser: ${p}`);
      return p;
    }
  }
  return undefined;
}

export function getWhatsAppStatus(): WhatsAppState {
  return { ...state, killSwitchActive: isEmergencyKillSwitchActive };
}

export function getBatchWhatsAppStatus(): BatchWhatsAppProgress {
  return { ...batchProgress };
}

export function setEmergencyKillSwitch(active: boolean): { success: boolean; killSwitchActive: boolean; message: string } {
  isEmergencyKillSwitchActive = active;
  state.killSwitchActive = active;

  if (active) {
    console.log('[EMERGENCY KILL SWITCH] ACTIVATED! Halting all auto-sending immediately.');
    stopBatchWhatsApp();
    return {
      success: true,
      killSwitchActive: true,
      message: '🚨 EMERGENCY KILL SWITCH ACTIVATED! All auto-sending and batch queues have been frozen.',
    };
  } else {
    console.log('[EMERGENCY KILL SWITCH] DEACTIVATED. Normal sending operations resumed.');
    return {
      success: true,
      killSwitchActive: false,
      message: '✅ Emergency Kill Switch deactivated. Normal sending operations resumed.',
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

export async function initializeWhatsApp(forceRestart: boolean = false): Promise<WhatsAppState> {
  if (client && !forceRestart && (state.status === 'connected' || state.status === 'qr_ready')) {
    return getWhatsAppStatus();
  }

  if (isInitializing && !forceRestart) {
    return getWhatsAppStatus();
  }

  isInitializing = true;
  state.status = 'connecting';
  state.errorMessage = null;

  // Run initialization asynchronously without blocking response
  (async () => {
    try {
      if (client) {
        try {
          await client.destroy();
        } catch (err) {
          console.log('[WhatsApp] Destroy previous client notice:', err);
        }
        client = null;
      }

      const authPath = process.env.WWEBJS_AUTH_PATH
        ? path.resolve(process.env.WWEBJS_AUTH_PATH)
        : path.resolve(__dirname, '../../.wwebjs_auth');
      const executablePath = getBrowserExecutablePath();

      console.log('[WhatsApp] Initializing WhatsApp Web Client with executable:', executablePath || 'Default Puppeteer');

      client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'kropix-studio-session',
          dataPath: authPath,
        }),
        puppeteer: {
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      client.on('qr', async (qr) => {
        console.log('[WhatsApp] QR Code received. Generating base64 image...');
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          state.status = 'qr_ready';
          state.qrCodeDataUrl = qrDataUrl;
          state.errorMessage = null;
          isInitializing = false;
          console.log('[WhatsApp] QR Code image ready for UI rendering.');
        } catch (err: any) {
          console.error('[WhatsApp] Failed to generate QR image:', err);
          state.errorMessage = 'Failed to generate QR code image';
          isInitializing = false;
        }
      });

      client.on('authenticated', () => {
        console.log('[WhatsApp] Session Authenticated successfully!');
        state.status = 'connecting';
        state.qrCodeDataUrl = null;
        state.errorMessage = null;
      });

      client.on('auth_failure', (msg) => {
        console.error('[WhatsApp] Authentication failure:', msg);
        state.status = 'disconnected';
        state.qrCodeDataUrl = null;
        state.errorMessage = `Authentication failed: ${msg}`;
        isInitializing = false;
      });

      client.on('ready', () => {
        console.log('[WhatsApp] Client is READY and CONNECTED!');
        state.status = 'connected';
        state.qrCodeDataUrl = null;
        state.userPhone = client?.info?.wid?.user || 'Connected User';
        state.userName = client?.info?.pushname || 'WhatsApp User';
        state.lastActive = new Date().toISOString();
        state.errorMessage = null;
        isInitializing = false;
      });

      client.on('disconnected', (reason) => {
        console.log('[WhatsApp] Client disconnected:', reason);
        state.status = 'disconnected';
        state.qrCodeDataUrl = null;
        state.userPhone = null;
        state.userName = null;
        state.errorMessage = `Disconnected: ${reason}`;
        isInitializing = false;
      });

      // INBOUND MESSAGE LISTENER (Live Reply Tracker)
      client.on('message', async (msg) => {
        try {
          if ((msg as any).isGroupMsg || (msg.from && msg.from.includes('status@broadcast'))) {
            return;
          }

          const fromPhone = (msg.from || '').replace('@c.us', '').replace(/[^0-9]/g, '');
          const body = msg.body || '';

          console.log(`[WhatsApp Inbound Reply] Received from ${fromPhone}: "${body.slice(0, 60)}"`);

          // Match lead in database
          const phoneTail = fromPhone.slice(-8);
          const matchingLead = await get(
            'SELECT * FROM leads WHERE phone LIKE ? OR phone LIKE ? OR phone LIKE ?',
            [`%${fromPhone}%`, `%${phoneTail}%`, `%${fromPhone.slice(-10)}%`]
          );

          const leadId = (matchingLead as any)?.id || null;
          const leadName = (matchingLead as any)?.name || 'Prospect';
          const originalPitch = (matchingLead as any)?.pitch || null;

          // Save inbound reply in database
          await run(
            `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, original_pitch)
             VALUES (?, 'whatsapp', ?, ?, ?, ?)`,
            [leadId, fromPhone, leadName, body, originalPitch]
          );

          // Update lead status to 'replied'
          if (leadId) {
            await run(
              "UPDATE leads SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [leadId]
            );
          }

          console.log(`[WhatsApp Inbound] Saved reply from ${leadName} (${fromPhone}) to database.`);
        } catch (err) {
          console.error('[WhatsApp Inbound] Error saving incoming message:', err);
        }
      });

      await client.initialize();
    } catch (err: any) {
      console.error('[WhatsApp] Initialization error:', err);
      state.status = 'error';
      state.errorMessage = err.message || 'Failed to initialize WhatsApp Web client';
      isInitializing = false;
    }
  })();

  return getWhatsAppStatus();
}

export async function disconnectWhatsApp(): Promise<WhatsAppState> {
  if (client) {
    try {
      await client.logout();
      await client.destroy();
    } catch (err) {
      console.log('[WhatsApp] Logout notice:', err);
    }
    client = null;
  }

  state.status = 'disconnected';
  state.qrCodeDataUrl = null;
  state.userPhone = null;
  state.userName = null;
  state.errorMessage = null;
  isInitializing = false;

  return getWhatsAppStatus();
}

export async function sendDirectWhatsApp(
  phone: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked by Emergency Kill Switch. Disable the kill switch to send messages.',
    };
  }

  if (!client || state.status !== 'connected') {
    return {
      success: false,
      message: 'WhatsApp client is not connected. Please scan the QR code in Settings first.',
    };
  }

  try {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, message: `Invalid phone number: ${phone}` };
    }

    // Auto-normalize 10-digit numbers to international format
    if (cleanPhone.length === 10) {
      if (['6', '7', '8', '9'].includes(cleanPhone[0])) {
        cleanPhone = `91${cleanPhone}`; // India mobile
      } else {
        cleanPhone = `1${cleanPhone}`; // US / Canada
      }
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    // Format target WhatsApp ID
    const formattedId = `${cleanPhone}@c.us`;

    console.log(`[WhatsApp] Sending automated background message to ${formattedId}...`);
    await client.sendMessage(formattedId, message);

    return {
      success: true,
      message: `Message sent automatically to ${phone}!`,
    };
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send to ${phone}:`, error);
    return {
      success: false,
      message: error.message || 'Failed to send WhatsApp message.',
    };
  }
}

export async function startAntiBanBatchWhatsApp(
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 30,
  maxDelaySeconds: number = 45
): Promise<{ success: boolean; message: string }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked: Emergency Kill Switch is currently active.',
    };
  }

  if (!client || state.status !== 'connected') {
    return {
      success: false,
      message: 'WhatsApp is not connected. Please pair your account via QR code first.',
    };
  }

  if (batchProgress.isRunning) {
    return {
      success: false,
      message: 'A batch campaign is already running.',
    };
  }

  // Strict Duplicate Exclusion Check: Never message contacted leads again
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
      message: 'All selected leads have already been contacted in past campaigns. Duplicate messaging is strictly prevented.',
    };
  }

  cancelBatchRequested = false;
  batchProgress = {
    isRunning: true,
    currentIndex: 0,
    totalCount: eligibleLeads.length,
    sentCount: 0,
    failedCount: 0,
    currentLeadName: null,
    currentPhone: null,
    secondsRemaining: 0,
    statusMessage: `Starting Anti-Ban Campaign for ${eligibleLeads.length} uncontacted leads...`,
    logs: [],
  };

  // Run in background asynchronously
  (async () => {
    console.log(`[WhatsApp Batch] Starting campaign for ${eligibleLeads.length} leads (delay: ${minDelaySeconds}-${maxDelaySeconds}s)`);

    for (let i = 0; i < eligibleLeads.length; i++) {
      if (cancelBatchRequested || isEmergencyKillSwitchActive) {
        console.log('[WhatsApp Batch] Campaign stopped by user or kill switch.');
        batchProgress.statusMessage = isEmergencyKillSwitchActive
          ? '🚨 Campaign halted by Emergency Kill Switch.'
          : 'Campaign stopped by user.';
        break;
      }

      const lead = eligibleLeads[i];
      batchProgress.currentIndex = i + 1;
      batchProgress.currentLeadName = lead.name;
      batchProgress.currentPhone = lead.phone;
      batchProgress.statusMessage = `Dispatching to [${i + 1}/${leads.length}] ${lead.name}...`;

      // Send the message
      const sendResult = await sendDirectWhatsApp(lead.phone, lead.message);

      const logEntry = {
        time: new Date().toLocaleTimeString(),
        leadName: lead.name,
        phone: lead.phone,
        success: sendResult.success,
        message: sendResult.message,
      };
      batchProgress.logs.unshift(logEntry);

      if (sendResult.success) {
        batchProgress.sentCount++;
        // Update database
        try {
          await run(
            "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [lead.id]
          );
        } catch (dbErr) {
          console.error('[WhatsApp Batch] DB update error:', dbErr);
        }
      } else {
        batchProgress.failedCount++;
      }

      // If not the last lead and not cancelled, wait human delay (30-45s)
      if (i < leads.length - 1 && !cancelBatchRequested && !isEmergencyKillSwitchActive) {
        const randomDelay = Math.floor(
          Math.random() * (maxDelaySeconds - minDelaySeconds + 1) + minDelaySeconds
        );
        console.log(`[WhatsApp Batch Anti-Ban Delay] Waiting ${randomDelay}s before next send to protect account...`);

        for (let sec = randomDelay; sec > 0; sec--) {
          if (cancelBatchRequested || isEmergencyKillSwitchActive) break;
          batchProgress.secondsRemaining = sec;
          batchProgress.statusMessage = `Anti-Ban Protection: Next message in ${sec}s...`;
          await new Promise((r) => setTimeout(r, 1000));
        }
        batchProgress.secondsRemaining = 0;
      }
    }

    batchProgress.isRunning = false;
    batchProgress.statusMessage = cancelBatchRequested
      ? 'Campaign stopped.'
      : `🎉 Campaign completed! ${batchProgress.sentCount} sent, ${batchProgress.failedCount} failed.`;
    console.log(`[WhatsApp Batch] Finished. Sent: ${batchProgress.sentCount}, Failed: ${batchProgress.failedCount}`);
  })();

  return {
    success: true,
    message: `Anti-Ban WhatsApp campaign started for ${leads.length} leads!`,
  };
}
