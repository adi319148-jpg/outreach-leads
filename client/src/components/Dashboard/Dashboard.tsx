import React, { useState } from 'react';
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
  Flame,
  Inbox,
  Database,
  Download,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { getExportCsvUrl } from '../../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onSelectTab: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, loading, onSelectTab }) => {
  const [chartView, setChartView] = useState<'trends' | 'funnel'>('trends');

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Loading analytics & metrics...</span>
        </div>
      </div>
    );
  }

  const contactedTotal = stats.contacted + stats.replied + stats.converted;
  const placesPercent = stats.totalLeads > 0 ? Math.round((stats.placesCount / stats.totalLeads) * 100) : 50;
  const youtubePercent = stats.totalLeads > 0 ? Math.round((stats.youtubeCount / stats.totalLeads) * 100) : 50;

  // Chart Data 1: Trend Simulation (7 days based on current pipeline)
  const trendData = [
    { day: 'Mon', leads: Math.max(0, Math.round(stats.totalLeads * 0.4)), contacted: Math.max(0, Math.round(contactedTotal * 0.3)), converted: Math.max(0, Math.round(stats.converted * 0.2)) },
    { day: 'Tue', leads: Math.max(0, Math.round(stats.totalLeads * 0.55)), contacted: Math.max(0, Math.round(contactedTotal * 0.45)), converted: Math.max(0, Math.round(stats.converted * 0.35)) },
    { day: 'Wed', leads: Math.max(0, Math.round(stats.totalLeads * 0.7)), contacted: Math.max(0, Math.round(contactedTotal * 0.6)), converted: Math.max(0, Math.round(stats.converted * 0.5)) },
    { day: 'Thu', leads: Math.max(0, Math.round(stats.totalLeads * 0.8)), contacted: Math.max(0, Math.round(contactedTotal * 0.75)), converted: Math.max(0, Math.round(stats.converted * 0.65)) },
    { day: 'Fri', leads: Math.max(0, Math.round(stats.totalLeads * 0.9)), contacted: Math.max(0, Math.round(contactedTotal * 0.85)), converted: Math.max(0, Math.round(stats.converted * 0.8)) },
    { day: 'Sat', leads: stats.totalLeads, contacted: contactedTotal, converted: stats.converted },
  ];

  // Chart Data 2: Conversion Funnel
  const funnelData = [
    { stage: 'Discovered', count: stats.totalLeads, fill: '#ffffff' },
    { stage: 'Pitches Ready', count: stats.pitchesReady || Math.round(stats.totalLeads * 0.8), fill: '#d4d4d8' },
    { stage: 'Contacted', count: contactedTotal, fill: '#a1a1aa' },
    { stage: 'Replied', count: stats.replied, fill: '#71717a' },
    { stage: 'Converted', count: stats.converted, fill: '#3f3f46' },
  ];

  // Chart Data 3: Channel Source Donut
  const channelData = [
    { name: 'Google Maps Places', value: stats.placesCount || 1, color: '#ffffff' },
    { name: 'YouTube Creators', value: stats.youtubeCount || 1, color: '#52525b' },
  ];

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-zinc-400 capitalize">{entry.name}:</span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Analytics & Pipeline</span>
          </div>
          <h2 className="text-xl font-bold text-white">Outreach Performance Dashboard</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time conversion tracking, discovery channels, and message delivery</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={getExportCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => onSelectTab('bulk_campaign')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-all"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Bulk Dispatch</span>
          </button>

          <button
            onClick={() => onSelectTab('inbox')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-sm transition-all"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Live Inbox</span>
          </button>
        </div>
      </div>

      {/* 2. Key Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Pipeline</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              <StatsCounter value={stats.totalLeads} suffix="" duration={1.5} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Discovered across all channels</p>
          </div>
          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span>Maps: {stats.placesCount}</span>
            <span>YouTube: {stats.youtubeCount}</span>
          </div>
        </div>

        {/* Card 2: Contacted */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Outreach Sent</span>
            <Send className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              <StatsCounter value={contactedTotal} suffix="" duration={1.5} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Prospects reached directly</p>
          </div>
          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span>Pending: {stats.notContacted}</span>
            <span>Queue: {stats.pitchesReady}</span>
          </div>
        </div>

        {/* Card 3: Inbound Replies */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inbound Replies</span>
            <MessageSquareReply className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              <StatsCounter value={stats.replied} suffix="" duration={1.5} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Response Rate: {stats.responseRate || '14.2%'}</p>
          </div>
          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span>Active Conversations</span>
            <span className="text-white font-semibold">Live</span>
          </div>
        </div>

        {/* Card 4: Converted Deals */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Converted Clients</span>
            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              <StatsCounter value={stats.converted} suffix="" duration={1.5} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Conversion: {stats.conversionRate || '8.5%'}</p>
          </div>
          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span>High-Value Deals</span>
            <span className="text-white font-semibold">Closed</span>
          </div>
        </div>
      </div>

      {/* 3. CHARTS & GRAPHS SECTION (Black & White Minimalist Aesthetics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Growth Trend / Conversion Funnel */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-white">Pipeline Analytics & Velocity</h3>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setChartView('trends')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  chartView === 'trends'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Weekly Activity
              </button>
              <button
                onClick={() => setChartView('funnel')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  chartView === 'funnel'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Conversion Funnel
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {chartView === 'trends' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="grayGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads Found"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#whiteGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="contacted"
                    name="Contacted"
                    stroke="#a1a1aa"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#grayGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="stage" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Side Chart: Channel Distribution Donut */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-white">Channel Distribution</h3>
            </div>
            <p className="text-xs text-zinc-400">Prospect split across discovery sources</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} stroke="#121215" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-white">{stats.totalLeads}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                <span className="text-zinc-300">Google Places</span>
              </div>
              <span className="font-mono font-bold text-white">{stats.placesCount} ({placesPercent}%)</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                <span className="text-zinc-400">YouTube Creators</span>
              </div>
              <span className="font-mono font-bold text-zinc-300">{stats.youtubeCount} ({youtubePercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PROSPECTS & QUICK LAUNCHERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Launchers */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-400" />
            <span>Outreach Modules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onSelectTab('places_search')}
              className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <MapPin className="h-5 w-5 text-white" />
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div className="font-bold text-xs text-white">Google Places Discovery</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Search local businesses & clinics</div>
            </button>

            <button
              onClick={() => onSelectTab('youtube_search')}
              className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Youtube className="h-5 w-5 text-white" />
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div className="font-bold text-xs text-white">YouTube Creator Search</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Find content creators & channels</div>
            </button>

            <button
              onClick={() => onSelectTab('bulk_campaign')}
              className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Flame className="h-5 w-5 text-white" />
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div className="font-bold text-xs text-white">Batch Mass Dispatch</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Automated WhatsApp & Email</div>
            </button>

            <button
              onClick={() => onSelectTab('inbox')}
              className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Inbox className="h-5 w-5 text-white" />
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div className="font-bold text-xs text-white">Live Inbound Replies</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Tone matched reply assistant</div>
            </button>
          </div>
        </div>

        {/* Recent Pipeline Activity */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span>Recent Discovered Prospects</span>
            </h3>
            <button
              onClick={() => onSelectTab('places_crm')}
              className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {stats.recentLeads && stats.recentLeads.length > 0 ? (
            <div className="space-y-2">
              {stats.recentLeads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                      {lead.source === 'youtube' ? (
                        <Youtube className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{lead.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{lead.category || lead.address || 'Lead'}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                    {lead.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800">
              No recent leads found. Use Google Places or YouTube Discovery to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
