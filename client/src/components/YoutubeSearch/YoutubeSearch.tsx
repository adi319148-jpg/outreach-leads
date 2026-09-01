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
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface YoutubeSearchProps {
  onLeadsSaved: () => void;
  onOpenCampaign?: () => void;
  onOpenSettings?: () => void;
}

export const YoutubeSearch: React.FC<YoutubeSearchProps> = ({ onLeadsSaved, onOpenCampaign, onOpenSettings }) => {
  const [keyword, setKeyword] = useState('Tech Reviews');
  const [subRangePreset, setSubRangePreset] = useState<string>('10k_50k');
  const [minSubs, setMinSubs] = useState<number>(10000);
  const [maxSubs, setMaxSubs] = useState<number>(50000);
  const [qualityFilter, setQualityFilter] = useState<'all' | 'needs_thumbnail_redesign' | 'needs_video_editing'>('all');
  const [hideContacted, setHideContacted] = useState(true);
  
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

  const visibleResults = results.filter((r) => !hideContacted || !r.already_contacted);
  const contactedCount = results.filter((r) => r.already_contacted).length;
  const uncontactedCount = results.filter((r) => !r.already_contacted).length;
  const selectedCount = results.filter((r) => r.selected && !r.already_contacted).length;

  const toggleSelectAll = () => {
    const uncontactedVisible = visibleResults.filter((r) => !r.already_contacted);
    const allSelected = uncontactedVisible.every((r) => r.selected);
    setResults(
      results.map((r) =>
        r.already_contacted ? { ...r, selected: false } : { ...r, selected: !allSelected }
      )
    );
  };

  const toggleSelect = (index: number) => {
    setResults(
      results.map((r, i) => {
        if (i === index) {
          if (r.already_contacted) return r;
          return { ...r, selected: !r.selected };
        }
        return r;
      })
    );
  };

  const handleSave = async (pushToCampaign: boolean = false) => {
    const selected = results.filter((r) => r.selected && !r.already_contacted);
    if (selected.length === 0) {
      alert('Please check at least one uncontacted creator from the results below.');
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
        contact_email: s.contact_email,
        phone: s.phone,
        website: s.website,
        description: s.description,
        thumbnail_url: s.thumbnail_url,
        in_campaign_queue: Boolean(pushToCampaign),
        offered_service: 'video_editing' as const,
      }));

      const res = await saveLeads(payload, false, 'video_editing');
      setSaveSuccessMsg(
        pushToCampaign
          ? `Saved ${res.savedCount} creators and sent to Bulk Campaign Queue! 🚀`
          : `Saved ${res.savedCount} creators to Saved YouTube CRM!`
      );
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onLeadsSaved();
      if (pushToCampaign && onOpenCampaign) {
        setTimeout(onOpenCampaign, 800);
      }
    } catch (err: any) {
      console.error('Failed to save YouTube creators:', err);
      setMessage(err.response?.data?.error || 'Failed to save leads.');
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Filter Card */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Youtube className="h-5 w-5 text-white" />
              <span>YouTube Creator & Channel Discovery</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Find content creators by niche, subscriber sweet-spots, and quality opportunities.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
            <Video className="h-3.5 w-3.5 text-zinc-400" />
            <span>YouTube Creator Pipeline</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Niche / Topic */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-zinc-400" />
                <span>Channel Niche / Search Keyword</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. AI SaaS, Fitness & Gym, Gaming, Tech Reviews"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-white focus:ring-1 focus:ring-white text-xs text-white placeholder-zinc-500 transition-all font-sans"
                required
              />
            </div>

            {/* Subscriber Preset */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <span>Subscriber Range</span>
              </label>
              <select
                value={subRangePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-white"
              >
                <option value="1k_10k">1K - 10K (Micro)</option>
                <option value="10k_50k">10K - 50K (Sweet Spot)</option>
                <option value="50k_200k">50K - 200K (Growing)</option>
                <option value="200k_1m">200K - 1M (High Reach)</option>
                <option value="all">All Channels</option>
              </select>
            </div>

            {/* Quality Opportunity Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-zinc-400" />
                <span>Service Angle</span>
              </label>
              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-white"
              >
                <option value="all">All Channels</option>
                <option value="needs_thumbnail_redesign">Thumbnail Redesign Opportunities</option>
                <option value="needs_video_editing">Video Editing Opportunities</option>
              </select>
            </div>
          </div>

          {/* Presets Row */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/60">
            <span className="text-[11px] text-zinc-400 font-semibold">🎯 Popular Niches:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                'Tech Reviews',
                'AI & Automation',
                'Fitness & Gym',
                'Finance & Stocks',
                'Gaming & Streaming',
                'Self Improvement',
                'Real Estate',
                'Crypto & Web3',
                'Cooking & Food',
                'Travel Vlogs',
              ].map((niche) => (
                <button
                  type="button"
                  key={niche}
                  onClick={() => setKeyword(niche)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all border font-medium ${
                    keyword.toLowerCase() === niche.toLowerCase()
                      ? 'bg-white border-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>YouTube Data API v3 integration with subscriber analysis & video quality checks</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className={`h-4 w-4 text-zinc-950 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Searching YouTube...' : 'Discover Creators ➔'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notice / Messages */}
      {message && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-750 text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
            <span>{message}</span>
          </div>
          {isMock && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors shrink-0"
            >
              <span>Add API Key in Settings</span>
            </button>
          )}
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2.5">
          <BookmarkCheck className="h-4 w-4 shrink-0 text-white" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Results Header & Batch Actions */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#121215] border border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              {results.every((r) => r.selected) ? (
                <CheckSquare className="h-4 w-4 text-white" />
              ) : (
                <Square className="h-4 w-4 text-zinc-500" />
              )}
              <span>Select All ({results.length})</span>
            </button>
            <span className="text-xs text-zinc-700">|</span>
            <span className="text-xs text-white font-bold font-mono">
              {selectedCount} Selected
            </span>

            {contactedCount > 0 && (
              <button
                type="button"
                onClick={() => setHideContacted((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  hideContacted
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                <span>{hideContacted ? 'Contacted Hidden' : 'Showing Contacted'} ({contactedCount})</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || selectedCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>Save ({selectedCount}) to CRM</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={saving || selectedCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Add ({selectedCount}) to Dispatch Queue ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Grid / List */}
      {visibleResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleResults.map((channel, idx) => (
            <div
              key={channel.external_id || idx}
              onClick={() => toggleSelect(idx)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                channel.selected
                  ? 'bg-zinc-850 border-white text-white shadow-md'
                  : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
              } ${channel.already_contacted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(idx);
                      }}
                      className="text-zinc-400 hover:text-white shrink-0"
                    >
                      {channel.selected ? (
                        <CheckSquare className="h-4 w-4 text-white" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600" />
                      )}
                    </button>
                    <h3 className="text-sm font-bold text-white truncate">{channel.name}</h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0">
                    {formatNumber(channel.subscriber_count)} subs
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    <Users className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate font-mono text-zinc-300">{channel.channel_handle || '@channel'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>{formatNumber(channel.video_count)} videos • {formatNumber(channel.view_count)} views</span>
                  </div>

                  {channel.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="font-mono text-zinc-300">{channel.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <a
                  href={channel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <span>Open Channel</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <span className="text-[11px] text-zinc-500 font-medium">
                  {channel.category || 'Creator'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="p-12 rounded-2xl bg-[#121215] border border-dashed border-zinc-800 text-center space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-400 w-fit mx-auto border border-zinc-800">
              <Youtube className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-base font-bold text-white">No YouTube Creators found</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Enter a search niche above to discover YouTube channels, analyze view metrics, and build your sponsorship pipeline.
            </p>
          </div>
        )
      )}
    </div>
  );
};
