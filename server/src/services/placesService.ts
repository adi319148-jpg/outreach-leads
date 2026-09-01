import axios from 'axios';
import { placesRateLimiter } from '../utils/rateLimiter';
import { getSetting } from './settingsService';
import { all } from '../db/database';
import { getCachedData, setCachedData } from './cacheService';

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
  already_contacted?: boolean;
}

export async function searchPlaces(
  category: string,
  location: string,
  radius: number = 10000,
  websiteFilter: 'all' | 'no_website' | 'has_website' = 'all',
  latitude?: number,
  longitude?: number,
  userKey?: string
): Promise<{ leads: PlaceLeadResult[]; isMock: boolean; message?: string }> {
  const apiKey = await getSetting('googlePlacesApiKey', userKey);

  // Query all already-contacted leads from DB to exclude/flag them permanently
  const contactedRecords = await all<{ external_id?: string; phone?: string; name?: string }>(
    "SELECT external_id, phone, name FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedExternalIds = new Set<string>(
    contactedRecords
      .map((r) => r.external_id || '')
      .filter((id): id is string => Boolean(id))
  );
  const contactedPhones = new Set<string>(
    contactedRecords
      .map((r) => (r.phone || '').replace(/[^0-9]/g, ''))
      .filter((p): p is string => p.length >= 7)
  );

  // Split multiple comma-separated niches (e.g. "Travel Agencies, Dental Clinics, Real Estate")
  const categories = category
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const activeCategories = categories.length > 0 ? categories : ['Business'];

  // Cache Key for Cost Optimization (48-hour persistent cache)
  const cacheKey = `places:${category.toLowerCase().trim()}:${location.toLowerCase().trim()}:${radius}:${websiteFilter}:${latitude ? latitude.toFixed(2) : 'none'}`;
  const cachedResult = await getCachedData<PlaceLeadResult[]>(cacheKey);

  if (cachedResult && cachedResult.length > 0) {
    console.log(`[PlacesService] ⚡ CACHE HIT: Returning ${cachedResult.length} places (0 API Credits used).`);
    // Re-evaluate already_contacted against current database status
    const freshAnnotated = cachedResult.map((lead) => {
      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
      const isContacted =
        (lead.external_id && contactedExternalIds.has(lead.external_id)) ||
        (cleanPhone.length >= 7 && contactedPhones.has(cleanPhone));
      return { ...lead, already_contacted: isContacted };
    });

    return {
      leads: freshAnnotated,
      isMock: false,
      message: `⚡ Instant Cache: Loaded ${freshAnnotated.length} leads with 0 Google API credit consumption.`,
    };
  }

  if (!apiKey) {
    console.log('[PlacesService] No API key configured. Generating multi-niche simulation leads...');
    let allMockLeads: PlaceLeadResult[] = [];
    for (const cat of activeCategories) {
      const mockLeads = generateMaxMockPlaces(cat, location, contactedExternalIds, contactedPhones);
      allMockLeads = allMockLeads.concat(mockLeads);
    }
    const filtered = filterPlacesByWebsite(allMockLeads, websiteFilter);
    return {
      leads: filtered,
      isMock: true,
      message: `Simulated Search Mode: Extracted ${filtered.length} leads across ${activeCategories.length} niches in ${location} within ${Math.round(radius / 1000)}km radius. Add Google Places Key in Settings for live data.`,
    };
  }

  await placesRateLimiter.acquire();

  try {
    console.log(`[PlacesService] 🚀 Running optimized Places extraction for [${activeCategories.join(', ')}] in ${location} (Radius: ${Math.round(radius / 1000)}km)...`);

    const allPlacesMap = new Map<string, any>();

    // Optimized Single High-Yield Query per Niche (Saves 66% API requests)
    for (const cat of activeCategories) {
      try {
        const reqBody: any = {
          textQuery: `${cat} in ${location}`,
          maxResultCount: 20,
        };

        if (latitude !== undefined && longitude !== undefined) {
          reqBody.locationBias = {
            circle: {
              center: {
                latitude,
                longitude,
              },
              radius: Math.min(radius, 50000),
            },
          };
        }

        // Optimized FieldMask (Only essential fields to stay on lowest Google billing tier)
        const response = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          reqBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.googleMapsUri',
            },
            timeout: 12000,
          }
        );

        const places = response.data.places || [];
        for (const p of places) {
          const id = p.id || (p.displayName?.text + p.formattedAddress);
          if (id && !allPlacesMap.has(id)) {
            allPlacesMap.set(id, { ...p, searchedCategory: cat });
          }
        }
      } catch (err: any) {
        console.warn(`[PlacesService] Sub-query for "${cat}" warning:`, err.message);
      }
    }

    const uniquePlaces = Array.from(allPlacesMap.values());
    console.log(`[PlacesService] Extracted ${uniquePlaces.length} total unique places from Google API across ${activeCategories.length} niches.`);

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

      const rawPhone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const externalId = p.id || `pl_${Math.random().toString(36).slice(2, 9)}`;

      const isAlreadyContacted =
        (externalId && contactedExternalIds.has(externalId)) ||
        (cleanPhone.length >= 7 && contactedPhones.has(cleanPhone));

      return {
        external_id: externalId,
        name: businessName,
        category: p.primaryType || (p.types && p.types[0]) || p.searchedCategory || category,
        address,
        phone: rawPhone,
        website: website || undefined,
        has_website,
        instagram_handle: `@${nameSlug}_${citySlug}`,
        rating: p.rating || 0,
        user_ratings_total: p.userRatingCount || 0,
        description: p.editorialSummary?.text || '',
        google_maps_url: mapsUrl,
        already_contacted: isAlreadyContacted,
      };
    });

    const filtered = filterPlacesByWebsite(leads, websiteFilter);

    // Store in Persistent 48-Hour Cache to Save Future API Calls
    if (filtered.length > 0) {
      await setCachedData(cacheKey, filtered, 48);
    }

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

