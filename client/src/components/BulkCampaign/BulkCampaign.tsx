import React, { useState, useEffect, useRef } from 'react';
import {
  getLeads,
  updateLead,
  batchGeneratePitches,
  generatePitch,
  removeFromCampaignQueue,
  clearCampaignQueue,
  getWhatsAppStatus,
  getWhatsAppAccounts,
  startWhatsAppBatchCampaign,
  getWhatsAppBatchStatus,
  stopWhatsAppBatchCampaign,
  sendDirectWhatsAppMessage,
  sendDirectEmailMessage,
  sendBatchEmailMessages,
} from '../../services/api';
import { Lead, OfferedService, PitchTone, WhatsAppStatusState, WhatsAppAccountState, BatchWhatsAppProgress } from '../../types';
import {
  Send,
  Sparkles,
  Mail,
  Copy,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Edit3,
  RefreshCw,
  Code,
  Video,
  Palette,
  TrendingUp,
  Bot,
  Zap,
  Globe,
  Instagram,
  Phone,
  Check,
  Flame,
  ArrowRight,
  ListFilter,
  Play,
  RotateCcw,
  MessageCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Square,
  AlertTriangle,
  X,
  FileText,
  Save,
  CheckSquare,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BulkCampaignProps {
  onCampaignUpdated: () => void;
}

export const BulkCampaign: React.FC<BulkCampaignProps> = ({ onCampaignUpdated }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<OfferedService>('whatsapp_ai_agent');
  const [selectedTone, setSelectedTone] = useState<PitchTone>('friendly');
  const [customGuidance, setCustomGuidance] = useState('');
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Active Lead for the Right-Side Message Editor Drawer
  const [activeEditingLead, setActiveEditingLead] = useState<Lead | null>(null);
  const [editingPitchText, setEditingPitchText] = useState('');
  const [savingPitch, setSavingPitch] = useState(false);
  const [generatingSinglePitch, setGeneratingSinglePitch] = useState(false);
  const [sendingDirectWhatsApp, setSendingDirectWhatsApp] = useState(false);
  const [sendingDirectEmail, setSendingDirectEmail] = useState(false);
  const [batchEmailStarting, setBatchEmailStarting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // WhatsApp states & Anti-Ban batch engine
  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [waAccounts, setWaAccounts] = useState<WhatsAppAccountState[]>([]);
  const [selectedWhatsAppSender, setSelectedWhatsAppSender] = useState<string>('all');
  const [minDelay, setMinDelay] = useState<number>(30);
  const [maxDelay, setMaxDelay] = useState<number>(45);
  const [batchProgress, setBatchProgress] = useState<BatchWhatsAppProgress | null>(null);
  const [batchStarting, setBatchStarting] = useState(false);
  const pollingRef = useRef<any>(null);

  // Stepper mode state for 1-click sequential mailing
  const [stepperIndex, setStepperIndex] = useState<number | null>(null);

  const fetchCampaignLeads = async () => {
    setLoading(true);
    try {
      const res = await getLeads({ inCampaign: true, limit: 200 });
      setLeads(res.leads);

      if (selectedIds.length === 0 && res.leads.length > 0) {
        setSelectedIds(res.leads.map((l) => l.id));
      }

      try {
        const accounts = await getWhatsAppAccounts();
        if (Array.isArray(accounts)) {
          setWaAccounts(accounts);
        }
      } catch (e) {}

      const wa = await getWhatsAppStatus();
      setWaState(wa);

      const bStatus = await getWhatsAppBatchStatus();
      setBatchProgress(bStatus);
      if (bStatus.isRunning) {
        startBatchPolling();
      }
    } catch (err) {
      console.error('Failed to load campaign leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignLeads();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startBatchPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const bStatus = await getWhatsAppBatchStatus();
        setBatchProgress(bStatus);
        if (!bStatus.isRunning) {
          stopBatchPolling();
          fetchCampaignLeads();
          onCampaignUpdated();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
      } catch (err) {
        // ignore
      }
    }, 1000);
  };

  const stopBatchPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleOpenMessageDrawer = (lead: Lead) => {
    setActiveEditingLead(lead);
    setEditingPitchText(lead.pitch || '');
    setActionSuccessMsg(null);
  };

  const handleSaveMessage = async () => {
    if (!activeEditingLead) return;
    setSavingPitch(true);
    try {
      await updateLead(activeEditingLead.id, {
        pitch: editingPitchText.trim(),
        pitch_status: editingPitchText.trim() ? 'ready' : 'draft',
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeEditingLead.id
            ? { ...l, pitch: editingPitchText.trim(), pitch_status: editingPitchText.trim() ? 'ready' : 'draft' }
            : l
        )
      );
      setActiveEditingLead((prev) =>
        prev ? { ...prev, pitch: editingPitchText.trim(), pitch_status: editingPitchText.trim() ? 'ready' : 'draft' } : null
      );
      setActionSuccessMsg('Message saved successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to save pitch:', err);
    } finally {
      setSavingPitch(false);
    }
  };

  const handleGenerateSinglePitch = async () => {
    if (!activeEditingLead) return;
    setGeneratingSinglePitch(true);
    try {
      const res = await generatePitch({
        lead: activeEditingLead,
        offeredService: selectedService,
        tone: selectedTone,
        customInstructions: customGuidance.trim() || undefined,
      });

      setEditingPitchText(res.pitch);
      await updateLead(activeEditingLead.id, { pitch: res.pitch, pitch_status: 'ready' });

      setLeads((prev) =>
        prev.map((l) => (l.id === activeEditingLead.id ? { ...l, pitch: res.pitch, pitch_status: 'ready' } : l))
      );
      setActiveEditingLead((prev) => (prev ? { ...prev, pitch: res.pitch, pitch_status: 'ready' } : null));
      setActionSuccessMsg('✨ AI drafted new custom message!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to generate pitch:', err);
    } finally {
      setGeneratingSinglePitch(false);
    }
  };

  const handleSendDirectWhatsAppFromDrawer = async () => {
    if (!activeEditingLead || !activeEditingLead.phone || !editingPitchText.trim()) {
      setActionSuccessMsg('⚠️ Phone number and drafted message are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }

    setSendingDirectWhatsApp(true);
    try {
      const res = await sendDirectWhatsAppMessage({
        leadId: activeEditingLead.id,
        phone: activeEditingLead.phone,
        message: editingPitchText.trim(),
      });

      if (res.success) {
        const sentLeadId = activeEditingLead.id;
        setActionSuccessMsg(`✅ Message sent to ${activeEditingLead.name} & removed from Bulk Queue! 🚀`);
        setLeads((prev) => prev.filter((l) => l.id !== sentLeadId));
        setSelectedIds((prev) => prev.filter((i) => i !== sentLeadId));
        setActiveEditingLead(null);
        onCampaignUpdated();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'WhatsApp sending failed. Check Settings.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send message.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setSendingDirectWhatsApp(false);
    }
  };

  const handleStartWhatsAppAntiBanBatch = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    const validLeads = targetLeads
      .filter((l) => Boolean(l.phone && l.pitch))
      .map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone!,
        message: l.pitch!,
      }));

    if (validLeads.length === 0) {
      alert('Selected leads must have a Phone number and a Message drafted. Please write/generate messages first!');
      return;
    }

    if (
      !window.confirm(
        `Start Anti-Ban WhatsApp Campaign for ${validLeads.length} leads with a ${minDelay}-${maxDelay}s human delay between each message?`
      )
    ) {
      return;
    }

    setBatchStarting(true);
    try {
      const allowedSessionIds = selectedWhatsAppSender === 'all' ? undefined : [selectedWhatsAppSender];
      const res = await startWhatsAppBatchCampaign(validLeads, minDelay, maxDelay, allowedSessionIds);
      if (res.success) {
        startBatchPolling();
      } else {
        alert(res.message || 'Failed to start campaign.');
      }
    } catch (err: any) {
      console.error('Failed to start WhatsApp campaign:', err);
      alert(err.response?.data?.message || err.message || 'Failed to start WhatsApp campaign.');
    } finally {
      setBatchStarting(false);
    }
  };

  const handleStopWhatsAppBatch = async () => {
    try {
      await stopWhatsAppBatchCampaign();
      stopBatchPolling();
      const bStatus = await getWhatsAppBatchStatus();
      setBatchProgress(bStatus);
    } catch (err) {
      console.error('Failed to stop batch:', err);
    }
  };

  const handleBatchAIGenerateForSelected = async () => {
    const idsToGen = selectedIds.length > 0 ? selectedIds : leads.map((l) => l.id);
    if (idsToGen.length === 0) return;
    setGeneratingBatch(true);
    try {
      await batchGeneratePitches(idsToGen, selectedTone, selectedService, customGuidance.trim() || undefined);
      await fetchCampaignLeads();
      onCampaignUpdated();
      setActionSuccessMsg(`✨ Generated custom messages for ${idsToGen.length} leads!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to batch generate:', err);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleRemoveSelected = async () => {
    const idsToRemove = selectedIds.length > 0 ? selectedIds : [];
    if (idsToRemove.length === 0) return;
    try {
      await removeFromCampaignQueue(idsToRemove);
      setLeads((prev) => prev.filter((l) => !idsToRemove.includes(l.id)));
      setSelectedIds([]);
      if (activeEditingLead && idsToRemove.includes(activeEditingLead.id)) {
        setActiveEditingLead(null);
      }
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to remove from campaign:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all prospects from this bulk campaign queue?')) return;
    try {
      await clearCampaignQueue();
      setLeads([]);
      setSelectedIds([]);
      setActiveEditingLead(null);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to clear campaign:', err);
    }
  };

  const handleSendDirectEmailFromDrawer = async () => {
    if (!activeEditingLead || !activeEditingLead.contact_email || !editingPitchText.trim()) {
      setActionSuccessMsg('⚠️ Valid email address and drafted message are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }

    setSendingDirectEmail(true);
    try {
      const subject = `Quick question regarding ${activeEditingLead.name}`;
      const res = await sendDirectEmailMessage({
        leadId: activeEditingLead.id,
        to: activeEditingLead.contact_email,
        subject,
        message: editingPitchText.trim(),
      });

      if (res.success) {
        const sentLeadId = activeEditingLead.id;
        setActionSuccessMsg(`✅ Email dispatched to ${activeEditingLead.name} & removed from Bulk Queue! 🚀`);
        setLeads((prev) => prev.filter((l) => l.id !== sentLeadId));
        setSelectedIds((prev) => prev.filter((i) => i !== sentLeadId));
        setActiveEditingLead(null);
        onCampaignUpdated();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Email dispatch failed. Please check SMTP in Settings.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send email. Configure SMTP in Settings.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setSendingDirectEmail(false);
    }
  };

  const handleOpenInGmail = async (lead?: Lead) => {
    const targetLead = lead || activeEditingLead;
    if (!targetLead || !targetLead.contact_email) {
      alert('This lead does not have a contact email.');
      return;
    }

    const messageText = targetLead.id === activeEditingLead?.id ? editingPitchText : (targetLead.pitch || '');
    const subject = `Quick inquiry regarding ${targetLead.name}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      targetLead.contact_email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;

    // Open Gmail Compose in new window
    window.open(gmailUrl, '_blank');

    // Automatically mark as contacted in CRM & remove from Bulk Queue
    try {
      await updateLead(targetLead.id, {
        status: 'contacted',
        in_campaign_queue: false,
        markContacted: true,
      });
      const sentId = targetLead.id;
      setLeads((prev) => prev.filter((l) => l.id !== sentId));
      setSelectedIds((prev) => prev.filter((i) => i !== sentId));
      if (activeEditingLead?.id === sentId) {
        setActiveEditingLead(null);
      }
      setActionSuccessMsg(`📬 Opened in Gmail & marked as Contacted! 🚀`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to mark contacted on gmail open:', err);
    }
  };

  const handleStartBatchEmail = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    const validLeads = targetLeads
      .filter((l) => Boolean(l.contact_email && l.pitch))
      .map((l) => ({
        id: l.id,
        name: l.name,
        email: l.contact_email!,
        subject: `Quick question regarding ${l.name}`,
        message: l.pitch!,
      }));

    if (validLeads.length === 0) {
      setActionSuccessMsg('⚠️ Selected leads must have an Email and a drafted Message!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      return;
    }

    setBatchEmailStarting(true);
    try {
      const res = await sendBatchEmailMessages(validLeads);
      if (res.success) {
        const sentIds = validLeads.map((v) => v.id);
        setActionSuccessMsg(`🚀 Batch emails dispatched for ${validLeads.length} leads & removed from Queue!`);
        setLeads((prev) => prev.filter((l) => !sentIds.includes(l.id)));
        setSelectedIds((prev) => prev.filter((i) => !sentIds.includes(i)));
        if (activeEditingLead && sentIds.includes(activeEditingLead.id)) {
          setActiveEditingLead(null);
        }
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => setActionSuccessMsg(null), 4500);
        onCampaignUpdated();
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Failed to start batch email.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send batch email. Check SMTP in Settings.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setBatchEmailStarting(false);
    }
  };

  const handleCleanContactedLeads = async () => {
    const contacted = leads.filter((l) => l.status !== 'not_contacted');
    if (contacted.length === 0) {
      setActionSuccessMsg('✨ All leads in queue are already new/uncontacted!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    const ids = contacted.map((l) => l.id);
    await removeFromCampaignQueue(ids);
    setLeads((prev) => prev.filter((l) => l.status === 'not_contacted'));
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    if (activeEditingLead && ids.includes(activeEditingLead.id)) {
      setActiveEditingLead(null);
    }
    setActionSuccessMsg(`🧹 Cleaned ${ids.length} contacted leads from queue!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
    onCampaignUpdated();
  };

  const handleCopyPitch = (lead: Lead) => {
    navigator.clipboard.writeText(lead.pitch || '');
    updateLead(lead.id, { status: 'contacted', markContacted: true, in_campaign_queue: false });
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelectedIds((prev) => prev.filter((i) => i !== lead.id));
    if (activeEditingLead?.id === lead.id) setActiveEditingLead(null);
    setActionSuccessMsg(`Copied message for ${lead.name} & removed from Queue! 🚀`);
    setTimeout(() => setActionSuccessMsg(null), 2500);
    onCampaignUpdated();
  };

  const handleCopySelectedDrafts = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (targetLeads.length === 0) return;

    const formatted = targetLeads
      .map(
        (l) =>
          `Recipient: ${l.name} <${l.contact_email || 'No email'}> | Phone: ${l.phone || 'N/A'}\nMessage:\n${l.pitch || 'No message'}\n-----------------------------------\n`
      )
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 3000);
  };

  const handleBatchOpenInGmail = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id) && l.contact_email);
    if (targetLeads.length === 0) {
      setActionSuccessMsg('⚠️ None of the selected leads have an email address.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    for (const lead of targetLeads) {
      const subject = `Quick inquiry regarding ${lead.name}`;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        lead.contact_email!
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(lead.pitch || '')}`;
      window.open(gmailUrl, '_blank');
      await updateLead(lead.id, { status: 'contacted', in_campaign_queue: false, markContacted: true }).catch(() => {});
    }
    const ids = targetLeads.map((l) => l.id);
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    if (activeEditingLead && ids.includes(activeEditingLead.id)) setActiveEditingLead(null);
    setActionSuccessMsg(`📬 Opened ${targetLeads.length} leads in Gmail & marked as Contacted! 🚀`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    onCampaignUpdated();
  };

  const handleSendSingleEmailDirect = async (lead: Lead) => {
    if (!lead.contact_email || !lead.pitch) {
      setActionSuccessMsg('⚠️ Valid email and drafted pitch are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    try {
      const subject = `Quick question regarding ${lead.name}`;
      const res = await sendDirectEmailMessage({
        leadId: lead.id,
        to: lead.contact_email,
        subject,
        message: lead.pitch,
      });
      if (res.success) {
        setActionSuccessMsg(`✅ Email dispatched automatically to ${lead.name}!`);
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: 'contacted' } : l)));
        onCampaignUpdated();
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 3500);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Email dispatch failed'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to dispatch email'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const startSequentialMailer = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (targetLeads.length === 0) return;
    setStepperIndex(0);
    handleSendSingleEmailDirect(targetLeads[0]);
  };

  const advanceSequentialMailer = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (stepperIndex === null) return;
    const nextIdx = stepperIndex + 1;
    if (nextIdx < targetLeads.length) {
      setStepperIndex(nextIdx);
      handleSendSingleEmailDirect(targetLeads[nextIdx]);
    } else {
      setStepperIndex(null);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  };

  const isWaConnected = waState?.status === 'connected';
  const readyPitchesCount = leads.filter((l) => Boolean(l.pitch)).length;
  const contactedCount = leads.filter((l) => l.status === 'contacted' || l.status === 'replied' || l.status === 'converted').length;
  const wordCount = editingPitchText.trim() ? editingPitchText.trim().split(/\s+/).length : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
                <Send className="h-3.5 w-3.5 text-zinc-400" />
                <span>Bulk Campaign & Multi-Channel Dispatch</span>
              </span>

              {isWaConnected && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 text-zinc-300 border border-zinc-800"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    Safety Cap: {waState?.sentToday || 0} / 40 Sent Today
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Campaign Queue ({leads.length} Leads)
            </h2>
            <p className="text-xs text-zinc-400">
              Select leads to compose custom messages, launch <strong>Safe WhatsApp Automation (30-45s Delay)</strong>, or dispatch <strong>Direct Cold Emails</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {leads.length > 0 && (
              <>
                {contactedCount > 0 && (
                  <button
                    onClick={handleCleanContactedLeads}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-colors shadow"
                    title="Remove already messaged/contacted prospects from this queue"
                  >
                    <span>Clean Sent ({contactedCount})</span>
                  </button>
                )}

                <button
                  onClick={handleClearAll}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
                >
                  Clear Queue
                </button>

                <button
                  onClick={handleCopySelectedDrafts}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all shadow disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{copiedBatch ? 'Copied Selected!' : `Copy (${selectedIds.length})`}</span>
                </button>

                <button
                  onClick={handleBatchOpenInGmail}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
                  title="Open pre-filled Gmail Compose windows with 1-click"
                >
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Gmail Web ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handleStartBatchEmail}
                  disabled={batchEmailStarting || selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition-all disabled:opacity-40 shadow"
                  title="Send emails automatically in the background via SMTP"
                >
                  <Mail className={`h-3.5 w-3.5 ${batchEmailStarting ? 'animate-spin' : ''}`} />
                  <span>{batchEmailStarting ? 'Auto-Email...' : `Auto-Send (${selectedIds.length})`}</span>
                </button>

                {/* WhatsApp Account Selector (If multiple connected) */}
                {waAccounts.filter((a) => a.status === 'connected').length > 1 && (
                  <select
                    value={selectedWhatsAppSender}
                    onChange={(e) => setSelectedWhatsAppSender(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-white text-xs font-semibold focus:border-white"
                  >
                    <option value="all">
                      🔄 Smart Round-Robin ({waAccounts.filter((a) => a.status === 'connected').length} WhatsApp Accounts)
                    </option>
                    {waAccounts
                      .filter((a) => a.status === 'connected')
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          📱 {acc.name} ({acc.userPhone || acc.id})
                        </option>
                      ))}
                  </select>
                )}

                <button
                  onClick={handleStartWhatsAppAntiBanBatch}
                  disabled={
                    batchStarting ||
                    batchProgress?.isRunning ||
                    waAccounts.filter((a) => a.status === 'connected').length === 0 ||
                    selectedIds.length === 0
                  }
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow ${
                    waAccounts.some((a) => a.status === 'connected') && selectedIds.length > 0
                      ? 'bg-white hover:bg-zinc-200 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    {batchProgress?.isRunning
                      ? 'Campaign Running...'
                      : waAccounts.some((a) => a.status === 'connected')
                      ? `Launch WhatsApp (${selectedIds.length})`
                      : 'Link WhatsApp in Settings'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 40 Messages Daily Safety Limit Alert */}
        {(waState?.sentToday || 0) >= 40 && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <span>
                <strong>🛡️ Anti-Ban Safety Limit Reached (40/40 Messages Sent Today):</strong> Auto-sending is paused on this WhatsApp number to protect it from restrictions. Link a new WhatsApp number in Settings or use 1-Click WhatsApp ↗.
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats Bar */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Total in Queue:</span>
              <span className="font-bold text-white font-mono">{leads.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Selected:</span>
              <span className="font-bold text-white font-mono">{selectedIds.length} Leads</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Messages Ready:</span>
              <span className="font-bold text-white font-mono">{readyPitchesCount} / {leads.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400">Sent Progress:</span>
              <span className="font-bold text-white font-mono">{contactedCount} / {leads.length}</span>
            </div>
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* WHATSAPP ANTI-BAN MONITOR (When Running) */}
      {batchProgress?.isRunning && (
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-700 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative p-3 rounded-2xl bg-zinc-900 text-white border border-zinc-700">
                <ShieldCheck className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">WhatsApp Anti-Ban Campaign in Progress</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-white border border-zinc-700">
                    {batchProgress.currentIndex} / {batchProgress.totalCount} Leads
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {batchProgress.statusMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {batchProgress.secondsRemaining > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono">
                  <Clock className="h-4 w-4 animate-spin text-white" />
                  <span>Next send in: <strong className="text-white text-sm">{batchProgress.secondsRemaining}s</strong></span>
                </div>
              )}

              <button
                onClick={handleStopWhatsAppBatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 shadow transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-white" />
                <span>Stop Campaign</span>
              </button>
            </div>
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{
                width: `${batchProgress.totalCount > 0 ? (batchProgress.currentIndex / batchProgress.totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sequential Stepper Modal / Floating Bar for Email */}
      {stepperIndex !== null && leads[stepperIndex] && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-700 shadow-xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-900 text-white font-bold text-xs border border-zinc-800">
              {stepperIndex + 1} / {leads.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Dispatching: {leads[stepperIndex].name}</span>
                <span className="text-zinc-400 font-mono text-[11px]">({leads[stepperIndex].contact_email || 'No email'})</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                {leads[stepperIndex].pitch || 'No message drafted'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendSingleEmailDirect(leads[stepperIndex])}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750"
            >
              Re-send Email
            </button>
            <button
              onClick={advanceSequentialMailer}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow"
            >
              <span>{stepperIndex + 1 === leads.length ? 'Finish Campaign' : 'Next Lead ➔'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Control Strip: Multi-Select Actions & Fast Pitch Generator */}
      {leads.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-750 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-white" />
              <span>{selectedIds.length === leads.length ? 'Deselect All' : 'Select All Leads'}</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleRemoveSelected}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Service Dropdown & Pills */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as OfferedService)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-white font-semibold"
              >
                <option value="whatsapp_ai_agent">WhatsApp AI Agent & 24/7 Bot</option>
                <option value="website_design">Web Design / Redesign</option>
                <option value="all_in_one_bundle">All-in-One Growth Bundle (Web + Bot + SEO)</option>
                <option value="ai_automation">AI Automation & Customer Assistant</option>
                <option value="content_creation_reels">Short Reels / Video Promo</option>
                <option value="gmb_local_seo">Google Maps Local SEO</option>
                <option value="branding_logo">Visual Branding / Logo</option>
                <option value="paid_ads">Meta & Google Paid Ads</option>
                <option value="social_media_management">Social Media Management</option>
              </select>
            </div>

            <button
              onClick={handleBatchAIGenerateForSelected}
              disabled={generatingBatch || selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow transition-all disabled:opacity-40"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generatingBatch ? 'animate-spin' : ''}`} />
              <span>{generatingBatch ? 'Drafting...' : `AI Generate for Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Table on Left + Message Composer Drawer on Right */}
      {leads.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean, Compact Lead Table */}
          <div className={`${activeEditingLead ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all space-y-3`}>
            <div className="overflow-hidden rounded-2xl bg-[#121215] border border-zinc-800 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
                    <tr>
                      <th
                        className="py-3 px-3.5 w-10 text-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.length === leads.length && leads.length > 0}
                          readOnly
                          className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 cursor-pointer pointer-events-none accent-white"
                        />
                      </th>
                      <th className="py-3 px-4">Lead & Business</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Website & Social</th>
                      <th className="py-3 px-3">Message Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {leads.map((lead) => {
                      const isSelected = selectedIds.includes(lead.id);
                      const isEditing = activeEditingLead?.id === lead.id;
                      const hasPitch = Boolean(lead.pitch && lead.pitch.trim());

                      return (
                        <tr
                          key={lead.id}
                          className={`transition-colors cursor-pointer ${
                            isEditing
                              ? 'bg-zinc-850 border-l-4 border-l-white'
                              : isSelected
                              ? 'bg-zinc-900/40 hover:bg-zinc-900/60'
                              : 'hover:bg-zinc-900/30'
                          }`}
                          onClick={() => handleOpenMessageDrawer(lead)}
                        >
                          <td
                            className="py-3 px-3.5 text-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(lead.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 cursor-pointer pointer-events-none accent-white"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{lead.name}</span>
                              {lead.rating && (
                                <span className="text-[10px] text-zinc-300 font-mono font-semibold">★ {lead.rating}</span>
                              )}
                              {lead.status === 'not_contacted' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  NEW
                                </span>
                              ) : lead.status === 'contacted' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  ✓ Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  {lead.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {lead.category || 'Lead'} {lead.address ? `• ${lead.address.split(',')[0]}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-0.5 font-mono text-[10px]">
                              {lead.phone ? (
                                <div className="text-zinc-200 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5 text-zinc-500" />
                                  <span>{lead.phone}</span>
                                </div>
                              ) : null}
                              {lead.contact_email ? (
                                <div className="text-zinc-400 flex items-center gap-1 truncate max-w-[150px]">
                                  <Mail className="h-2.5 w-2.5 text-zinc-500" />
                                  <span>{lead.contact_email}</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {lead.has_website && lead.website ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                  <Globe className="h-2.5 w-2.5" /> Has Website
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                                  <Globe className="h-2.5 w-2.5" /> No Website
                                </span>
                              )}

                              {lead.instagram_handle && (
                                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                                  <Instagram className="h-2.5 w-2.5 text-zinc-500" />
                                  <span>{lead.instagram_handle}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {hasPitch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                                <Check className="h-3 w-3 text-white" /> Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-900 text-zinc-500 border border-zinc-800">
                                Draft
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageDrawer(lead);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ml-auto ${
                                hasPitch
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                  : 'bg-white hover:bg-zinc-200 text-zinc-950 font-bold shadow'
                              }`}
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>{hasPitch ? 'Edit Message' : 'Write Message'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Message Composer & Quick Dispatch Drawer */}
          {activeEditingLead && (
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121215] border border-zinc-800 shadow-2xl space-y-4 sticky top-20 animate-in fade-in slide-in-from-right-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-white" />
                    <span>Personalized Message</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    For: <strong className="text-white">{activeEditingLead.name}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setActiveEditingLead(null)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Lead Details Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                {activeEditingLead.has_website && activeEditingLead.website ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <Globe className="h-3 w-3" /> Website Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <Globe className="h-3 w-3" /> No Website (Hot Lead)
                  </span>
                )}

                {activeEditingLead.phone && (
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono border border-zinc-800">
                    📞 {activeEditingLead.phone}
                  </span>
                )}

                {activeEditingLead.contact_email && (
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono border border-zinc-800">
                    ✉️ {activeEditingLead.contact_email}
                  </span>
                )}
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-zinc-300">Message Copy (Direct Value Hook):</label>
                  <span
                    className={`font-mono text-[11px] ${
                      wordCount > 70 ? 'text-zinc-400 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {wordCount} words (Recommended: &lt;70w)
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={editingPitchText}
                  onChange={(e) => setEditingPitchText(e.target.value)}
                  placeholder="Click 'AI Draft Custom Message' below or write your custom message here..."
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-white focus:ring-1 focus:ring-white leading-relaxed font-sans"
                />
              </div>

              {/* AI Draft & Actions Bar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleGenerateSinglePitch}
                  disabled={generatingSinglePitch}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all shadow"
                >
                  <Sparkles className={`h-3.5 w-3.5 text-white ${generatingSinglePitch ? 'animate-spin' : ''}`} />
                  <span>{generatingSinglePitch ? 'Drafting...' : 'AI Re-Draft'}</span>
                </button>

                <button
                  onClick={handleSaveMessage}
                  disabled={savingPitch || !editingPitchText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingPitch ? 'Saving...' : 'Save Message'}</span>
                </button>
              </div>

              {/* Fast 1-Click Send Strip */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Fast 1-Click Dispatch:</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Zero-setup direct actions</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Open in Gmail */}
                  <button
                    onClick={() => handleOpenInGmail()}
                    disabled={!activeEditingLead.contact_email}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 shadow transition-all disabled:opacity-40"
                    title="1-Click Open in Gmail Web with draft pre-filled"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Gmail Web ↗</span>
                  </button>

                  {/* Direct WhatsApp */}
                  <button
                    onClick={handleSendDirectWhatsAppFromDrawer}
                    disabled={sendingDirectWhatsApp || !activeEditingLead.phone}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-40"
                    title={isWaConnected ? "Send directly from linked WhatsApp" : "Open WhatsApp chat in new window"}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{sendingDirectWhatsApp ? 'Sending...' : isWaConnected ? 'WhatsApp ⚡' : 'WhatsApp ↗'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                  {/* Background SMTP Email */}
                  <button
                    onClick={handleSendDirectEmailFromDrawer}
                    disabled={sendingDirectEmail || !activeEditingLead.contact_email}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-750 disabled:opacity-40"
                    title="Dispatch email automatically in the background via SMTP"
                  >
                    <Send className={`h-3 w-3 ${sendingDirectEmail ? 'animate-spin' : ''}`} />
                    <span>{sendingDirectEmail ? 'Sending...' : 'Auto-SMTP ⚡'}</span>
                  </button>

                  {/* Copy message */}
                  <button
                    onClick={() => handleCopyPitch(activeEditingLead)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-750"
                  >
                    <Copy className="h-3 w-3 text-zinc-400" />
                    <span>Copy Text</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#121215] border border-dashed border-zinc-800 space-y-3">
          <Send className="h-10 w-10 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-semibold text-white">Bulk Campaign Queue is Empty</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Select prospects in <strong>Find Business Leads</strong>, <strong>Saved Business CRM</strong>, or <strong>YouTube CRM</strong> and click <strong>"Send to Bulk Campaign Queue"</strong> to build your mailing and WhatsApp campaign list here.
          </p>
        </div>
      ) : null}
    </div>
  );
};
