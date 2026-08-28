import { Router, Request, Response } from 'express';
import {
  getWhatsAppStatus,
  initializeWhatsApp,
  disconnectWhatsApp,
  sendDirectWhatsApp,
  startAntiBanBatchWhatsApp,
  getBatchWhatsAppStatus,
  stopBatchWhatsApp,
} from '../services/whatsappService';
import { get, run } from '../db/database';

const router = Router();

// 1. Get current WhatsApp status & QR code if available
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = getWhatsAppStatus();
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Initialize / Request QR Code
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { forceRestart = false } = req.body;
    const status = await initializeWhatsApp(forceRestart);
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Disconnect / Logout
router.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    const status = await disconnectWhatsApp();
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Send Single Direct Message from linked WhatsApp (With Double-Send Protection)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phone, message, leadId } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone number and message are required.' });
    }

    // Strict Double-Send Protection
    if (leadId) {
      const existing = await get(
        "SELECT id, name, status, last_contacted_at FROM leads WHERE id = ? AND (status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL)",
        [leadId]
      );
      if (existing) {
        await run("UPDATE leads SET in_campaign_queue = 0 WHERE id = ?", [leadId]);
        return res.status(400).json({
          success: false,
          alreadyContacted: true,
          message: `🚫 Duplicate blocked: "${existing.name}" was already contacted (${existing.status}) on ${existing.last_contacted_at || 'earlier campaign'}.`,
        });
      }
    }

    const result = await sendDirectWhatsApp(phone, message);

    if (result.success && leadId) {
      // Mark lead as contacted in database
      await run(
        "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [leadId]
      );
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Start Anti-Ban Batch Campaign (30-45s Delay)
router.post('/batch-start', async (req: Request, res: Response) => {
  try {
    const { leads, minDelaySeconds = 30, maxDelaySeconds = 45 } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided.' });
    }

    const result = await startAntiBanBatchWhatsApp(leads, minDelaySeconds, maxDelaySeconds);
    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp batch start error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Get Anti-Ban Batch Campaign Live Status / Countdown
router.get('/batch-status', async (_req: Request, res: Response) => {
  try {
    const status = getBatchWhatsAppStatus();
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp batch status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 7. Stop / Cancel Anti-Ban Batch Campaign
router.post('/batch-stop', async (_req: Request, res: Response) => {
  try {
    const result = stopBatchWhatsApp();
    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp batch stop error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