function generateMaxMockPlaces(
  category: string,
  location: string,
  contactedExtIds?: Set<string>,
  contactedPhones?: Set<string>
): PlaceLeadResult[] {
  const city = location.split(',')[0].trim();
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]/g, '');

  const businessPrefixes = [
    'Elite', 'Apex', 'Royal', 'Shree', 'Global', 'Prime', 'Metro', 'Urban', 'Silver', 'Golden',
    'Sunrise', 'Zenith', 'NextGen', 'Divine', 'Superb', 'Classic', 'Grand', 'Pinnacle', 'Radiant', 'Infinite'
  ];

  const results: PlaceLeadResult[] = [];

  for (let i = 1; i <= 25; i++) {
    const prefix = businessPrefixes[(i - 1) % businessPrefixes.length];
    const name = `${prefix} ${category} ${i > businessPrefixes.length ? i : ''}`.trim();
    const hasWebsite = i % 3 === 0;
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const phone = `+91 ${9800000000 + i * 1111}`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const extId = `mock_${citySlug}_${category.slice(0, 3)}_${i}`;

    const isContacted = Boolean(
      (contactedExtIds && contactedExtIds.has(extId)) ||
      (contactedPhones && cleanPhone.length >= 7 && contactedPhones.has(cleanPhone))
    );

    results.push({
      external_id: extId,
      name,
      category,
      address: `Shop ${i * 4}, Commercial Complex, ${city}, India`,
      phone,
      website: hasWebsite ? `https://www.${nameSlug}.com` : undefined,
      has_website: hasWebsite,
      instagram_handle: `@${nameSlug}_${citySlug}`,
      rating: parseFloat((4.0 + (i % 10) * 0.1).toFixed(1)),
      user_ratings_total: 15 + i * 8,
      description: `Leading ${category} provider in ${city} offering specialized services.`,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`,
      already_contacted: isContacted,
    });
  }

  return results;
}
