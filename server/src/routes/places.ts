import { Router, Request, Response } from 'express';
import { searchPlaces } from '../services/placesService';
import { extractUserKey } from './settings';
import { checkAndIncrementLeadDiscovery } from '../utils/planLimiter';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  try {
    const userKey = extractUserKey(req);
    const { category, location, radius, websiteFilter = 'all', latitude, longitude } = req.body;
    if (!category || !location) {
      return res.status(400).json({ error: 'Category and location are required.' });
    }

    // Strict Daily Quota Check (Starter = 200 leads/day, Pro = Unlimited)
    const quotaCheck = await checkAndIncrementLeadDiscovery(userKey, 0);
    if (!quotaCheck.allowed) {
      return res.status(429).json({
        error: quotaCheck.message,
        leads: [],
        quotaReached: true,
        dailyLimit: quotaCheck.limit,
      });
    }

    const radiusMeters = radius ? parseInt(radius, 10) * 1000 : 10000;
    const result = await searchPlaces(
      category,
      location,
      radiusMeters,
      websiteFilter,
      latitude ? parseFloat(latitude) : undefined,
      longitude ? parseFloat(longitude) : undefined,
      userKey
    );

    // If on Starter Plan, cap results to remaining daily quota
    if (quotaCheck.plan === 'starter' && result.leads && result.leads.length > 0) {
      const allowedCount = Math.min(result.leads.length, quotaCheck.remaining);
      const cappedLeads = result.leads.slice(0, allowedCount);

      const updatedQuota = await checkAndIncrementLeadDiscovery(userKey, cappedLeads.length);

      const warningMsg =
        updatedQuota.remaining === 0
          ? `Starter Plan Quota Exhausted: 200/200 Google Maps leads extracted today. Upgrade to Agency Pro for Unlimited extraction!`
          : `Starter Plan Notice: Extracted ${cappedLeads.length} leads (${updatedQuota.current}/200 today). ${updatedQuota.remaining} leads remaining today.`;

      return res.json({
        ...result,
        leads: cappedLeads,
        dailyUsage: updatedQuota,
        warning: warningMsg,
      });
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Places search route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
