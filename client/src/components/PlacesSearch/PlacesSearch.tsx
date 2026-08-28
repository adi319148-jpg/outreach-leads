import React, { useState } from 'react';
import { searchPlaces, saveLeads } from '../../services/api';
import { PlaceSearchResult, OfferedService } from '../../types';
import {
  Search,
  MapPin,
  Globe,
  Phone,
  Star,
  CheckSquare,
  Square,
  Sparkles,
  BookmarkCheck,
  AlertCircle,
  ExternalLink,
  Sliders,
  Instagram,
  Send,
  Building2,
  Code,
  Video,
  Palette,
  TrendingUp,
  Bot,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlacesSearchProps {
  onLeadsSaved: () => void;
  onOpenCampaign?: () => void;
}

export const PlacesSearch: React.FC<PlacesSearchProps> = ({ onLeadsSaved, onOpenCampaign }) => {
  const [category, setCategory] = useState('Dental Clinics');
  const [location, setLocation] = useState('Austin, TX');
  const [radius, setRadius] = useState<number>(5000);
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'no_website' | 'has_website'>('all');
  const [selectedService, setSelectedService] = useState<OfferedService>('website_design');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !location.trim()) return;

    setLoading(true);
    setMessage(null);
    setSaveSuccessMsg(null);

    try {
      const data = await searchPlaces({
        category,
        location,
        radius,
        websiteFilter,
      });
      // Start with unchecked so user selects specific leads
      setResults(data.leads.map((l) => ({ ...l, selected: false })));
      setIsMock(data.isMock);
      if (data.message) {
        setMessage(data.message);
      }
    } catch (err: any) {
      console.error('Places search failed:', err);
      setMessage(err.response?.data?.error || 'Failed to fetch places.');
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
      alert('Please check at least one lead from the table below.');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const payload = selected.map((s) => ({
        source: 'google_places' as const,
        external_id: s.external_id,
        name: s.name,
        category: s.category,
        address: s.address,
        phone: s.phone,
        website: s.website,
        has_website: s.has_website,
        instagram_handle: s.instagram_handle,
        rating: s.rating,
        user_ratings_total: s.user_ratings_total,
        description: s.description,
        google_maps_url: s.google_maps_url,
        in_campaign_queue: Boolean(pushToCampaign),
        offered_service: selectedService,
      }));

      const res = await saveLeads(payload, false, selectedService);
      setSaveSuccessMsg(
        pushToCampaign
          ? `Saved ${res.savedCount} leads and sent to Bulk Campaign Queue! 🚀`
          : `Saved ${res.savedCount} leads to Saved Business CRM!`
      );
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onLeadsSaved();
      if (pushToCampaign && onOpenCampaign) {
        setTimeout(onOpenCampaign, 800);
      }
    } catch (err: any) {
      console.error('Failed to save leads:', err);
      setMessage(err.response?.data?.error || 'Failed to save leads.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingleToCampaign = async (place: PlaceSearchResult) => {
    setSaving(true);
    try {
      const payload = [{
        source: 'google_places' as const,
        external_id: place.external_id,
        name: place.name,
        category: place.category,
        address: place.address,
        phone: place.phone,
        website: place.website,
        has_website: place.has_website,
        instagram_handle: place.instagram_handle,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        description: place.description,
        google_maps_url: place.google_maps_url,
        in_campaign_queue: true,
        offered_service: selectedService,
      }];

      await saveLeads(payload, false, selectedService);
      setSaveSuccessMsg(`Sent "${place.name}" to Bulk Campaign Queue! 🚀`);
      onLeadsSaved();
      if (onOpenCampaign) setTimeout(onOpenCampaign, 600);
    } catch (err: any) {
      console.error('Failed to save single lead to campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = results.filter((r) => r.selected).length;
  const noWebsiteCount = results.filter((r) => !r.has_website).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-400" />
              <span>Google Maps Business Lead Discovery</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Find local clinics, restaurants, agencies & gyms. Filter by <strong>🔴 No Website</strong> and view exact locations directly on Google Maps.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Building2 className="h-3.5 w-3.5" />
            <span>Local Business Pipeline</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Category / Niche */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-sky-400" />
                <span>Business Niche / Category</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Dental Clinics, Italian Restaurants, Fitness Gyms"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs text-slate-100 placeholder-slate-500 transition-all font-sans"
                required
              />
            </div>

            {/* City / Location */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                <span>Target Location / City</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX or Mumbai, India"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs text-slate-100 placeholder-slate-500 transition-all font-sans"
                required
              />
            </div>

            {/* Website Presence Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-sky-400" />
                <span>Website Filter</span>
              </label>
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-sky-500"
              >
                <option value="all">All Businesses</option>
                <option value="no_website">🔴 No Website Only (High Intent)</option>
                <option value="has_website">🟢 Has Website (Redesign/Ads)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Popular:</span>
              {['Dental Clinics', 'Italian Restaurant', 'Fitness Gym', 'Real Estate Agency', 'Law Firm'].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setCategory(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
            >
              <Search className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Searching Google Maps...' : 'Find Business Leads'}</span>
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

      {/* Results Header & Batch Actions */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              {results.every((r) => r.selected) ? (
                <CheckSquare className="h-4 w-4 text-sky-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-500" />
              )}
              <span>Select All ({results.length})</span>
            </button>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-sky-400 font-bold font-mono">
              {selectedCount} Selected
            </span>
            {noWebsiteCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                🔴 {noWebsiteCount} No Website
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={selectedCount === 0 || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-40"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-sky-400" />
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

      {/* Results Table */}
      {results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCount === results.length && results.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Website Opportunity</th>
                  <th className="py-3 px-4">Instagram</th>
                  <th className="py-3 px-4">Rating & Reviews</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Location & Maps Link</th>
                  <th className="py-3 px-4 text-right">Quick Push</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((place, idx) => (
                  <tr
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      place.selected ? 'bg-sky-950/20' : ''
                    }`}
                  >
                    <td
                      className="py-3 px-3.5 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(idx);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={place.selected}
                        onChange={() => toggleSelect(idx)}
                        className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{place.name}</span>
                        {!place.has_website && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="No Website" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{place.category}</div>
                    </td>

                    <td className="py-3 px-4">
                      {place.has_website && place.website ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Globe className="h-2.5 w-2.5" /> Has Website
                          </span>
                          <div>
                            <a
                              href={place.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-400 hover:underline truncate max-w-[130px] block text-[11px]"
                            >
                              {place.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          🔴 NO WEBSITE (Hot Lead)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {place.instagram_handle ? (
                        <a
                          href={`https://instagram.com/${place.instagram_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 hover:underline"
                        >
                          <Instagram className="h-3 w-3 shrink-0" />
                          <span>{place.instagram_handle}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {place.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-200">{place.rating}</span>
                          <span className="text-slate-500">({place.user_ratings_total || 0})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">No ratings</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {place.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                          <Phone className="h-3 w-3 text-emerald-400" />
                          <span>{place.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>

                    {/* Location with Direct 1-Click Google Maps Link */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 max-w-xs truncate text-[11px]">
                        {place.address}
                      </div>
                      <a
                        href={place.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 hover:text-sky-300 hover:underline mt-0.5"
                        title="View exact location on Google Maps"
                      >
                        <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
                        <span>View on Google Maps</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveSingleToCampaign(place);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors ml-auto flex items-center gap-1 text-[11px] font-bold"
                        title="Send this lead to Bulk Campaign"
                      >
                        <Send className="h-3 w-3" />
                        <span>Push</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <MapPin className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">No Business Leads yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Enter a business niche and location above to discover local leads, check website availability, and select specific prospects for your campaign.
          </p>
        </div>
      ) : null}
    </div>
  );
};
