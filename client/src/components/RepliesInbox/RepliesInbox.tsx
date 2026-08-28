import React, { useState, useEffect } from 'react';
import {
  getInboundReplies,
  markRepliesAsRead,
  sendQuickWhatsAppResponse,
  generateAISmartReply,
  updateLead,
} from '../../services/api';
import { InboundReply, LeadStatus } from '../../types';
import {
  Inbox,
  MessageCircle,
  Mail,
  CheckCircle2,
  Sparkles,
  Send,
  User,
  Flame,
  Check,
  CheckCheck,
  ShieldCheck,
  X,
  Radio,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RepliesInboxProps {
  onRepliesUpdated: () => void;
}

export const RepliesInbox: React.FC<RepliesInboxProps> = ({ onRepliesUpdated }) => {
  const [replies, setReplies] = useState<InboundReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplyId, setSelectedReplyId] = useState<number | null>(null);
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [generatingAIReply, setGeneratingAIReply] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchReplies = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getInboundReplies();
      setReplies(data.replies);

      if (data.replies.length > 0 && selectedReplyId === null) {
        setSelectedReplyId(data.replies[0].id);
      }
    } catch (err) {
      console.error('Failed to load inbound replies:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();

    const timer = setInterval(() => {
      fetchReplies(true);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const activeReply = replies.find((r) => r.id === selectedReplyId) || replies[0];

  const handleSelectReply = async (reply: InboundReply) => {
    setSelectedReplyId(reply.id);
    if (!reply.is_read) {
      try {
        await markRepliesAsRead([reply.id]);
        setReplies((prev) =>
          prev.map((r) => (r.id === reply.id ? { ...r, is_read: 1 } : r))
        );
        onRepliesUpdated();
      } catch (err) {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markRepliesAsRead();
      setReplies((prev) => prev.map((r) => ({ ...r, is_read: 1 })));
      onRepliesUpdated();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleGenerateAISmartReply = async () => {
    if (!activeReply) return;
    setGeneratingAIReply(true);
    setActionMsg(null);
    try {
      const res = await generateAISmartReply({
        incomingMessage: activeReply.message_text,
        originalPitch: activeReply.original_pitch,
        leadName: activeReply.lead_name || activeReply.sender_name,
      });

      setResponseText(res.reply);
      setActionMsg(`✨ AI drafted tone-matched reply (${res.sentiment.toneLabel})!`);
    } catch (err: any) {
      console.error('Failed to generate AI reply:', err);
      setActionMsg('Failed to generate AI reply.');
    } finally {
      setGeneratingAIReply(false);
    }
  };

  const handleSendQuickResponse = async () => {
    if (!activeReply || !responseText.trim()) return;

    setSendingResponse(true);
    setActionMsg(null);

    try {
      if (activeReply.channel === 'whatsapp') {
        const res = await sendQuickWhatsAppResponse({
          leadId: activeReply.lead_id,
          phone: activeReply.sender_id,
          message: responseText.trim(),
        });

        if (res.success) {
          setActionMsg('Response sent successfully on WhatsApp!');
          setResponseText('');
        } else {
          setActionMsg(`Failed to send: ${res.message || 'Error'}`);
        }
      } else {
        const subject = `Re: Regarding your inquiry`;
        const mailto = `mailto:${activeReply.sender_id}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(responseText)}`;
        window.open(mailto, '_blank');
        setActionMsg('Opened email client for sending!');
        setResponseText('');
      }
      fetchReplies(true);
      onRepliesUpdated();
    } catch (err: any) {
      console.error('Failed to send response:', err);
      setActionMsg(err.response?.data?.error || err.message || 'Failed to send response.');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateStatus = async (leadId: number, status: LeadStatus) => {
    if (status === 'converted') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
    try {
      await updateLead(leadId, { status });
      setReplies((prev) =>
        prev.map((r) => (r.lead_id === leadId ? { ...r, lead_status: status } : r))
      );
      setActionMsg(`Lead status updated to [${status.toUpperCase()}]!`);
      onRepliesUpdated();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const filteredReplies = replies.filter((r) => {
    if (filterChannel === 'all') return true;
    return r.channel === filterChannel;
  });

  const unreadCount = replies.filter((r) => !r.is_read).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Inbox className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Inbound Replies & Chats
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white font-mono animate-pulse">
                  {unreadCount} NEW UNREAD
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live replies from prospects with <strong>Sentiment Tone Matching</strong> & <strong>Fact-Checking Guard</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Listener Active</span>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Main Inbox View */}
      {replies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Replies List */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setFilterChannel('all')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  filterChannel === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({replies.length})
              </button>
              <button
                onClick={() => setFilterChannel('whatsapp')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  filterChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setFilterChannel('email')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  filterChannel === 'email' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </button>
            </div>

            {/* Conversation items */}
            {filteredReplies.map((reply) => {
              const isSelected = activeReply?.id === reply.id;

              return (
                <div
                  key={reply.id}
                  onClick={() => handleSelectReply(reply)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-lg ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:bg-slate-850'
                  } ${!reply.is_read ? 'border-l-4 border-l-rose-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg text-xs border ${
                        reply.channel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}>
                        {reply.channel === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 truncate max-w-[180px]">
                        {reply.lead_name || reply.sender_name || 'Prospect'}
                      </h4>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(reply.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                    "{reply.message_text}"
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    {reply.sentiment ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {reply.sentiment.toneLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">{reply.sender_id}</span>
                    )}

                    {reply.lead_status && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          reply.lead_status === 'converted'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : reply.lead_status === 'contacted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {reply.lead_status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Chat & Deal Thread View */}
          {activeReply && (
            <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              {/* Prospect Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    activeReply.channel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {activeReply.channel === 'whatsapp' ? <MessageCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {activeReply.lead_name || activeReply.sender_name || 'Prospect'}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">({activeReply.sender_id})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Channel: <strong className="capitalize text-slate-200">{activeReply.channel}</strong> • Received: {new Date(activeReply.received_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Deal Action Buttons */}
                {activeReply.lead_id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(activeReply.lead_id!, 'converted')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Flame className="h-3.5 w-3.5 text-amber-300" />
                      <span>Converted Deal 🎉</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(activeReply.lead_id!, 'rejected')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      Not Interested
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread */}
              <div className="space-y-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 max-h-80 overflow-y-auto">
                {/* Outbound Pitch Sent */}
                {activeReply.original_pitch && (
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono">Outreach Pitch Sent:</span>
                    <div className="p-3.5 rounded-2xl rounded-tr-none bg-slate-800/90 border border-slate-700/80 text-xs text-slate-200 max-w-lg leading-relaxed shadow-sm">
                      {activeReply.original_pitch}
                    </div>
                  </div>
                )}

                {/* Inbound Reply Received */}
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-300 font-semibold flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      <span>Incoming from {activeReply.lead_name || activeReply.sender_name}:</span>
                    </span>
                    {activeReply.sentiment && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {activeReply.sentiment.toneLabel}
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/40 text-sm text-slate-100 max-w-lg leading-relaxed shadow-md">
                    {activeReply.message_text}
                  </div>
                </div>
              </div>

              {/* Tone Matching AI Draft Button & Fact-Checking Shield */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">
                    Fact-Checking Guard ensures zero unverified pricing/date promises in replies.
                  </span>
                </div>

                <button
                  onClick={handleGenerateAISmartReply}
                  disabled={generatingAIReply}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all shrink-0 disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 text-amber-300 ${generatingAIReply ? 'animate-spin' : ''}`} />
                  <span>{generatingAIReply ? 'Drafting...' : 'AI Draft Tone-Matched Reply'}</span>
                </button>
              </div>

              {/* Quick Reply Bar */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Send Response back to Prospect:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response or click 'AI Draft Tone-Matched Reply' above..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendQuickResponse();
                    }}
                  />
                  <button
                    onClick={handleSendQuickResponse}
                    disabled={sendingResponse || !responseText.trim()}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-40 ${
                      activeReply.channel === 'whatsapp'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                        : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30'
                    }`}
                  >
                    <Send className={`h-3.5 w-3.5 ${sendingResponse ? 'animate-spin' : ''}`} />
                    <span>{sendingResponse ? 'Sending...' : 'Send Reply ⚡'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900 border border-dashed border-slate-800 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-950 w-fit mx-auto border border-slate-800 text-indigo-400 shadow-inner">
            <Inbox className="h-8 w-8 text-slate-400" />
          </div>
          <h4 className="text-base font-bold text-slate-100">Live Inbound Inbox is Clean & Ready</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            When a prospect replies to your WhatsApp DM or Email outreach, their message will appear here automatically with real-time AI tone matching and smart response drafting.
          </p>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Listener Active</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
