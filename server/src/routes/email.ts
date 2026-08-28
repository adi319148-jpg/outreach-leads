import { Router, Request, Response } from 'express';
import { sendDirectEmail, testSmtpConnection } from '../services/emailService';
import { run } from '../db/database';

const router = Router();

// 1. Send single email in background (Zero tabs)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, message, leadId } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, message: 'Recipient email and message body are required.' });
    }

    const emailSubject = subject || 'Quick question regarding your business';
    const result = await sendDirectEmail(to, emailSubject, message);

    if (result.success && leadId) {
      await run(
        "UPDATE leads SET status = 'contacted', last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [leadId]
      );
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Email send route error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// 2. Batch send emails in background
router.post('/batch-send', async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided for batch email.' });
    }

    // Run batch sending asynchronously in background
    (async () => {
      console.log(`[EmailBatch] Starting background batch email for ${leads.length} leads...`);
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        if (!lead.email || !lead.message) continue;

        const subject = lead.subject || `Quick question regarding ${lead.name}`;
        const sendResult = await sendDirectEmail(lead.email, subject, lead.message);

        if (sendResult.success && lead.id) {
          await run(
            "UPDATE leads SET status = 'contacted', last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [lead.id]
          );
        }

        // 3 second human delay between emails to avoid spam filters
        if (i < leads.length - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      console.log(`[EmailBatch] Finished batch email for ${leads.length} leads.`);
    })();

    return res.json({
      success: true,
      message: `Dispatched batch email for ${leads.length} leads in the background!`,
    });
  } catch (error: any) {
    console.error('Batch email error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Batch email failed' });
  }
});

// 3. Test SMTP settings
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body || {};
    const result = await testSmtpConnection(
      smtpUser && smtpPass
        ? {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
