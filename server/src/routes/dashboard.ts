import { Router, Request, Response } from 'express';
import { get, all } from '../db/database';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalRow = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads');
    const notContactedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'not_contacted'");
    const contactedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'contacted'");
    const repliedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'replied'");
    const convertedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'");
    const rejectedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'rejected'");

    const placesRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'google_places'");
    const youtubeRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'youtube'");

    const pitchesReadyRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE pitch IS NOT NULL AND pitch != ''");

    const totalLeads = totalRow?.count || 0;
    const contacted = contactedRow?.count || 0;
    const replied = repliedRow?.count || 0;
    const converted = convertedRow?.count || 0;
    const notContacted = notContactedRow?.count || 0;
    const rejected = rejectedRow?.count || 0;

    const totalReached = contacted + replied + converted + rejected;
    const conversionRate = totalReached > 0 ? ((converted / totalReached) * 100).toFixed(1) : '0.0';
    const responseRate = totalReached > 0 ? (((replied + converted) / totalReached) * 100).toFixed(1) : '0.0';

    const recentLeads = await all('SELECT * FROM leads ORDER BY id DESC LIMIT 5');

    return res.json({
      totalLeads,
      notContacted,
      contacted,
      replied,
      converted,
      rejected,
      totalReached,
      conversionRate,
      responseRate,
      placesCount: placesRow?.count || 0,
      youtubeCount: youtubeRow?.count || 0,
      pitchesReady: pitchesReadyRow?.count || 0,
      recentLeads,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
