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
  Flame,
  CheckSquare,
  Square,
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
      onLeadsUpdated();
      if (onOpenCampaign) {
        setTimeout(onOpenCampaign, 800);
      }
    } catch (err) {
      console.error('Failed to push selected leads to campaign:', err);
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

  const handleSaveNotes = async () => {
    if (!editingNotesLead) return;
    try {
      await updateLead(editingNotesLead.id, { notes: notesText });
      setLeads((prev) =>
        prev.map((l) => (l.id === editingNotesLead.id ? { ...l, notes: notesText } : l))
      );
      setEditingNotesLead(null);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Filter Card */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
              {isYouTube ? <Youtube className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{isYouTube ? 'Saved YouTube Creators CRM' : 'Saved Local Businesses CRM'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {leads.length} Saved
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage contact status, conversion pipelines, interaction history & direct exports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={getExportCsvUrl()}
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>

            <button
              onClick={onOpenQueue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Open Pitch Queue ➔</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, city, phone..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-white"
            >
              <option value="all">All Conversion Statuses</option>
              <option value="discovered">Discovered</option>
              <option value="pitch_ready">Pitch Ready</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="converted">Converted Deal 🎉</option>
              <option value="rejected">Not Interested</option>
            </select>
          </div>

          {!isYouTube && (
            <div className="sm:col-span-3">
              <select
                value={hasWebsiteFilter}
                onChange={(e) => setHasWebsiteFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-white"
              >
                <option value="all">All Website Statuses</option>
                <option value="no_website">No Website Only</option>
                <option value="has_website">Has Website</option>
              </select>
            </div>
          )}
        </form>
      </div>

      {campaignMsg && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-white" />
            <span>{campaignMsg}</span>
          </div>
          {onOpenCampaign && (
            <button
              onClick={onOpenCampaign}
              className="px-3 py-1 rounded-lg bg-white text-zinc-950 font-bold text-xs shadow"
            >
              View Campaign Queue ➔
            </button>
          )}
        </div>
      )}

      {/* Batch Select Controls */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-white font-mono">{selectedIds.length} leads selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePushSelectedToCampaign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shadow"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Send to Bulk Campaign</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Table / List */}
      {leads.length > 0 ? (
        <div className="rounded-2xl bg-[#121215] border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider select-none">
                <tr>
                  <th className="p-4 w-10">
                    <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-white">
                      {selectedIds.length === leads.length && leads.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-white" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Business / Creator</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Metrics / Stats</th>
                  <th className="p-4">Conversion Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-zinc-900/60 transition-colors ${
                      selectedIds.includes(lead.id) ? 'bg-zinc-850/50' : ''
                    }`}
                  >
                    <td className="p-4">
                      <button onClick={() => toggleSelect(lead.id)} className="text-zinc-500 hover:text-white">
                        {selectedIds.includes(lead.id) ? (
                          <CheckSquare className="h-4 w-4 text-white" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-600" />
                        )}
                      </button>
                    </td>

                    <td className="p-4 space-y-1">
                      <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                        <span>{lead.name}</span>
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono hover:bg-emerald-500/20"
                            title="Visit Website"
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span>Web</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : !isYouTube ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <span className="w-1 h-1 rounded-full bg-rose-500" />
                            <span>No Website</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {lead.category} • {lead.address || lead.channel_handle || '—'}
                      </div>
                    </td>

                    <td className="p-4 space-y-1 font-mono text-[11px]">
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Phone className="h-3 w-3 text-zinc-500" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.contact_email && (
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Mail className="h-3 w-3 text-zinc-500" />
                          <span>{lead.contact_email}</span>
                        </div>
                      )}
                      {!lead.phone && !lead.contact_email && (
                        <span className="text-zinc-600">No contact info</span>
                      )}
                    </td>

                    <td className="p-4 font-mono text-xs">
                      {isYouTube ? (
                        <div className="space-y-0.5">
                          <div className="text-white font-bold">{formatNumber(lead.subscriber_count)} subs</div>
                          <div className="text-zinc-500 text-[10px]">{formatNumber(lead.video_count)} videos</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {lead.rating ? (
                            <div className="text-zinc-200 font-bold">★ {lead.rating} / 5.0</div>
                          ) : (
                            <div className="text-zinc-600">—</div>
                          )}
                          <div className="text-zinc-500 text-[10px]">{lead.user_ratings_total || 0} reviews</div>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:border-white"
                      >
                        <option value="discovered">Discovered</option>
                        <option value="pitch_ready">Pitch Ready</option>
                        <option value="contacted">Contacted</option>
                        <option value="replied">Replied</option>
                        <option value="converted">Converted 🎉</option>
                        <option value="rejected">Not Interested</option>
                      </select>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingNotesLead(lead);
                          setNotesText(lead.notes || '');
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                        title="Edit Notes"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="p-12 rounded-2xl bg-[#121215] border border-dashed border-zinc-800 text-center space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-400 w-fit mx-auto border border-zinc-800">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-base font-bold text-white">No Leads in CRM</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Find leads using Google Places or YouTube Discovery to build your conversion pipeline.
            </p>
          </div>
        )
      )}

      {/* Notes Modal */}
      {editingNotesLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121215] border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Notes for {editingNotesLead.name}</h3>
              <button
                onClick={() => setEditingNotesLead(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add client requirements, call details, or deal notes..."
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-white font-sans"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNotesLead(null)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all"
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
