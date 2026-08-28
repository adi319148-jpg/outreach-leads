import axios from 'axios';
import { placesRateLimiter } from '../utils/rateLimiter';
import { getSetting } from './settingsService';

export interface PlaceLeadResult {
  external_id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  has_website: boolean;
  instagram_handle?: string;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  google_maps_url?: string;
  selected?: boolean;
}

export async function searchPlaces(
  category: string,
  location: string,
  radius: number = 5000,
  websiteFilter: 'all' | 'no_website' | 'has_website' = 'all'
): Promise<{ leads: PlaceLeadResult[]; isMock: boolean; message?: string }> {
  const apiKey = await getSetting('googlePlacesApiKey');

  if (!apiKey) {
    throw new Error('Google Places API key is missing. Please configure your API key in Settings.');
  }

  await placesRateLimiter.acquire();

  try {
    const textQuery = `${category} in ${location}`;
    console.log(`[PlacesService] Querying Live Google Places API (New) for: "${textQuery}"`);

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery,
        maxResultCount: 20,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.types,places.editorialSummary,places.googleMapsUri',
        },
        timeout: 10000,
      }
    );

    const places = response.data.places || [];
    const leads: PlaceLeadResult[] = places.map((p: any) => {
      const website = p.websiteUri || '';
      const has_website = Boolean(website && website.trim());
      const businessName = p.displayName?.text || 'Unknown Business';
      const address = p.formattedAddress || location;
      const nameSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const citySlug = location.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const mapsUrl = p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + address)}`;

      return {
        external_id: p.id || '',
        name: businessName,
        category: p.primaryType || (p.types && p.types[0]) || category,
        address,
        phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
        website: website || undefined,
        has_website,
        instagram_handle: `@${nameSlug}_${citySlug}`,
        rating: p.rating || 0,
        user_ratings_total: p.userRatingCount || 0,
        description: p.editorialSummary?.text || '',
        google_maps_url: mapsUrl,
      };
    });

    const filtered = filterPlacesByWebsite(leads, websiteFilter);
    return { leads: filtered, isMock: false };
  } catch (error: any) {
    console.error('[PlacesService] Google Places API error:', error.response?.data || error.message);
    const errMsg = error.response?.data?.error?.message || error.message || 'Google Places API request failed';
    throw new Error(errMsg);
  }
}

export const searchGooglePlaces = searchPlaces;

function filterPlacesByWebsite(leads: PlaceLeadResult[], filter: 'all' | 'no_website' | 'has_website'): PlaceLeadResult[] {
  if (filter === 'no_website') {
    return leads.filter((l) => !l.has_website);
  }
  if (filter === 'has_website') {
    return leads.filter((l) => l.has_website);
  }
  return leads;
}
