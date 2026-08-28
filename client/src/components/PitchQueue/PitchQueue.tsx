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
  Flame,
  Phone,
  UserCheck,
  Star,
  Users,
  Video,
  Eye,
  QrCode,
  Zap,
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

      // Initialize edited pitches state
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

      // Check WhatsApp Status
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
      await batchGeneratePitches(unpitched, selectedTone);
      await fetchQueue();
      onQueueUpdated();
    } catch (err) {
      console.error('Batch generation failed:', err);
    } finally {
      setBatchGenerating(false);
    }
  };

  const markContactedAction = async (leadId: number) => {
    if (autoMarkContacted) {
      try {
        await updateLead(leadId, { markContacted: true, status: 'contacted' });
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: 'contacted' } : l))
        );
        onQueueUpdated();
      } catch (err) {
        console.error('Failed to mark contacted:', err);
      }
    }
  };

  const handleCopy = (lead: Lead) => {
    const text = editedPitches[lead.id] || lead.pitch || '';
    navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
    markContactedAction(lead.id);
  };

  const handleOpenEmail = (lead: Lead) => {
    const text = editedPitches[lead.id] || lead.pitch || '';
    const email = lead.contact_email || '';
    const subject = isYouTube
      ? `Collaboration & partnership with ${lead.name}`
      : `Quick question regarding ${lead.name}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(mailtoUrl, '_blank');
    markContactedAction(lead.id);
  };

  const handleOpenWhatsApp = (lead: Lead) => {
    const text = editedPitches[lead.id] || lead.pitch || '';
    const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    markContactedAction(lead.id);
  };

  const handleDirectWhatsAppSend = async (lead: Lead) => {
    const phone = lead.phone || '';
    const text = editedPitches[lead.id] || lead.pitch || '';

    if (!phone) {
      setWaFeedback({ id: lead.id, success: false, msg: 'No phone number for this lead.' });
      return;
    }
    if (!text) {
      setWaFeedback({ id: lead.id, success: false, msg: 'Please generate or write a pitch first.' });
      return;
    }

    setSendingWaId(lead.id);
    setWaFeedback(null);

    try {
      const res = await sendDirectWhatsAppMessage({
        phone,
        message: text,
        leadId: lead.id,
      });

      if (res.success) {
        setWaFeedback({ id: lead.id, success: true, msg: 'Message sent successfully via linked WhatsApp!' });
        markContactedAction(lead.id);
      } else {
        setWaFeedback({ id: lead.id, success: false, msg: res.message || 'Failed to send.' });
      }
    } catch (err: any) {
      setWaFeedback({
        id: lead.id,
        success: false,
        msg: err.response?.data?.message || err.message || 'WhatsApp sending failed. Ensure WhatsApp is connected in Settings.',
      });
    } finally {
      setSendingWaId(null);
    }
  };

  const handleConvertedCelebration = async (leadId: number) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    await updateLead(leadId, { status: 'converted' });
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: 'converted' } : l)));
    onQueueUpdated();
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
        { id: 'collab', label: '🤝 Sponsorship / Collab' },
        { id: 'value_offer', label: '💡 Free Value / Asset' },
        { id: 'direct', label: '🎯 Direct Partnership' },
        { id: 'friendly', label: '💬 Friendly Connect' },
      ]
    : [
        { id: 'friendly', label: '👋 Friendly (<70w)' },
        { id: 'value_offer', label: '📈 Value / Free Audit' },
        { id: 'collab', label: '🤝 Referral Partner' },
        { id: 'direct', label: '🎯 Direct & Concise' },
      ];

  const isWaConnected = waState?.status === 'connected';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${isYouTube ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'}`}>
            {isYouTube ? <Youtube className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{isYouTube ? 'YouTube Creator Outreach Hub' : 'Google Maps Business Outreach Hub'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isYouTube ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'}`}>
                {leads.length} Leads
              </span>
              {isWaConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  WhatsApp Linked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isYouTube ? 'Draft customized pitches for content creators and influencers' : 'Draft personalized pitches for local businesses and agencies'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoMarkContacted}
              onChange={(e) => setAutoMarkContacted(e.target.checked)}
              className={`rounded bg-slate-950 border-slate-700 ${isYouTube ? 'text-rose-500 focus:ring-rose-500 accent-rose-500' : 'text-sky-500 focus:ring-sky-500 accent-sky-500'}`}
            />
            <span>Auto-mark Contacted on dispatch</span>
          </label>

          {unpitchedCount > 0 && (
            <button
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 ${
                isYouTube
                  ? 'bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-rose-600/20'
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-600/20'
              }`}
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
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? isYouTube
                        ? 'bg-slate-900 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
                        : 'bg-slate-900 border-sky-500/60 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{lead.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {lead.category || 'Prospect'} • {lead.address || lead.channel_handle || '—'}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize shrink-0 ${
                        lead.status === 'converted'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : lead.status === 'contacted'
                          ? 'bg-amber-500/20 text-amber-300'
                          : lead.status === 'replied'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Highlights Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {hasPitch ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                        <Check className="h-3 w-3" />
                        Pitch Ready ({words} words)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        Needs draft
                      </span>
                    )}

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      {lead.subscriber_count ? (
                        <span className="font-mono text-rose-400 font-semibold">
                          {formatNumber(lead.subscriber_count)} subs
                        </span>
                      ) : lead.rating ? (
                        <span className="flex items-center gap-0.5 text-amber-400 font-semibold font-mono">
                          <Star className="h-2.5 w-2.5 fill-amber-400" />
                          {lead.rating}★
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
            <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        isYouTube
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {isYouTube ? <Youtube className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      <span>{isYouTube ? 'YouTube Creator' : 'Google Places Lead'}</span>
                    </span>
                    <h3 className="text-lg font-bold text-white">{activeLead.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeLead.category} • {activeLead.address || activeLead.channel_handle || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeLead.website && (
                    <a
                      href={activeLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                      title={isYouTube ? 'Open YouTube Channel' : 'Open Website'}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleConvertedCelebration(activeLead.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all"
                  >
                    <Flame className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Converted</span>
                  </button>
                </div>
              </div>

              {/* Specific Stats Row */}
              {isYouTube ? (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px]">Subscribers</div>
                    <div className="font-bold text-white font-mono">{formatNumber(activeLead.subscriber_count)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Total Videos</div>
                    <div className="font-bold text-white font-mono">{activeLead.video_count?.toLocaleString() || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Total Views</div>
                    <div className="font-bold text-white font-mono">{formatNumber(activeLead.view_count)}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px]">Star Rating</div>
                    <div className="font-bold text-amber-400 font-mono flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>{activeLead.rating || '—'} / 5.0</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Reviews Count</div>
                    <div className="font-bold text-white font-mono">{activeLead.user_ratings_total?.toLocaleString() || '0'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Phone Contact</div>
                    <div className="font-bold text-white font-mono text-[11px] truncate">{activeLead.phone || 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Tone & AI Prompt Controller */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Sparkles className={`h-3.5 w-3.5 ${isYouTube ? 'text-rose-400' : 'text-sky-400'}`} />
                    <span>Pitch Persona & Angle:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {toneOptions.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedTone(tone.id as PitchTone)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTone === tone.id
                            ? isYouTube
                              ? 'bg-rose-600 text-white font-semibold shadow'
                              : 'bg-sky-600 text-white font-semibold shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      isYouTube
                        ? 'Custom guidance (e.g. mention sponsor fee or affiliate trial...)'
                        : 'Custom guidance (e.g. mention automated booking funnel...)'
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    onClick={() => handleRegeneratePitch(activeLead)}
                    disabled={generatingId === activeLead.id}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold shadow transition-all disabled:opacity-50 ${
                      isYouTube ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sky-600 hover:bg-sky-500'
                    }`}
                  >
                    <RefreshCw className={`h-3 w-3 ${generatingId === activeLead.id ? 'animate-spin' : ''}`} />
                    <span>{generatingId === activeLead.id ? 'Drafting...' : 'Generate with AI'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Pitch Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-sky-400" />
                    Personalized Outreach Message Draft:
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono ${
                        getWordCount(editedPitches[activeLead.id] || activeLead.pitch) > 80
                          ? 'text-amber-400 font-bold'
                          : 'text-emerald-400'
                      }`}
                    >
                      {getWordCount(editedPitches[activeLead.id] || activeLead.pitch)} / 80 words
                    </span>
                    <button
                      onClick={() => handleSavePitch(activeLead.id)}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Save edits
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={editedPitches[activeLead.id] ?? activeLead.pitch ?? ''}
                  onChange={(e) => handlePitchChange(activeLead.id, e.target.value)}
                  placeholder="Click 'Generate with AI' above or type your personalized message here..."
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed font-sans transition-all"
                />
              </div>

              {/* Feedback toast for WhatsApp direct sending */}
              {waFeedback && waFeedback.id === activeLead.id && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    waFeedback.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}
                >
                  {waFeedback.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{waFeedback.msg}</span>
                </div>
              )}

              {/* 1-Click Dispatch Actions */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">1-Click Dispatch Actions:</span>
                  <span className="text-[11px] text-slate-500">
                    {isWaConnected ? '🟢 WhatsApp Connected (Direct Send active)' : 'Open draft with pre-filled copy'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(activeLead)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 shadow transition-all"
                  >
                    {copiedId === activeLead.id ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-sky-400" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>

                  {/* Mailto Button */}
                  <button
                    onClick={() => handleOpenEmail(activeLead)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Open Email (mailto:)</span>
                  </button>

                  {/* WhatsApp Direct Send or YouTube Channel */}
                  {isYouTube ? (
                    <a
                      href={activeLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markContactedAction(activeLead.id)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all"
                    >
                      <Youtube className="h-4 w-4" />
                      <span>Open YT Channel</span>
                    </a>
                  ) : isWaConnected ? (
                    <button
                      onClick={() => handleDirectWhatsAppSend(activeLead)}
                      disabled={sendingWaId === activeLead.id}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                    >
                      <MessageCircle className={`h-4 w-4 ${sendingWaId === activeLead.id ? 'animate-spin' : ''}`} />
                      <span>{sendingWaId === activeLead.id ? 'Sending...' : 'Direct Send on WhatsApp ⚡'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenWhatsApp(activeLead)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Open WhatsApp (wa.me)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
          <Send className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">
            {isYouTube ? 'No YouTube Creators in Outreach Queue' : 'No Business Leads in Outreach Queue'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isYouTube
              ? 'Find creators in the "Find YT Channels" tab, save them, and they will appear here ready for AI pitch generation.'
              : 'Find businesses in the "Find Business Leads" tab, save them, and they will appear here ready for outreach.'}
          </p>
        </div>
      ) : null}
    </div>
  );
};
