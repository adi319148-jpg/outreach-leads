import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Youtube,
  Send,
  Users,
  Settings,
  Building2,
  Video,
  Flame,
  Inbox,
  ShieldCheck,
  Search,
  LogOut,
  KeyRound,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'admin_panel'
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
  isAdmin?: boolean;
  onLogout?: () => void;
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
  isAdmin = false,
  onLogout,
}) => {
  return (
    <aside className="w-64 bg-[#09090b] border-r border-zinc-800/80 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-zinc-800/80 gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden shadow border border-zinc-700/80 bg-zinc-900 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Kropix Outreach</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Studio Engine</span>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-4">
          {/* Section: Main Platform */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
              Main Menu
            </div>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${currentTab === 'dashboard' ? 'text-zinc-950' : 'text-zinc-400'}`} />
              <span>Overview & Analytics</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onSelectTab('admin_panel')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  currentTab === 'admin_panel'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-white hover:bg-zinc-900/80 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">👑</span>
                  <span>Super Admin Console</span>
                </div>
                <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${currentTab === 'admin_panel' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                  ADMIN
                </span>
              </button>
            )}

            <button
              onClick={() => onSelectTab('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                currentTab === 'inbox'
                  ? 'bg-white text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className={`h-4 w-4 ${currentTab === 'inbox' ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>Inbound Replies</span>
              </div>
              {unreadRepliesCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-zinc-900 text-white border border-zinc-700 font-bold font-mono">
                  {unreadRepliesCount} NEW
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('bulk_campaign')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                currentTab === 'bulk_campaign'
                  ? 'bg-white text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className={`h-4 w-4 ${currentTab === 'bulk_campaign' ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>Bulk Mass Dispatch</span>
              </div>
              {campaignQueueCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-bold">
                  {campaignQueueCount}
                </span>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800/60" />

          {/* Section: Business Discovery */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>Business Discovery</span>
              </span>
            </div>

            {/* Tree Indented Sub-Items */}
            <div className="pl-2 border-l border-zinc-800 ml-3.5 space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('places_search')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'places_search'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className={`h-3.5 w-3.5 ${currentTab === 'places_search' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Google Places Search</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('places_crm')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'places_crm'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className={`h-3.5 w-3.5 ${currentTab === 'places_crm' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Places CRM</span>
                </div>
                {placesTotalLeads > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    currentTab === 'places_crm' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}>
                    {placesTotalLeads}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('places_queue')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'places_queue'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className={`h-3.5 w-3.5 ${currentTab === 'places_queue' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Places Pitches</span>
                </div>
                {placesQueueCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    currentTab === 'places_queue' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}>
                    {placesQueueCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800/60" />

          {/* Section: YouTube Creators */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-zinc-400" />
                <span>YouTube Creators</span>
              </span>
            </div>

            {/* Tree Indented Sub-Items */}
            <div className="pl-2 border-l border-zinc-800 ml-3.5 space-y-0.5 mt-1">
              <button
                onClick={() => onSelectTab('youtube_search')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'youtube_search'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Youtube className={`h-3.5 w-3.5 ${currentTab === 'youtube_search' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Channel Discovery</span>
                </div>
              </button>

              <button
                onClick={() => onSelectTab('youtube_crm')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'youtube_crm'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className={`h-3.5 w-3.5 ${currentTab === 'youtube_crm' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Creator CRM</span>
                </div>
                {youtubeTotalLeads > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    currentTab === 'youtube_crm' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}>
                    {youtubeTotalLeads}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('youtube_queue')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentTab === 'youtube_queue'
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className={`h-3.5 w-3.5 ${currentTab === 'youtube_queue' ? 'text-zinc-950' : 'text-zinc-500'}`} />
                  <span>Creator Pitches</span>
                </div>
                {youtubeQueueCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    currentTab === 'youtube_queue' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}>
                    {youtubeQueueCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
            currentTab === 'settings'
              ? 'bg-white text-zinc-950 font-bold shadow'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
          }`}
        >
          <Settings className={`h-4 w-4 ${currentTab === 'settings' ? 'text-zinc-950' : 'text-zinc-400'}`} />
          <span>Settings & Config</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-rose-400 hover:bg-zinc-900/60 transition-colors"
            title="Lock Workspace & Log Out"
          >
            <div className="flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock / Log Out</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-600">Exit</span>
          </button>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            <span>AI Status</span>
          </div>
          <span className="font-mono text-zinc-300 font-semibold">Active</span>
        </div>
      </div>
    </aside>
  );
};
