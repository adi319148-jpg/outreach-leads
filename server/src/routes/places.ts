import { Router, Request, Response } from 'express';
import { searchPlaces } from '../services/placesService';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { category, location, radius, websiteFilter = 'all' } = req.body;
    if (!category || !location) {
      return res.status(400).json({ error: 'Category and location are required.' });
    }

    const radiusMeters = radius ? parseInt(radius, 10) * 1000 : 5000;
    const result = await searchPlaces(category, location, radiusMeters, websiteFilter);

    return res.json(result);
  } catch (error: any) {
    console.error('Places search route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
