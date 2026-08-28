import { Router, Request, Response } from 'express';
import { generatePitch, PitchTone, OfferedService } from '../services/aiService';
import { run, get, all } from '../db/database';

const router = Router();

router.post('/generate-pitch', async (req: Request, res: Response) => {
  try {
    const { lead, tone = 'friendly', offeredService = 'general', customInstructions, leadId } = req.body;
    if (!lead && !leadId) {
      return res.status(400).json({ error: 'Lead data or leadId is required.' });
    }

    let leadData = lead;
    if (leadId && !leadData) {
      leadData = await get('SELECT * FROM leads WHERE id = ?', [leadId]);
      if (!leadData) {
        return res.status(404).json({ error: 'Lead not found in database.' });
      }
    }

    const result = await generatePitch(
      leadData,
      tone as PitchTone,
      offeredService as OfferedService,
      customInstructions
    );

    // If lead exists in DB, update pitch and offered_service automatically
    if (leadId) {
      await run(
        'UPDATE leads SET pitch = ?, pitch_status = ?, offered_service = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [result.pitch, 'ready', offeredService, leadId]
      );
    }

    return res.json({
      pitch: result.pitch,
      provider: result.provider,
      isMock: result.isMock,
    });
  } catch (error: any) {
    console.error('AI generate route error:', error);
    return res.status(500).json({ error: error.message || 'Pitch generation failed' });
  }
});

router.post('/batch-generate', async (req: Request, res: Response) => {
  try {
    const { leadIds, tone = 'friendly', offeredService = 'general', customInstructions } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required.' });
    }

    // 1. Fetch all requested leads in 1 single database query
    const placeholders = leadIds.map(() => '?').join(',');
    const leads = await all<any>(`SELECT * FROM leads WHERE id IN (${placeholders})`, leadIds);

    if (!leads || leads.length === 0) {
      return res.json({ success: true, count: 0, results: [] });
    }

    // 2. Process concurrently in parallel (Lightning Fast!)
    const results = await Promise.all(
      leads.map(async (lead) => {
        try {
          const genResult = await generatePitch(
            lead,
            tone as PitchTone,
            offeredService as OfferedService,
            customInstructions
          );

          await run(
            'UPDATE leads SET pitch = ?, pitch_status = ?, offered_service = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [genResult.pitch, 'ready', offeredService, lead.id]
          );

          return { id: lead.id, pitch: genResult.pitch, success: true };
        } catch (err: any) {
          console.error(`Error drafting pitch for lead #${lead.id}:`, err.message);
          return { id: lead.id, pitch: '', success: false, error: err.message };
        }
      })
    );

    return res.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error('Batch generate error:', error);
    return res.status(500).json({ error: error.message || 'Batch generation failed' });
  }
});

export default router;
