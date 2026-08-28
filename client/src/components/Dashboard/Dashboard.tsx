import React from 'react';
import { DashboardStats } from '../../types';
import { NavTab } from '../Layout/Sidebar';
import { StatsCounter } from '../ui/StatsCounter';
import {
  Users,
  Send,
  MessageSquareReply,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Youtube,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Video,
  Zap,
  Flame,
  Inbox,
  HardDrive,
  Database,
  Lock,
  Download,
} from 'lucide-react';
import { getExportCsvUrl } from '../../services/api';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onSelectTab: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, loading, onSelectTab }) => {
  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading Kropix Outreach metrics...</span>
        </div>
      </div>
    );
  }

  const contactedTotal = stats.contacted + stats.replied + stats.converted;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Local Offline Storage Guarantee Bar */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-emerald-300">100% Local PC Storage Active (SQLite):</span>
            <span className="text-slate-300 ml-1.5">
              All leads, pitches, and chats are saved safely on your computer in <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[11px]">leads.db</code>.
            </span>
          </div>
        </div>

        <a
          href={getExportCsvUrl()}
          download
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Local Backup (CSV)</span>
        </a>
      </div>

      {/* 2. Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Zap className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
              <span>Kropix Outreach Studio Engine</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Scale Your Client Acquisition Today
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Find high-intent businesses & creators, write direct value outreach pitches, and manage live inbound WhatsApp & Email replies seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab('inbox')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Inbox className="h-4 w-4" />
              <span>Live Inbound Inbox</span>
            </button>
            <button
              onClick={() => onSelectTab('bulk_campaign')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Flame className="h-4 w-4" />
              <span>Bulk Campaign Hub</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-12 -top-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 3. VENGENCE UI ANIMATED STATS COUNTER ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pipeline Leads */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            PIPELINE LEADS
          </div>
          <div className="my-3">
            <div className="text-4xl font-black text-white tracking-tight">
              <StatsCounter value={stats.totalLeads} suffix="" duration={1.8} />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1">Discovered Leads</div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {stats.placesCount} Maps • {stats.youtubeCount} YouTube
          </div>
        </div>

        {/* Card 2: Outreach Sent */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
            OUTREACH SENT
          </div>
          <div className="my-3">
            <div className="text-4xl font-black text-amber-300 tracking-tight">
              <StatsCounter value={contactedTotal} suffix="" duration={1.8} />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1">Prospects Contacted</div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Anti-Ban WhatsApp & Email
          </div>
        </div>

        {/* Card 3: Inbound Responses */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="text-[11px] font-bold text-purple-400 tracking-wider uppercase">
            INBOUND REPLIES
          </div>
          <div className="my-3">
            <div className="text-4xl font-black text-purple-300 tracking-tight">
              <StatsCounter value={stats.replied} suffix="" duration={1.8} />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1">Client Responses</div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {stats.responseRate}% Response Rate
          </div>
        </div>

        {/* Card 4: Deals Converted */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
            DEALS CONVERTED
          </div>
          <div className="my-3">
            <div className="text-4xl font-black text-emerald-300 tracking-tight">
              <StatsCounter value={stats.converted} suffix="" duration={1.8} />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1">Client Wins 🎉</div>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {stats.conversionRate}% Conversion Rate
          </div>
        </div>
      </div>

      {/* 4. Segregated Simple Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Pipeline */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Business (Google Maps) Pipeline</h3>
                <p className="text-xs text-slate-400">Clinics, restaurants, studios & local agencies</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              {stats.placesCount} Leads
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => onSelectTab('places_search')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-sky-400 transition-colors font-mono">STEP 01</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Find Leads</div>
            </button>
            <button
              onClick={() => onSelectTab('places_crm')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-sky-400 transition-colors font-mono">STEP 02</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Business CRM</div>
            </button>
            <button
              onClick={() => onSelectTab('places_queue')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-sky-400 transition-colors font-mono">STEP 03</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Outreach Hub</div>
            </button>
          </div>
        </div>

        {/* YouTube Pipeline */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">YouTube Creators Pipeline</h3>
                <p className="text-xs text-slate-400">Content creators & influencers</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              {stats.youtubeCount} Creators
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => onSelectTab('youtube_search')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-rose-400 transition-colors font-mono">STEP 01</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Find Channels</div>
            </button>
            <button
              onClick={() => onSelectTab('youtube_crm')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-rose-400 transition-colors font-mono">STEP 02</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Creator CRM</div>
            </button>
            <button
              onClick={() => onSelectTab('youtube_queue')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
            >
              <div className="text-[10px] text-slate-500 group-hover:text-rose-400 transition-colors font-mono">STEP 03</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">Creator Outreach</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
