import axios from 'axios';
import { youtubeRateLimiter } from '../utils/rateLimiter';
import { getSetting } from './settingsService';

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
  view_to_sub_ratio: number; // percentage e.g. 8.5%
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
}

export async function searchYouTubeChannels(
  keyword: string,
  minSubs: number = 0,
  maxSubs: number = 10000000,
  qualityFilter: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing' = 'all'
): Promise<{ leads: YouTubeLeadResult[]; isMock: boolean; message?: string }> {
  const apiKey = await getSetting('youtubeApiKey');

  if (!apiKey) {
    throw new Error('YouTube API key is missing. Please configure your API key in Settings.');
  }

  await youtubeRateLimiter.acquire();

  try {
    console.log(`[YouTubeService] Querying Live YouTube Data API v3 for keyword: "${keyword}"`);

    // 1. Search for channels
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'channel',
        q: keyword,
        maxResults: 25,
        key: apiKey,
      },
      timeout: 10000,
    });

    const items = searchRes.data.items || [];
    const channelIds = items
      .map((item: any) => item.id?.channelId || item.snippet?.channelId)
      .filter(Boolean);

    if (channelIds.length === 0) {
      return { leads: [], isMock: false };
    }

    // 2. Fetch full statistics and details for all channels in one batch
    const channelsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics,brandingSettings',
        id: channelIds.join(','),
        key: apiKey,
      },
      timeout: 10000,
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

      // Extract email
      const emailMatch = desc.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const email = emailMatch ? emailMatch[0] : undefined;

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
        thumbnail_url: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url,
      };
    });

    const filtered = filterYouTubeLeads(leads, minSubs, maxSubs, qualityFilter);
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
