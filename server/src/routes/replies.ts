import { Router, Request, Response } from 'express';
import { run, all, get } from '../db/database';
import { sendDirectWhatsApp } from '../services/whatsappService';
import { generateSmartReply, analyzeMessageSentiment } from '../services/aiService';
import { extractUserKey } from './settings';

const router = Router();

// 1. Get all inbound replies with joined lead details
router.get('/', async (_req: Request, res: Response) => {
  try {
    const replies = await all(`
      SELECT 
        r.id,
        r.lead_id,
        r.channel,
        r.sender_id,
        r.sender_name,
        r.message_text,
        r.received_at,
        r.is_read,
        l.name as lead_name,
        l.category as lead_category,
        l.status as lead_status,
        l.pitch as original_pitch,
        l.phone as lead_phone,
        l.contact_email as lead_email,
        l.source as lead_source
      FROM inbound_replies r
      LEFT JOIN leads l ON r.lead_id = l.id
      ORDER BY r.id DESC
    `);

    const unreadCountRow = await get<{ count: number }>(
      'SELECT COUNT(*) as count FROM inbound_replies WHERE is_read = 0'
    );

    // Attach sentiment analysis to each reply
    const repliesWithSentiment = replies.map((r) => ({
      ...r,
      sentiment: analyzeMessageSentiment(r.message_text),
    }));

    return res.json({
      replies: repliesWithSentiment,
      unreadCount: unreadCountRow?.count || 0,
    });
  } catch (error: any) {
    console.error('Get replies error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Mark replies as read
router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const { replyIds } = req.body;
    if (Array.isArray(replyIds) && replyIds.length > 0) {
      const placeholders = replyIds.map(() => '?').join(',');
      await run(`UPDATE inbound_replies SET is_read = 1 WHERE id IN (${placeholders})`, replyIds);
    } else {
      // Mark all as read
      await run('UPDATE inbound_replies SET is_read = 1');
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. AI Sentiment-Matched Smart Reply Generator
router.post('/generate-ai-response', async (req: Request, res: Response) => {
  try {
    const userKey = extractUserKey(req);
    const { incomingMessage, originalPitch, leadName } = req.body;
    if (!incomingMessage) {
      return res.status(400).json({ error: 'incomingMessage is required.' });
    }

    const result = await generateSmartReply(incomingMessage, originalPitch, leadName, 'Kropix Studio', userKey);
    return res.json(result);
  } catch (error: any) {
    console.error('Generate smart reply error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Simulate an Inbound Reply (Great for Testing or Mock Email/WhatsApp Responses!)
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { leadId, channel = 'whatsapp', messageText, senderName } = req.body;

    let lead: any = null;
    if (leadId) {
      lead = await get('SELECT * FROM leads WHERE id = ?', [leadId]);
    } else {
      lead = await get('SELECT * FROM leads ORDER BY id DESC LIMIT 1');
    }

    const defaultMessages = [
      "Hey! Yes, I saw your message. We're actually looking for this. Can you send over more details or a sample?",
      "Hello, thanks for reaching out. What are your pricing packages?",
      "Hi! I'd love to take a look at the free mockup you mentioned. When can we talk?",
      "Hey there, sounds interesting. Are you available for a quick 10-min Zoom call tomorrow?",
      "Send details pls",
    ];

    const text = messageText || defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
    const sName = senderName || (lead ? lead.name : 'Apex Dental Studio');
    const senderId = lead ? (channel === 'email' ? lead.contact_email || 'prospect@gmail.com' : lead.phone || '+1 555-0192') : '+1 555-0192';

    const insertRes = await run(
      `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [lead ? lead.id : null, channel, senderId, sName, text]
    );

    if (lead) {
      await run("UPDATE leads SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [lead.id]);
    }

    return res.json({
      success: true,
      replyId: insertRes.id,
      message: `Simulated inbound reply created for ${sName}!`,
    });
  } catch (error: any) {
    console.error('Simulate reply error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 5. Quick Reply back to WhatsApp from Inbox
router.post('/send-response', async (req: Request, res: Response) => {
  try {
    const { leadId, phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required.' });
    }

    const result = await sendDirectWhatsApp(phone, message);
    if (result.success && leadId) {
      await run(
        "UPDATE leads SET status = 'contacted', last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [leadId]
      );
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Send response error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
