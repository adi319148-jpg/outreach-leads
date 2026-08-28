import React, { useState, useEffect } from 'react';
import {
  getLeads,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  addToCampaignQueue,
  getExportCsvUrl,
} from '../../services/api';
import { Lead, LeadStatus, LeadSource } from '../../types';
import {
  Search,
  Filter,
  Trash2,
  Download,
  MapPin,
  Youtube,
  Star,
  Globe,
  Phone,
  Mail,
  Edit,
  Sparkles,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  Clock,
  Send,
  Building2,
  Video,
  Users,
  Instagram,
  Layers,
  Flame,
  CheckSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeadsCRMProps {
  sourcePreset?: LeadSource;
  onLeadsUpdated: () => void;
  onOpenQueue: () => void;
  onOpenCampaign?: () => void;
}

export const LeadsCRM: React.FC<LeadsCRMProps> = ({
  sourcePreset = 'google_places',
  onLeadsUpdated,
  onOpenQueue,
  onOpenCampaign,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingNotesLead, setEditingNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState('');
  const [campaignMsg, setCampaignMsg] = useState<string | null>(null);

  const isYouTube = sourcePreset === 'youtube';

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        source: sourcePreset,
        status: selectedStatus,
        hasWebsite: hasWebsiteFilter,
        search: searchTerm.trim() || undefined,
        limit: 200,
      });
      setLeads(res.leads);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [sourcePreset, selectedStatus, hasWebsiteFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    if (newStatus === 'converted') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    try {
      await updateLead(leadId, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (leadId: number) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected leads?`)) return;
    try {
      await bulkDeleteLeads(selectedIds);
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      onLeadsUpdated();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handlePushSelectedToCampaign = async () => {
    if (selectedIds.length === 0) return;
    try {
      await addToCampaignQueue(selectedIds);
      setCampaignMsg(`Added ${selectedIds.length} selected leads to Bulk Campaign Queue! 🚀`);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setTimeout(() => {
        setCampaignMsg(null);
        if (onOpenCampaign) onOpenCampaign();
      }, 1000);
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to add to campaign:', err);
    }
  };

  const handlePushSingleToCampaign = async (leadId: number) => {
    try {
      await addToCampaignQueue([leadId]);
      setCampaignMsg(`Sent lead to Bulk Campaign Queue! 🚀`);
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      setTimeout(() => {
        setCampaignMsg(null);
        if (onOpenCampaign) onOpenCampaign();
      }, 1000);
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to push lead:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openNotesModal = (lead: Lead) => {
    setEditingNotesLead(lead);
    setNotesText(lead.notes || '');
  };

  const saveNotes = async () => {
    if (!editingNotesLead) return;
    try {
      await updateLead(editingNotesLead.id, { notes: notesText });
      setLeads((prev) =>
        prev.map((l) => (l.id === editingNotesLead.id ? { ...l, notes: notesText } : l))
      );
      setEditingNotesLead(null);
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const statusOptions: { value: LeadStatus; label: string; bg: string }[] = [
    { value: 'not_contacted', label: 'Not Contacted', bg: 'bg-slate-800 text-slate-300' },
    { value: 'contacted', label: 'Contacted', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { value: 'replied', label: 'Replied', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { value: 'converted', label: 'Converted', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { value: 'rejected', label: 'Not Interested', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isYouTube ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'}`}>
            {isYouTube ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{isYouTube ? 'Saved YouTube Creators CRM Pipeline' : 'Saved Google Places Business CRM'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isYouTube ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'}`}>
                {leads.length} Saved
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isYouTube ? 'Select specific creators and click "Push Selected to Bulk Campaign Queue"' : 'Check specific businesses to dispatch them via Bulk WhatsApp or Email'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCampaign && (
            <button
              onClick={onOpenCampaign}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Flame className="h-3.5 w-3.5 text-emerald-400" />
              <span>View Campaign Queue</span>
            </button>
          )}

          <button
            onClick={onOpenQueue}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all ${
              isYouTube
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Open {isYouTube ? 'Creator' : 'Business'} Outreach Queue</span>
          </button>
        </div>
      </div>

      {campaignMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="h-4 w-4" />
          <span>{campaignMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isYouTube ? "Search creators by channel name, handle, description..." : "Search businesses by name, niche, location, instagram, phone..."}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isYouTube && (
              <select
                value={hasWebsiteFilter}
                onChange={(e) => setHasWebsiteFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-sky-500"
              >
                <option value="all">All Website Status</option>
                <option value="no_website">🔴 No Website Only</option>
                <option value="has_website">🟢 Has Website</option>
              </select>
            )}

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-sky-500"
            >
              <option value="all">All Stages</option>
              <option value="not_contacted">Not Contacted</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="converted">Converted</option>
              <option value="rejected">Not Interested</option>
            </select>

            <a
              href={getExportCsvUrl()}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Selected bar: ONLY selected leads get pushed to bulk campaign */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs animate-in fade-in">
            <span className="text-sky-400 font-bold font-mono">{selectedIds.length} leads checked</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePushSelectedToCampaign}
                className="flex items-center gap-1.5 text-white font-bold px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Push Selected ({selectedIds.length}) to Bulk Campaign 🚀</span>
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      {leads.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th
                    className="py-3 px-3.5 w-10 text-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      readOnly
                      className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                    />
                  </th>
                  <th className="py-3.5 px-4">{isYouTube ? 'Channel Title & Handle' : 'Business Name & Maps Location'}</th>
                  <th className="py-3.5 px-4">{isYouTube ? 'Subscriber Stats' : 'Website Status & Instagram'}</th>
                  <th className="py-3.5 px-4">{isYouTube ? 'Channel Views' : 'Rating & Reviews'}</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">CRM Status</th>
                  <th className="py-3.5 px-4">AI Pitch</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isChecked ? (isYouTube ? 'bg-rose-950/20' : 'bg-sky-950/20') : ''
                      }`}
                      onClick={() => toggleSelect(lead.id)}
                    >
                      <td
                        className="py-3 px-3.5 text-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(lead.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isYouTube ? (
                            <span className="text-rose-400 font-mono">{lead.channel_handle || '@channel'}</span>
                          ) : (
                            <div className="space-y-0.5">
                              <div>{lead.category || 'General'}</div>
                              {lead.address ? (
                                <a
                                  href={lead.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + lead.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline max-w-[220px] truncate text-[10px] font-medium"
                                  title="View on Google Maps"
                                >
                                  <MapPin className="h-3 w-3 shrink-0 text-sky-400" />
                                  <span className="truncate">{lead.address}</span>
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                </a>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* YouTube Stats vs Business Website Status */}
                      <td className="py-3 px-4">
                        {isYouTube ? (
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <div className="text-rose-400 font-bold">{formatNumber(lead.subscriber_count)} subs</div>
                            <div className="text-slate-500 text-[10px]">{lead.video_count || 0} videos</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {lead.has_website && lead.website ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <Globe className="h-2.5 w-2.5" /> Has Website
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                🔴 No Website
                              </span>
                            )}

                            {lead.instagram_handle && (
                              <a
                                href={`https://instagram.com/${lead.instagram_handle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-purple-400 font-mono flex items-center gap-1 hover:underline block"
                              >
                                <Instagram className="h-2.5 w-2.5" />
                                <span>{lead.instagram_handle}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Rating / Views */}
                      <td className="py-3 px-4">
                        {isYouTube ? (
                          <div className="font-mono text-[11px] text-slate-300">
                            {formatNumber(lead.view_count)} views
                          </div>
                        ) : (
                          <div>
                            {lead.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-slate-200">{lead.rating}</span>
                                <span className="text-slate-500">({lead.user_ratings_total || 0})</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">No ratings</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 space-y-0.5">
                        {lead.contact_email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                            <Mail className="h-3 w-3 text-sky-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.contact_email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] text-sky-400 hover:underline truncate max-w-[130px]"
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        )}
                        {!lead.contact_email && !lead.phone && !lead.website && (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200 focus:border-sky-500 cursor-pointer"
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Pitch status */}
                      <td className="py-3 px-4">
                        {lead.pitch ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <Sparkles className="h-3 w-3" />
                            <span>Ready</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Draft</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openNotesModal(lead)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 max-w-[110px] truncate"
                        >
                          <Edit className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.notes || 'Add note'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePushSingleToCampaign(lead.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1 text-[10px] font-bold"
                            title="Push this lead to Bulk Campaign Queue"
                          >
                            <Send className="h-3 w-3" />
                            <span>Bulk</span>
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
          <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">
            {isYouTube ? 'No YouTube Creators saved in CRM yet' : 'No Business Leads saved in CRM yet'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isYouTube
              ? 'Discover creators in the "Find YT Channels" tab and save them to build your pipeline.'
              : 'Discover businesses in the "Find Business Leads" tab and save them to build your pipeline.'}
          </p>
        </div>
      ) : null}

      {/* Notes Modal */}
      {editingNotesLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              Interaction Notes for {editingNotesLead.name}
            </h3>
            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g. Discussing website redesign, meeting scheduled for next week..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingNotesLead(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
