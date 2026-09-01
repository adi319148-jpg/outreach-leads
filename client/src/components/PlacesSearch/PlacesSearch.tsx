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
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { WorldMapRadiusPicker } from './WorldMapRadiusPicker';

interface PlacesSearchProps {
  onLeadsSaved: () => void;
  onOpenCampaign?: () => void;
  onOpenSettings?: () => void;
}

export const PlacesSearch: React.FC<PlacesSearchProps> = ({ onLeadsSaved, onOpenCampaign, onOpenSettings }) => {
  const [category, setCategory] = useState('Dental Clinics');
  const [location, setLocation] = useState('Mumbai, India');
  const [radius, setRadius] = useState<number>(10000);
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'no_website' | 'has_website'>('all');
  const [selectedService, setSelectedService] = useState<OfferedService>('whatsapp_ai_agent');
  const [hideContacted, setHideContacted] = useState(true);

  const [showWorldMap, setShowWorldMap] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lng?: number; radiusKm?: number }>({
    lat: 19.0760,
    lng: 72.8777,
    radiusKm: 10,
  });

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
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
      });
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

  const visibleResults = results.filter((r) => !hideContacted || !r.already_contacted);
  const contactedCount = results.filter((r) => r.already_contacted).length;
  const uncontactedCount = results.filter((r) => !r.already_contacted).length;

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
      alert('Please check at least one uncontacted lead from the table below.');
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
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-white" />
              <span>Google Maps Business Lead Discovery</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Find local clinics, restaurants, agencies & gyms. Filter by website availability and view exact locations directly on Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWorldMap((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                showWorldMap
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{showWorldMap ? 'Close Map ▲' : 'Global Radius Map'}</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              <span>Local Business Pipeline</span>
            </div>
          </div>
        </div>

        {/* Interactive World Map Radius Selector */}
        {showWorldMap && (
          <div className="pt-1">
            <WorldMapRadiusPicker
              initialLat={selectedCoords.lat}
              initialLng={selectedCoords.lng}
              initialRadiusKm={Math.round(radius / 1000)}
              onLocationSelect={(data) => {
                setLocation(data.locationName);
                setRadius(data.radiusKm * 1000);
                setSelectedCoords({
                  lat: data.lat,
                  lng: data.lng,
                  radiusKm: data.radiusKm,
                });
              }}
            />
          </div>
        )}

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Category / Niche */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-zinc-400" />
                <span>Business Niche / Category</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Dental Clinics, Italian Restaurants, Fitness Gyms"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-white focus:ring-1 focus:ring-white text-xs text-white placeholder-zinc-500 transition-all font-sans"
                required
              />
            </div>

            {/* City / Location */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <span>Target Location / City</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX or Mumbai, India"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-white focus:ring-1 focus:ring-white text-xs text-white placeholder-zinc-500 transition-all font-sans"
                required
              />
            </div>

            {/* Website Presence Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
                <span>Website Filter</span>
              </label>
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-white"
              >
                <option value="all">All Businesses</option>
                <option value="no_website">No Website Only (High Intent)</option>
                <option value="has_website">Has Website (Redesign/Ads)</option>
              </select>
            </div>
          </div>

          {/* Quick Presets / Top Niches Row */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                <span>🎯 Top Recommended Niches:</span>
              </span>
              {category && (
                <button
                  type="button"
                  onClick={() => setCategory('')}
                  className="px-2.5 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-semibold border border-zinc-800 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                'Travel Agencies',
                'Dental Clinics',
                'Real Estate Builders',
                'Restaurants & Cafes',
                'Fitness Gyms',
                'Salons & Spas',
                'Interior Designers',
                'Wedding Photographers',
                'Coaching Institutes',
                'CA & Tax Consultants',
                'Car Detailing',
                'Fashion Boutiques',
                'Event Planners',
                'Hospitals & Clinics',
                'Pet Clinics',
                'Home Deep Cleaning',
              ].map((tag) => {
                const currentNiches = category.split(',').map((c) => c.trim().toLowerCase());
                const isSelected = currentNiches.includes(tag.toLowerCase());

                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => {
                      const list = category.split(',').map((c) => c.trim()).filter(Boolean);
                      if (isSelected) {
                        const next = list.filter((c) => c.toLowerCase() !== tag.toLowerCase());
                        setCategory(next.join(', '));
                      } else {
                        setCategory([...list, tag].join(', '));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all border font-medium flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white border-white text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <span className="text-[11px] text-zinc-950 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Action Footer */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>Direct Places API extraction with phone numbers, addresses & website checks</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className={`h-4 w-4 text-zinc-950 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Searching Google Maps...' : 'Find Business Leads ➔'}</span>
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
            {noWebsiteCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{noWebsiteCount} No Website</span>
              </span>
            )}

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
          {visibleResults.map((place, idx) => (
            <div
              key={place.external_id || idx}
              onClick={() => toggleSelect(idx)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                place.selected
                  ? 'bg-zinc-850 border-white text-white shadow-md'
                  : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
              } ${place.already_contacted ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      {place.selected ? (
                        <CheckSquare className="h-4 w-4 text-white" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600" />
                      )}
                    </button>
                    <h3 className="text-sm font-bold text-white truncate">{place.name}</h3>
                  </div>

                  {place.rating && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0">
                      ★ {place.rating} ({place.user_ratings_total || 0})
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{place.address || 'Address not listed'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="font-mono text-zinc-300">{place.phone || 'No phone listed'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {place.website ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium max-w-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <Globe className="h-3 w-3 text-emerald-400 shrink-0" />
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline truncate text-emerald-300 font-mono text-[11px]"
                        >
                          {place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <Globe className="h-3 w-3 text-rose-400 shrink-0" />
                        <span>No Website</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500 font-medium truncate">
                  {place.category || 'Local Business'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSingleToCampaign(place);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors shrink-0"
                >
                  Send to Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="p-12 rounded-2xl bg-[#121215] border border-dashed border-zinc-800 text-center space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-400 w-fit mx-auto border border-zinc-800">
              <MapPin className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-base font-bold text-white">No Business Leads yet</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Enter a business niche and location above to discover local leads, check website availability, and select specific prospects for your campaign.
            </p>
          </div>
        )
      )}
    </div>
  );
};
