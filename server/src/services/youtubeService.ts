import axios from 'axios';
import { youtubeRateLimiter } from '../utils/rateLimiter';
import { getSetting } from './settingsService';
import { all } from '../db/database';
import { getCachedData, setCachedData } from './cacheService';

export type ThumbnailQualityStatus =
  | 'needs_thumbnail_redesign'
  | 'needs_video_editing'
  | 'optimized_visuals';

export interface YouTubeLeadResult {
  external_id: string;
  name: string;
  category: string;
  channel_handle?: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  avg_views_per_video: number;
  view_to_sub_ratio: number;
  thumbnail_quality_status: ThumbnailQualityStatus;
  opportunity_reason: string;
  description: string;
  website: string;
  contact_email?: string;
  phone?: string;
  thumbnail_url?: string;
  recent_video_title?: string;
  recent_video_thumbnail?: string;
  selected?: boolean;
  already_contacted?: boolean;
}

export async function searchYouTubeChannels(
  keyword: string,
  minSubs: number = 0,
  maxSubs: number = 10000000,
  qualityFilter: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing' = 'all',
  userKey?: string
): Promise<{ leads: YouTubeLeadResult[]; isMock: boolean; message?: string }> {
  const apiKey = await getSetting('youtubeApiKey', userKey);

  // Query all already-contacted channels from DB
  const contactedRecords = await all<{ external_id?: string; channel_handle?: string; contact_email?: string }>(
    "SELECT external_id, channel_handle, contact_email FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedExtIds = new Set(contactedRecords.filter((r) => r.external_id).map((r) => r.external_id));
  const contactedHandles = new Set(
    contactedRecords.filter((r) => r.channel_handle).map((r) => r.channel_handle?.toLowerCase())
  );
  const contactedEmails = new Set(
    contactedRecords.filter((r) => r.contact_email).map((r) => r.contact_email?.toLowerCase())
  );

  // 48-hour Persistent Cache Check (Saves 100 YouTube units per search)
  const cacheKey = `yt:${keyword.toLowerCase().trim()}:${minSubs}:${maxSubs}:${qualityFilter}`;
  const cachedData = await getCachedData<YouTubeLeadResult[]>(cacheKey);

  if (cachedData && cachedData.length > 0) {
    console.log(`[YouTubeService] ⚡ CACHE HIT: Returning ${cachedData.length} creators (0 Quota Units used).`);
    const freshAnnotated = cachedData.map((lead) => {
      const handle = (lead.channel_handle || '').toLowerCase();
      const isContacted = Boolean(
        (lead.external_id && contactedExtIds.has(lead.external_id)) ||
        (handle && contactedHandles.has(handle)) ||
        (lead.contact_email && contactedEmails.has(lead.contact_email.toLowerCase()))
      );
      return { ...lead, already_contacted: isContacted };
    });

    return {
      leads: freshAnnotated,
      isMock: false,
      message: `⚡ Instant Cache: Loaded ${freshAnnotated.length} channels with 0 YouTube quota consumption.`,
    };
  }

  if (!apiKey) {
    console.log('[YouTubeService] No API key configured. Generating comprehensive simulation channels...');
    const mockLeads = generateMaxMockYouTube(keyword);
    const filtered = filterYouTubeLeads(mockLeads, minSubs, maxSubs, qualityFilter);
    return {
      leads: filtered,
      isMock: true,
      message: `Simulated Search Mode: Extracted ${filtered.length} creator channels for "${keyword}". Add YouTube Data API Key in Settings for live data.`,
    };
  }

  await youtubeRateLimiter.acquire();

  try {
    console.log(`[YouTubeService] 🚀 Running optimized single-call YouTube extraction for: "${keyword}"`);

    const channelIdSet = new Set<string>();

    // 1. Single 50-Item Search Query (Consumes 100 units once instead of 300+ units)
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'channel',
        q: keyword,
        maxResults: 50,
        key: apiKey,
      },
      timeout: 10000,
    });

    const items = searchRes.data.items || [];
    for (const item of items) {
      const chId = item.id?.channelId || item.snippet?.channelId;
      if (chId) channelIdSet.add(chId);
    }

    const channelIds = Array.from(channelIdSet).slice(0, 50);

    if (channelIds.length === 0) {
      return { leads: [], isMock: false };
    }

    // 2. Fetch full statistics and details for all channel IDs in one single batch (1 unit)
    const channelsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics,brandingSettings',
        id: channelIds.join(','),
        key: apiKey,
      },
      timeout: 12000,
    });

    const channelData = channelsRes.data.items || [];
    const leads: YouTubeLeadResult[] = channelData.map((ch: any) => {
      const stats = ch.statistics || {};
      const snippet = ch.snippet || {};
      const desc = snippet.description || '';
      const customUrl = snippet.customUrl
        ? snippet.customUrl.startsWith('@')
          ? snippet.customUrl
          : `@${snippet.customUrl}`
        : '';

      const subCount = parseInt(stats.subscriberCount || '0', 10);
      const vidCount = parseInt(stats.videoCount || '0', 10);
      const vCount = parseInt(stats.viewCount || '0', 10);
      const avgViews = vidCount > 0 ? Math.round(vCount / vidCount) : 0;
      const viewToSubRatio = subCount > 0 ? parseFloat(((avgViews / subCount) * 100).toFixed(1)) : 0;

      // Extract email from channel description
      const emailMatch = desc.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const email = emailMatch ? emailMatch[0] : undefined;

      // Extract Indian phone number if mentioned
      const phoneMatch = desc.match(/(?:\+91[\-\s]?)?[6789]\d{9}/);
      const phone = phoneMatch ? phoneMatch[0] : undefined;

      // Visual & Thumbnail Quality Assessment
      let thumbnailStatus: ThumbnailQualityStatus = 'optimized_visuals';
      let reason = 'Channel has consistent video output and optimized visuals.';

      if (viewToSubRatio < 15 && subCount > 5000) {
        thumbnailStatus = 'needs_thumbnail_redesign';
        reason = `High subscribers (${subCount.toLocaleString()}) with lower avg views (${avgViews.toLocaleString()} / ${viewToSubRatio}% CTR). High upside for higher-CTR thumbnail redesign.`;
      } else if (vidCount > 20 && viewToSubRatio >= 15) {
        thumbnailStatus = 'needs_video_editing';
        reason = 'Strong audience engagement. Candidate for short-form video repurposing (Reels/Shorts) to double organic reach.';
      }

      const handle = (customUrl || `@${(snippet.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`).toLowerCase();
      const isAlreadyContacted =
        Boolean(
          (ch.id && contactedExtIds.has(ch.id)) ||
          (handle && contactedHandles.has(handle)) ||
          (email && contactedEmails.has(email.toLowerCase()))
        );

      return {
        external_id: ch.id,
        name: snippet.title || 'YouTube Creator',
        category: keyword,
        channel_handle: customUrl || `@${(snippet.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        subscriber_count: subCount,
        video_count: vidCount,
        view_count: vCount,
        avg_views_per_video: avgViews,
        view_to_sub_ratio: viewToSubRatio,
        thumbnail_quality_status: thumbnailStatus,
        opportunity_reason: reason,
        description: desc.slice(0, 300),
        website: `https://www.youtube.com/channel/${ch.id}`,
        contact_email: email,
        phone,
        thumbnail_url: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url,
        already_contacted: isAlreadyContacted,
      };
    });

    const filtered = filterYouTubeLeads(leads, minSubs, maxSubs, qualityFilter);
    if (filtered.length > 0) {
      await setCachedData(cacheKey, filtered, 48);
    }
    return { leads: filtered, isMock: false };
  } catch (error: any) {
    console.error('[YouTubeService] YouTube API error:', error.response?.data || error.message);
    const errMsg = error.response?.data?.error?.message || error.message || 'YouTube API search failed';
    throw new Error(errMsg);
  }
}

