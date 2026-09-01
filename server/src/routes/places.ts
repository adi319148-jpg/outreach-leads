import { Router, Request, Response } from 'express';
import { searchPlaces } from '../services/placesService';
import { extractUserKey } from './settings';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  try {
    const userKey = extractUserKey(req);
    const { category, location, radius, websiteFilter = 'all', latitude, longitude } = req.body;
    if (!category || !location) {
      return res.status(400).json({ error: 'Category and location are required.' });
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

    return res.json(result);
  } catch (error: any) {
    console.error('Places search route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
