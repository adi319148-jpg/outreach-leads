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
    console.log('[PlacesService] No API key configured. Generating comprehensive simulation leads...');
    const mockLeads = generateMaxMockPlaces(category, location);
    const filtered = filterPlacesByWebsite(mockLeads, websiteFilter);
    return {
      leads: filtered,
      isMock: true,
      message: `Simulated Search Mode: Extracted ${filtered.length} local leads for "${category}" in ${location}. Add Google Places Key in Settings for live data.`,
    };
  }

  await placesRateLimiter.acquire();

  try {
    // Multi-query expansion to maximize extraction (up to 60-100+ leads)
    const subQueries = [
      `${category} in ${location}`,
      `best ${category} in ${location}`,
      `top ${category} in ${location}`,
      `${category} near ${location}`,
    ];

    console.log(`[PlacesService] Running multi-query Places expansion for max extraction in ${location}...`);

    const allPlacesMap = new Map<string, any>();

    for (const query of subQueries) {
      try {
        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: query,
            maxResultCount: 20,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.types,places.editorialSummary,places.googleMapsUri',
            },
            timeout: 12000,
          }
        );

        const places = response.data.places || [];
        for (const p of places) {
          const id = p.id || (p.displayName?.text + p.formattedAddress);
          if (id && !allPlacesMap.has(id)) {
            allPlacesMap.set(id, p);
          }
        }
      } catch (err: any) {
        console.warn(`[PlacesService] Sub-query "${query}" partial warning:`, err.message);
      }
    }

    const uniquePlaces = Array.from(allPlacesMap.values());
    console.log(`[PlacesService] Extracted ${uniquePlaces.length} total unique places from Google API.`);

    const leads: PlaceLeadResult[] = uniquePlaces.map((p: any) => {
      const website = p.websiteUri || '';
      const has_website = Boolean(website && website.trim());
      const businessName = p.displayName?.text || 'Unknown Business';
      const address = p.formattedAddress || location;
      const nameSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const citySlug = location.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const mapsUrl =
        p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + address)}`;

      return {
        external_id: p.id || `pl_${Math.random().toString(36).slice(2, 9)}`,
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

function filterPlacesByWebsite(
  leads: PlaceLeadResult[],
  filter: 'all' | 'no_website' | 'has_website'
): PlaceLeadResult[] {
  if (filter === 'no_website') {
    return leads.filter((l) => !l.has_website);
  }
  if (filter === 'has_website') {
    return leads.filter((l) => l.has_website);
  }
  return leads;
}

function generateMaxMockPlaces(category: string, location: string): PlaceLeadResult[] {
  const city = location.split(',')[0].trim() || 'City';
  const cleanCat = category.replace(/s$/i, '').trim();

  const businessPrefixes = [
    'The Royal',
    'Apex',
    'Elite',
    'Prime',
    'Urban',
    'Zenith',
    'Nova',
    'Starlight',
    'Metro',
    'Signature',
    'Global',
    'Om',
    'Shree',
    'Balaji',
    'Classic',
    'Star',
    'Crown',
    'Imperial',
    'Heritage',
    'Grand',
    'Vibrant',
    'Golden',
    'Silver',
    'Pinnacle',
    'Matrix',
    'Sunrise',
    'Blue Sapphire',
    'Maharaja',
    'Regal',
    'First Choice',
    'Divine',
    'Superb',
    'Galaxy',
    'Crystal',
    'Evergreen',
    'Sparkle',
    'Prestige',
    'Radiance',
    'Paramount',
    'United',
  ];

  const results: PlaceLeadResult[] = [];

  for (let i = 0; i < 40; i++) {
    const prefix = businessPrefixes[i % businessPrefixes.length];
    const name = `${prefix} ${cleanCat}`;
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const citySlug = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasWebsite = i % 3 === 0; // ~66% have no website (high opportunity)
    const rating = parseFloat((4.0 + (i % 10) * 0.1).toFixed(1));
    const reviews = 15 + ((i * 17) % 350);

    const phoneDigitStart = ['98', '97', '99', '91', '88', '70', '80'][i % 7];
    const phoneRandom = Math.floor(10000000 + Math.random() * 90000000);
    const phone = `+91 ${phoneDigitStart}${phoneRandom.toString().slice(0, 8)}`;

    results.push({
      external_id: `mock_place_${i + 1}_${Date.now().toString(36)}`,
      name,
      category: cleanCat,
      address: `Shop ${i + 12}, Main Market Road, Sector ${((i * 3) % 25) + 1}, ${city}`,
      phone,
      website: hasWebsite ? `https://www.${nameSlug}.in` : undefined,
      has_website: hasWebsite,
      instagram_handle: `@${nameSlug}_${citySlug}`,
      rating,
      user_ratings_total: reviews,
      description: `Popular ${cleanCat.toLowerCase()} service provider serving ${city} with high customer satisfaction.`,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`,
    });
  }

  return results;
}
