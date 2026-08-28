import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Youtube,
  Send,
  Users,
  Settings,
  Sparkles,
  Zap,
  Building2,
  Video,
  Flame,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'inbox'
  | 'bulk_campaign'
  | 'places_search'
  | 'places_crm'
  | 'places_queue'
  | 'youtube_search'
  | 'youtube_crm'
  | 'youtube_queue'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadRepliesCount?: number;
  campaignQueueCount?: number;
  placesQueueCount?: number;
  youtubeQueueCount?: number;
  placesTotalLeads?: number;
  youtubeTotalLeads?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadRepliesCount = 0,
  campaignQueueCount = 0,
  placesQueueCount = 0,
  youtubeQueueCount = 0,
  placesTotalLeads = 0,
  youtubeTotalLeads = 0,
}) => {
  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-bold shrink-0">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Kropix Outreach</span>
            </div>
            <div className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Studio Engine</span>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-4">
          {/* Main Dashboard, Inbound Inbox & Bulk Dispatch */}
          <div className="space-y-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${currentTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>Overview Dashboard</span>
            </button>

            {/* Inbound Replies Live Inbox */}
            <button
              onClick={() => onSelectTab('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'inbox'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 text-indigo-400" />
                <span>Inbound Replies</span>
              </div>
              {unreadRepliesCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold font-mono animate-pulse">
                  {unreadRepliesCount} NEW
                </span>
              )}
            </button>

            {/* Bulk Campaign Hub */}
            <button
              onClick={() => onSelectTab('bulk_campaign')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'bulk_campaign'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="h-4 w-4 text-emerald-400" />
                <span>Bulk Mass Dispatch</span>
              </div>
              {campaignQueueCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  {campaignQueueCount}
                </span>
              )}
            </button>
          </div>

          {/* Section 1: Business (Google Maps) */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-sky-400 tracking-wider uppercase flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
              <span>Business (Google Maps)</span>
            </div>

            <div className="space-y-0.5 pl-1">
              <button
                onClick={() => onSelectTab('places_search')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'places_search'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-400" />
                  <span>Find Business Leads</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('places_crm')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'places_crm'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>Saved Business CRM</span>
                </div>
                {placesTotalLeads > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-sky-500/20 text-sky-300 font-mono">
                    {placesTotalLeads}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('places_queue')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'places_queue'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="h-3.5 w-3.5 text-amber-400" />
                  <span>Business Outreach</span>
                </div>
                {placesQueueCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {placesQueueCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: YouTube Creators */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-rose-400 tracking-wider uppercase flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-rose-400" />
              <span>YouTube Creators</span>
            </div>

            <div className="space-y-0.5 pl-1">
              <button
                onClick={() => onSelectTab('youtube_search')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'youtube_search'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Youtube className="h-3.5 w-3.5 text-rose-400" />
                  <span>Find YT Channels</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('youtube_crm')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'youtube_crm'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-3.5 w-3.5 text-rose-400" />
                  <span>Saved Creators CRM</span>
                </div>
                {youtubeTotalLeads > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-300 font-mono">
                    {youtubeTotalLeads}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('youtube_queue')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  currentTab === 'youtube_queue'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="h-3.5 w-3.5 text-amber-400" />
                  <span>Creator Outreach</span>
                </div>
                {youtubeQueueCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {youtubeQueueCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => onSelectTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentTab === 'settings'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>API Keys & Preferences</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Safety Compliance Footer */}
      <div className="p-3.5 m-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Kropix Studio Protocol</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          WhatsApp 30-45s human simulation & direct value cold outreach.
        </p>
      </div>
    </aside>
  );
};
