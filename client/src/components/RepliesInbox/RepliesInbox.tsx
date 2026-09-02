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
      const safeReplies = Array.isArray(data?.replies) ? data.replies : [];
      setReplies(safeReplies);

      if (safeReplies.length > 0 && selectedReplyId === null) {
        setSelectedReplyId(safeReplies[0].id);
      }
    } catch (err) {
      console.error('Failed to load inbound replies:', err);
      setReplies([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();

    const timer = setInterval(() => {
      fetchReplies(true);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const activeReply = (replies || []).find((r) => r.id === selectedReplyId) || (replies || [])[0];

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

      if (res.reply) {
        setResponseText(res.reply);
        setActionMsg(`AI Draft Ready (Tone: ${res.sentiment?.toneLabel || 'Standard'})`);
      }
    } catch (err: any) {
      console.error('Failed to generate AI reply:', err);
      setActionMsg(err.response?.data?.error || err.message || 'Failed to generate AI reply.');
    } finally {
      setGeneratingAIReply(false);
    }
  };

  const handleSendResponse = async () => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-zinc-900 text-white border border-zinc-750">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Inbound Replies
              </h2>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-zinc-950 font-mono">
                  {unreadCount} UNREAD
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live responses from prospects with AI tone matching & quick actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Listener Active</span>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Main Inbox View */}
      {replies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Replies List */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#121215] border border-zinc-800 text-xs">
              <button
                onClick={() => setFilterChannel('all')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  filterChannel === 'all' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({replies.length})
              </button>
              <button
                onClick={() => setFilterChannel('whatsapp')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  filterChannel === 'whatsapp' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setFilterChannel('email')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  filterChannel === 'email' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
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
                      ? 'bg-zinc-850 border-white text-white shadow-md'
                      : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
                  } ${!reply.is_read ? 'border-l-4 border-l-white' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg text-xs border bg-zinc-800 text-zinc-300 border-zinc-700">
                        {reply.channel === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate max-w-[180px]">
                        {reply.lead_name || reply.sender_name || 'Prospect'}
                      </h4>
                    </div>

                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(reply.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                    "{reply.message_text}"
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                    {reply.sentiment ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {reply.sentiment.toneLabel}
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-mono">{reply.sender_id}</span>
                    )}

                    {reply.lead_status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
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
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
              {/* Prospect Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl border bg-zinc-900 text-white border-zinc-750">
                    {activeReply.channel === 'whatsapp' ? <MessageCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {activeReply.lead_name || activeReply.sender_name || 'Prospect'}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono">({activeReply.sender_id})</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Channel: <strong className="capitalize text-zinc-200">{activeReply.channel}</strong> • Received: {new Date(activeReply.received_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Deal Action Buttons */}
                {activeReply.lead_id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(activeReply.lead_id!, 'converted')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all"
                    >
                      <span>Converted Deal 🎉</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(activeReply.lead_id!, 'rejected')}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-700 transition-colors"
                    >
                      Not Interested
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread */}
              <div className="space-y-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 max-h-80 overflow-y-auto">
                {/* Outbound Pitch Sent */}
                {activeReply.original_pitch && (
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Outreach Pitch Sent:</span>
                    <div className="p-3.5 rounded-2xl rounded-tr-none bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 max-w-lg leading-relaxed">
                      {activeReply.original_pitch}
                    </div>
                  </div>
                )}

                {/* Inbound Reply Received */}
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      <span>Incoming from {activeReply.lead_name || activeReply.sender_name}:</span>
                    </span>
                    {activeReply.sentiment && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {activeReply.sentiment.toneLabel}
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-zinc-850 border border-zinc-700 text-sm text-white max-w-lg leading-relaxed shadow-sm">
                    {activeReply.message_text}
                  </div>
                </div>
              </div>

              {/* Tone Matching AI Draft Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ShieldCheck className="h-4 w-4 text-white" />
                  <span>AI Sentiment Analyzer & Guard Ready</span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAISmartReply}
                  disabled={generatingAIReply}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-all disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${generatingAIReply ? 'animate-spin' : ''}`} />
                  <span>{generatingAIReply ? 'Drafting...' : 'Generate AI Smart Reply'}</span>
                </button>
              </div>

              {/* Response Input */}
              <div className="space-y-3">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your reply message..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-white focus:ring-1 focus:ring-white transition-all font-sans leading-relaxed"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Target: {activeReply.sender_id} ({activeReply.channel})
                  </div>

                  <button
                    type="button"
                    onClick={handleSendResponse}
                    disabled={sendingResponse || !responseText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-sm transition-all disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                    <span>{sendingResponse ? 'Dispatching...' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#121215] border border-dashed border-zinc-800 text-center space-y-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-400 w-fit mx-auto border border-zinc-800">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Inbound Replies Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            When prospects reply to your WhatsApp pitches or cold emails, their messages and sentiment analysis will stream here in real time.
          </p>
        </div>
      )}
    </div>
  );
};
