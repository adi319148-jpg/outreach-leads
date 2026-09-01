import React, { useState, useEffect } from 'react';
import {
  getLeads,
  updateLead,
  generatePitch,
  batchGeneratePitches,
  getWhatsAppStatus,
  sendDirectWhatsAppMessage,
} from '../../services/api';
import { Lead, PitchTone, LeadSource, WhatsAppStatusState } from '../../types';
import {
  Send,
  Copy,
  Mail,
  MessageCircle,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Edit3,
  MapPin,
  Youtube,
  RefreshCw,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  Phone,
  UserCheck,
  Star,
  Users,
  Video,
  Eye,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PitchQueueProps {
  sourcePreset?: LeadSource;
  onQueueUpdated: () => void;
}

export const PitchQueue: React.FC<PitchQueueProps> = ({ sourcePreset = 'google_places', onQueueUpdated }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [editedPitches, setEditedPitches] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState<PitchTone>(sourcePreset === 'youtube' ? 'creative' : 'friendly');
  const [customPrompt, setCustomPrompt] = useState('');
  const [autoMarkContacted, setAutoMarkContacted] = useState(true);

  // WhatsApp in-app sending state
  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [sendingWaId, setSendingWaId] = useState<number | null>(null);
  const [waFeedback, setWaFeedback] = useState<{ id: number; success: boolean; msg: string } | null>(null);

  const isYouTube = sourcePreset === 'youtube';

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        source: sourcePreset,
        limit: 100,
      });
      setLeads(res.leads);

      const pitchMap: Record<number, string> = {};
      res.leads.forEach((l) => {
        if (l.pitch) pitchMap[l.id] = l.pitch;
      });
      setEditedPitches(pitchMap);

      if (res.leads.length > 0) {
        setSelectedLeadId(res.leads[0].id);
      } else {
        setSelectedLeadId(null);
      }

      const wa = await getWhatsAppStatus();
      setWaState(wa);
    } catch (err) {
      console.error('Failed to load queue leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [sourcePreset]);

  const activeLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const handlePitchChange = (leadId: number, text: string) => {
    setEditedPitches((prev) => ({ ...prev, [leadId]: text }));
  };

  const handleSavePitch = async (leadId: number) => {
    const text = editedPitches[leadId];
    if (text === undefined) return;
    try {
      await updateLead(leadId, { pitch: text, pitch_status: 'ready' });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pitch: text, pitch_status: 'ready' } : l))
      );
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to save pitch:', err);
    }
  };

  const handleRegeneratePitch = async (lead: Lead) => {
    setGeneratingId(lead.id);
    try {
      const res = await generatePitch({
        leadId: lead.id,
        tone: selectedTone,
        customInstructions: customPrompt.trim() || undefined,
      });

      setEditedPitches((prev) => ({ ...prev, [lead.id]: res.pitch }));
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, pitch: res.pitch, pitch_status: 'ready' } : l))
      );
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to regenerate pitch:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleBatchGenerate = async () => {
    const unpitched = leads.filter((l) => !l.pitch).map((l) => l.id);
    if (unpitched.length === 0) return;

    setBatchGenerating(true);
    try {
      const res = await batchGeneratePitches(unpitched, selectedTone);
      const pitchMap = { ...editedPitches };
      res.results.forEach((r) => {
        if (r.pitch) pitchMap[r.leadId] = r.pitch;
      });
      setEditedPitches(pitchMap);
      await fetchQueue();
      onQueueUpdated();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Batch generation failed:', err);
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleCopyPitch = async (leadId: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(leadId);
      setTimeout(() => setCopiedId(null), 2000);

      if (autoMarkContacted) {
        await updateLead(leadId, { status: 'contacted' });
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: 'contacted' } : l))
        );
        onQueueUpdated();
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSendViaWhatsAppWeb = (lead: Lead, pitch: string) => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(pitch);
    const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
    window.open(waUrl, '_blank');

    if (autoMarkContacted) {
      updateLead(lead.id, { status: 'contacted' }).then(() => {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: 'contacted' } : l))
        );
        onQueueUpdated();
      });
    }
  };

  const handleSendDirectWhatsApp = async (lead: Lead, pitch: string) => {
    if (!lead.phone) return;
    setSendingWaId(lead.id);
    setWaFeedback(null);

    try {
      const res = await sendDirectWhatsAppMessage({
        leadId: lead.id,
        phone: lead.phone,
        message: pitch,
      });

      if (res.success) {
        setWaFeedback({ id: lead.id, success: true, msg: 'Sent directly via WhatsApp!' });
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        if (autoMarkContacted) {
          await updateLead(lead.id, { status: 'contacted' });
          setLeads((prev) =>
            prev.map((l) => (l.id === lead.id ? { ...l, status: 'contacted' } : l))
          );
          onQueueUpdated();
        }
      } else {
        setWaFeedback({ id: lead.id, success: false, msg: res.message || 'Send failed' });
      }
    } catch (err: any) {
      console.error('Direct WhatsApp send failed:', err);
      setWaFeedback({
        id: lead.id,
        success: false,
        msg: err.response?.data?.message || err.message || 'Failed to dispatch.',
      });
    } finally {
      setSendingWaId(null);
    }
  };

  const handleSendEmail = (lead: Lead, pitch: string) => {
    if (!lead.contact_email) return;
    const subject = `Regarding ${lead.name}`;
    const mailto = `mailto:${lead.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(pitch)}`;
    window.open(mailto, '_blank');

    if (autoMarkContacted) {
      updateLead(lead.id, { status: 'contacted' }).then(() => {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: 'contacted' } : l))
        );
        onQueueUpdated();
      });
    }
  };

  const handleConvertedCelebration = async (leadId: number) => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    try {
      await updateLead(leadId, { status: 'converted' });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: 'converted' } : l))
      );
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to mark converted:', err);
    }
  };

  const getWordCount = (text?: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const unpitchedCount = leads.filter((l) => !l.pitch).length;

  const toneOptions = isYouTube
    ? [
        { id: 'collab', label: 'Sponsorship / Collab' },
        { id: 'value_offer', label: 'Free Value / Asset' },
        { id: 'direct', label: 'Direct Partnership' },
        { id: 'friendly', label: 'Friendly Connect' },
      ]
    : [
        { id: 'friendly', label: 'Friendly (<70w)' },
        { id: 'value_offer', label: 'Value / Free Audit' },
        { id: 'collab', label: 'Referral Partner' },
        { id: 'direct', label: 'Direct & Concise' },
      ];

  const isWaConnected = waState?.status === 'connected';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#121215] border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
            {isYouTube ? <Youtube className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isYouTube ? 'YouTube Creator Outreach Hub' : 'Google Maps Business Outreach Hub'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {leads.length} Leads
              </span>
              {isWaConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-white border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  WhatsApp Linked
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {isYouTube ? 'Draft customized pitches for content creators and influencers' : 'Draft personalized pitches for local businesses and agencies'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoMarkContacted}
              onChange={(e) => setAutoMarkContacted(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-700 text-white focus:ring-white accent-white"
            />
            <span>Auto-mark Contacted on dispatch</span>
          </label>

          {unpitchedCount > 0 && (
            <button
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${batchGenerating ? 'animate-spin' : ''}`} />
              <span>{batchGenerating ? 'Generating Pitches...' : `AI Pitch All (${unpitchedCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Interface */}
      {leads.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Leads Queue List */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {leads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const hasPitch = Boolean(lead.pitch || editedPitches[lead.id]);
              const words = getWordCount(editedPitches[lead.id] || lead.pitch);

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-zinc-850 border-white text-white shadow-md ring-1 ring-white/20'
                      : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{lead.name}</h4>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {lead.category || 'Prospect'} • {lead.address || lead.channel_handle || '—'}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Highlights Bar */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    {hasPitch ? (
                      <span className="text-zinc-300 font-medium flex items-center gap-1 text-[11px]">
                        <Check className="h-3 w-3 text-white" />
                        Pitch Ready ({words} words)
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-zinc-400" />
                        Needs draft
                      </span>
                    )}

                    <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                      {lead.subscriber_count ? (
                        <span className="font-mono text-zinc-300 font-semibold">
                          {formatNumber(lead.subscriber_count)} subs
                        </span>
                      ) : lead.rating ? (
                        <span className="flex items-center gap-0.5 text-zinc-300 font-semibold font-mono">
                          ★ {lead.rating}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Lead Detail & Outreach Dispatch */}
          {activeLead && (
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                      {isYouTube ? <Youtube className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      <span>{isYouTube ? 'YouTube Creator' : 'Google Places Lead'}</span>
                    </span>
                    <h3 className="text-lg font-bold text-white">{activeLead.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {activeLead.category} • {activeLead.address || activeLead.channel_handle || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeLead.website && (
                    <a
                      href={activeLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-800 transition-colors"
                      title={isYouTube ? 'Open YouTube Channel' : 'Open Website'}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleConvertedCelebration(activeLead.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition-all"
                  >
                    <span>Converted</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-xs">
                <div>
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">
                    {isYouTube ? 'Subscribers' : 'Star Rating'}
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {isYouTube ? formatNumber(activeLead.subscriber_count) : activeLead.rating ? `★ ${activeLead.rating} / 5.0` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">
                    {isYouTube ? 'Total Videos' : 'Reviews Count'}
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {isYouTube ? formatNumber(activeLead.video_count) : activeLead.user_ratings_total ? formatNumber(activeLead.user_ratings_total) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">
                    {isYouTube ? 'Total Views' : 'Phone Contact'}
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                    {isYouTube ? formatNumber(activeLead.view_count) : activeLead.phone || '—'}
                  </div>
                </div>
              </div>

              {/* Persona Selector & Guidance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Pitch Persona & Angle:</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedTone(opt.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selectedTone === opt.id
                          ? 'bg-white border-white text-zinc-950 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Custom guidance (e.g. mention automated booking funnel...)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-white"
                  />
                  <button
                    onClick={() => handleRegeneratePitch(activeLead)}
                    disabled={generatingId === activeLead.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${generatingId === activeLead.id ? 'animate-spin' : ''}`} />
                    <span>{generatingId === activeLead.id ? 'Writing...' : 'Generate with AI'}</span>
                  </button>
                </div>
              </div>

              {/* Pitch Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Personalized Outreach Message Draft:</span>
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {getWordCount(editedPitches[activeLead.id])} / 80 words
                    </span>
                    <button
                      onClick={() => handleSavePitch(activeLead.id)}
                      className="text-xs text-zinc-300 hover:text-white font-medium hover:underline"
                    >
                      Save edits
                    </button>
                  </div>
                </div>

                <textarea
                  value={editedPitches[activeLead.id] || ''}
                  onChange={(e) => handlePitchChange(activeLead.id, e.target.value)}
                  placeholder="Pitch will appear here after generation..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-sans leading-relaxed focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  onClick={() => handleCopyPitch(activeLead.id, editedPitches[activeLead.id] || activeLead.pitch || '')}
                  disabled={!editedPitches[activeLead.id] && !activeLead.pitch}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{copiedId === activeLead.id ? 'Copied to Clipboard! ✓' : 'Copy Message'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* WhatsApp Direct Send */}
                  {activeLead.phone && (
                    <button
                      onClick={() => handleSendDirectWhatsApp(activeLead, editedPitches[activeLead.id] || activeLead.pitch || '')}
                      disabled={sendingWaId === activeLead.id || (!editedPitches[activeLead.id] && !activeLead.pitch)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-40"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{sendingWaId === activeLead.id ? 'Sending...' : 'Send WhatsApp'}</span>
                    </button>
                  )}

                  {/* Email Send */}
                  {activeLead.contact_email && (
                    <button
                      onClick={() => handleSendEmail(activeLead, editedPitches[activeLead.id] || activeLead.pitch || '')}
                      disabled={!editedPitches[activeLead.id] && !activeLead.pitch}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
                    >
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Email</span>
                    </button>
                  )}
                </div>
              </div>

              {waFeedback && waFeedback.id === activeLead.id && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
                  <span>{waFeedback.msg}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <div className="p-12 rounded-2xl bg-[#121215] border border-dashed border-zinc-800 text-center space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-400 w-fit mx-auto border border-zinc-800">
              <Send className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-base font-bold text-white">Outreach Queue is Empty</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Find leads via Google Places or YouTube Search and save them to load your personalized outreach pipeline.
            </p>
          </div>
        )
      )}
    </div>
  );
};