function filterYouTubeLeads(
  leads: YouTubeLeadResult[],
  minSubs: number,
  maxSubs: number,
  qualityFilter: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing'
): YouTubeLeadResult[] {
  return leads.filter((lead) => {
    if (minSubs > 0 && lead.subscriber_count < minSubs) return false;
    if (maxSubs > 0 && maxSubs < 10000000 && lead.subscriber_count > maxSubs) return false;
    if (qualityFilter !== 'all' && lead.thumbnail_quality_status !== qualityFilter) return false;
    return true;
  });
}

function generateMaxMockYouTube(keyword: string): YouTubeLeadResult[] {
  const cleanKeyword = keyword.trim();
  const prefixes = [
    'Tech & Trends with',
    'Daily Insights by',
    'Masterclass with',
    'The Official',
    'Growth Hub by',
    'Spotlight on',
    'Pro Studio by',
    'NextGen',
    'Creative Pulse with',
    'The Real',
    'Uncut Series with',
    'Inside Look by',
    'Expert Corner with',
    'Vlog Central with',
    'Deep Dive by',
    'Prime Focus with',
    'Superstar',
    'Digital Formula with',
    'The Fast Lane with',
    'Elite Vision by',
  ];

  const names = [
    'Aarav Sharma',
    'Rohan Verma',
    'Pooja Mehta',
    'Kunal Kapoor',
    'Neha Singhal',
    'Vikram Malhotra',
    'Ananya Iyer',
    'Siddharth Joshi',
    'Divya Patel',
    'Aditya Saxena',
    'Tanvi Deshmukh',
    'Rahul Nambiar',
    'Kavita Sen',
    'Manish Choudhary',
    'Sneha Aggarwal',
    'Gaurav Sethi',
    'Rhea Banerjee',
    'Nikhil Bhatt',
    'Shweta Roy',
    'Harsh Vardhan',
  ];

  const results: YouTubeLeadResult[] = [];

  for (let i = 0; i < 40; i++) {
    const creatorName = names[i % names.length];
    const prefix = prefixes[i % prefixes.length];
    const title = `${creatorName} | ${cleanKeyword} Hub`;
    const handle = `@${creatorName.toLowerCase().replace(/\s+/g, '')}_${(i + 1) * 7}`;
    const subCount = Math.floor(8000 + Math.pow(i + 3, 2.8) * 80);
    const videoCount = 35 + ((i * 19) % 240);
    const avgViews = Math.floor(subCount * (0.08 + (i % 8) * 0.04));
    const viewCount = avgViews * videoCount;
    const viewToSubRatio = parseFloat(((avgViews / subCount) * 100).toFixed(1));

    const email = `${creatorName.toLowerCase().replace(/\s+/g, '.')}.collabs@gmail.com`;
    const phoneDigitStart = ['98', '97', '99', '88', '70'][i % 5];
    const phone = `+91 ${phoneDigitStart}${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;

    let thumbnailStatus: ThumbnailQualityStatus = 'optimized_visuals';
    let reason = 'Channel has consistent video output and strong engagement.';

    if (viewToSubRatio < 14) {
      thumbnailStatus = 'needs_thumbnail_redesign';
      reason = `High subscribers (${subCount.toLocaleString()}) with ${viewToSubRatio}% avg CTR. High opportunity for high-contrast CTR thumbnail redesigns.`;
    } else {
      thumbnailStatus = 'needs_video_editing';
      reason = `Strong engagement (${avgViews.toLocaleString()} avg views). Prime candidate for short-form Reels & Shorts video editing.`;
    }

    results.push({
      external_id: `mock_yt_ch_${i + 1}_${Date.now().toString(36)}`,
      name: title,
      category: cleanKeyword,
      channel_handle: handle,
      subscriber_count: subCount,
      video_count: videoCount,
      view_count: viewCount,
      avg_views_per_video: avgViews,
      view_to_sub_ratio: viewToSubRatio,
      thumbnail_quality_status: thumbnailStatus,
      opportunity_reason: reason,
      description: `Official channel of ${creatorName} sharing regular ${cleanKeyword} content, tutorials, case studies, and business reviews. For brand collaborations: ${email}`,
      website: `https://www.youtube.com/${handle}`,
      contact_email: email,
      phone: i % 2 === 0 ? phone : undefined,
      thumbnail_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(creatorName)}`,
    });
  }

  return results;
}
