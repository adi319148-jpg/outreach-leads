import React, { useState } from 'react';
import { searchYouTube, saveLeads } from '../../services/api';
import { YouTubeSearchResult, ThumbnailQualityStatus } from '../../types';
import {
  Youtube,
  Search,
  Users,
  Video,
  Eye,
  Mail,
  CheckSquare,
  Square,
  Sparkles,
  BookmarkCheck,
  AlertCircle,
  ExternalLink,
  Sliders,
  Palette,
  Film,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface YoutubeSearchProps {
  onLeadsSaved: () => void;
  onOpenCampaign?: () => void;
}

export const YoutubeSearch: React.FC<YoutubeSearchProps> = ({ onLeadsSaved, onOpenCampaign }) => {
  const [keyword, setKeyword] = useState('Tech Reviews');
  const [subRangePreset, setSubRangePreset] = useState<string>('10k_50k');
  const [minSubs, setMinSubs] = useState<number>(10000);
  const [maxSubs, setMaxSubs] = useState<number>(50000);
  const [qualityFilter, setQualityFilter] = useState<'all' | 'needs_thumbnail_redesign' | 'needs_video_editing'>('all');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handlePresetChange = (preset: string) => {
    setSubRangePreset(preset);
    if (preset === '1k_10k') {
      setMinSubs(1000);
      setMaxSubs(10000);
    } else if (preset === '10k_50k') {
      setMinSubs(10000);
      setMaxSubs(50000);
    } else if (preset === '50k_200k') {
      setMinSubs(50000);
      setMaxSubs(200000);
    } else if (preset === '200k_1m') {
      setMinSubs(200000);
      setMaxSubs(1000000);
    } else if (preset === 'all') {
      setMinSubs(0);
      setMaxSubs(10000000);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setMessage(null);
    setSaveSuccessMsg(null);

    try {
      const data = await searchYouTube({
        keyword,
        minSubs: Number(minSubs) || 0,
        maxSubs: Number(maxSubs) || 0,
        qualityFilter,
      });
      // Start unchecked so user selects only the ones they want
      setResults(data.leads.map((l) => ({ ...l, selected: false })));
      setIsMock(data.isMock);
      if (data.message) {
        setMessage(data.message);
      }
    } catch (err: any) {
      console.error('YouTube search failed:', err);
      setMessage(err.response?.data?.error || 'Failed to search YouTube channels.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = results.every((r) => r.selected);
    setResults(results.map((r) => ({ ...r, selected: !allSelected })));
  };

  const toggleSelect = (index: number) => {
    setResults(
      results.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSave = async (pushToCampaign: boolean = false) => {
    const selected = results.filter((r) => r.selected);
    if (selected.length === 0) {
      alert('Please check at least one creator from the results below.');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const payload = selected.map((s) => ({
        source: 'youtube' as const,
        external_id: s.external_id,
        name: s.name,
        category: s.category,
        channel_handle: s.channel_handle,
        subscriber_count: s.subscriber_count,
        video_count: s.video_count,
        view_count: s.view_count,
        description: s.description,
        website: s.website,
        contact_email: s.contact_email,
        in_campaign_queue: Boolean(pushToCampaign),
        thumbnail_quality_status: s.thumbnail_quality_status,
        opportunity_reason: s.opportunity_reason,
        recent_video_title: s.recent_video_title,
        recent_video_thumbnail: s.recent_video_thumbnail,
      }));

      const res = await saveLeads(payload);
      setSaveSuccessMsg(
        pushToCampaign
          ? `Saved ${res.savedCount} creators and sent to Bulk Campaign Queue! 🚀`
          : `Saved ${res.savedCount} creators to Saved Creators CRM!`
      );
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onLeadsSaved();
      if (pushToCampaign && onOpenCampaign) {
        setTimeout(onOpenCampaign, 800);
      }
    } catch (err: any) {
      console.error('Failed to save YouTube leads:', err);
      setMessage(err.response?.data?.error || 'Failed to save leads.');
    } finally {
      setSaving(false);
    }
  };

  const handlePushSingle = async (channel: YouTubeSearchResult) => {
    setSaving(true);
    try {
      const payload = [{
        source: 'youtube' as const,
        external_id: channel.external_id,
        name: channel.name,
        category: channel.category,
        channel_handle: channel.channel_handle,
        subscriber_count: channel.subscriber_count,
        video_count: channel.video_count,
        view_count: channel.view_count,
        description: channel.description,
        website: channel.website,
        contact_email: channel.contact_email,
        in_campaign_queue: true,
        thumbnail_quality_status: channel.thumbnail_quality_status,
        opportunity_reason: channel.opportunity_reason,
        recent_video_title: channel.recent_video_title,
        recent_video_thumbnail: channel.recent_video_thumbnail,
      }];

      await saveLeads(payload);
      setSaveSuccessMsg(`Sent "${channel.name}" to Bulk Campaign Queue! 🚀`);
      onLeadsSaved();
      if (onOpenCampaign) setTimeout(onOpenCampaign, 600);
    } catch (err: any) {
      console.error('Failed to save single creator to campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = results.filter((r) => r.selected).length;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Bar & Advanced YouTube Optimization Filters */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Youtube className="h-5 w-5 text-rose-400" />
              <span>YouTube Creator & Thumbnail Quality Discovery</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Find creators whose <strong>Thumbnails need redesigning</strong> or whose <strong>Videos need short-form editing</strong>.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Visual Quality Audit</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Keyword / Niche */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-rose-400" />
                <span>Niche Keyword / Topic</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. AI Automation, Real Estate, Fitness, Tech Reviews"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-xs text-slate-100 placeholder-slate-500 transition-all font-sans"
                required
              />
            </div>

            {/* Subscriber Range Presets */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-rose-400" />
                <span>Subscriber Range Preset</span>
              </label>
              <select
                value={subRangePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-rose-500"
              >
                <option value="1k_10k">⚡ 1K – 10K (Emerging Creators)</option>
                <option value="10k_50k">🎯 10K – 50K (Micro Influencers - Sweet Spot)</option>
                <option value="50k_200k">🚀 50K – 200K (Mid-Tier Creators)</option>
                <option value="200k_1m">👑 200K – 1M (Macro Creators)</option>
                <option value="all">🌐 All Ranges (0 – 10M+)</option>
                <option value="custom">⚙️ Custom Range</option>
              </select>
            </div>

            {/* Visual & Thumbnail Quality Opportunity Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-rose-400" />
                <span>Visual Audit Filter</span>
              </label>
              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-rose-500"
              >
                <option value="all">All Quality Types</option>
                <option value="needs_thumbnail_redesign">🎨 Needs Thumbnail Redesign</option>
                <option value="needs_video_editing">🎬 Needs Video Editing & Reels</option>
              </select>
            </div>
          </div>

          {/* Custom Sub Range inputs if selected */}
          {subRangePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in">
              <div>
                <label className="text-[11px] text-slate-400">Min Subscribers:</label>
                <input
                  type="number"
                  value={minSubs}
                  onChange={(e) => setMinSubs(Number(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Max Subscribers:</label>
                <input
                  type="number"
                  value={maxSubs}
                  onChange={(e) => setMaxSubs(Number(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Quick Niche Tags + Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Popular:</span>
              {['Tech Reviews', 'Podcast Clips', 'Real Estate', 'Fitness Coaching', 'Personal Finance'].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setKeyword(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <Youtube className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing YouTube Channels...' : 'Find Creators & Audit Visuals'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notice / Messages */}
      {message && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <BookmarkCheck className="h-4 w-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Results Header & Actions */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              {results.every((r) => r.selected) ? (
                <CheckSquare className="h-4 w-4 text-rose-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-500" />
              )}
              <span>Select All ({results.length})</span>
            </button>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-rose-400 font-bold font-mono">
              {selectedCount} Selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={selectedCount === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-40"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-rose-400" />
              <span>Save ({selectedCount}) to CRM Only</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={selectedCount === 0 || saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Push Selected ({selectedCount}) to Bulk Campaign 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Cards Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((channel, idx) => (
            <div
              key={idx}
              onClick={() => toggleSelect(idx)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                channel.selected
                  ? 'bg-rose-950/20 border-rose-500/80 shadow-lg ring-1 ring-rose-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {channel.thumbnail_url ? (
                      <img
                        src={channel.thumbnail_url}
                        alt={channel.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {channel.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 line-clamp-1">
                        {channel.name}
                      </h4>
                      <p className="text-xs text-rose-400 font-mono">
                        {channel.channel_handle || `@${channel.name.toLowerCase().replace(/\s+/g, '')}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(idx);
                    }}
                  >
                    {channel.selected ? (
                      <CheckSquare className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Thumbnail Quality Audit Opportunity Badge */}
                {channel.thumbnail_quality_status && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs leading-relaxed space-y-1 ${
                      channel.thumbnail_quality_status === 'needs_thumbnail_redesign'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : channel.thumbnail_quality_status === 'needs_video_editing'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5">
                        {channel.thumbnail_quality_status === 'needs_thumbnail_redesign' ? (
                          <>
                            <Palette className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-amber-300">Needs Thumbnail Redesign</span>
                          </>
                        ) : channel.thumbnail_quality_status === 'needs_video_editing' ? (
                          <>
                            <Film className="h-3.5 w-3.5 text-purple-400" />
                            <span className="text-purple-300">Needs Video Editing / Reels</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Optimized Visuals</span>
                          </>
                        )}
                      </span>
                      {channel.view_to_sub_ratio && (
                        <span className="font-mono text-slate-300">
                          {channel.view_to_sub_ratio}% CTR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">
                      {channel.opportunity_reason}
                    </p>
                  </div>
                )}

                {/* Recent Video Snapshot Preview */}
                {channel.recent_video_thumbnail && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <div className="relative aspect-video w-full overflow-hidden">
                      <img
                        src={channel.recent_video_thumbnail}
                        alt={channel.recent_video_title || 'Video'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] text-slate-200 font-medium line-clamp-1">
                          {channel.recent_video_title}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metrics Stats */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Subscribers</div>
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      {formatNumber(channel.subscriber_count)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Videos</div>
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      {channel.video_count.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Total Views</div>
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      {formatNumber(channel.view_count)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer with Quick Push to Campaign button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                {channel.contact_email ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] truncate max-w-[150px]">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{channel.contact_email}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">No public email</span>
                )}

                <div className="flex items-center gap-1.5">
                  <a
                    href={channel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <span>Channel</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePushSingle(channel);
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="Send this creator to Bulk Campaign"
                  >
                    <Send className="h-3 w-3" />
                    <span>Push</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <Youtube className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">No YouTube results yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Search YouTube creators with the <strong>Subscriber Range</strong> and <strong>Visual Quality Audit Filter</strong> above.
          </p>
        </div>
      ) : null}
    </div>
  );
};
