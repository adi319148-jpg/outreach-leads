import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import {
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Octagon,
} from 'lucide-react';
import { toggleEmergencyKillSwitch } from '../../services/api';

interface NavbarProps {
  currentTab: NavTab;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectTab: (tab: NavTab) => void;
  mockMode?: boolean;
  killSwitchActive?: boolean;
  onKillSwitchToggled?: (active: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onRefresh,
  isRefreshing,
  onSelectTab,
  mockMode = false,
  killSwitchActive = false,
  onKillSwitchToggled,
}) => {
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  const getTitle = () => {
    const titles: Record<NavTab, { title: string; subtitle: string }> = {
      dashboard: {
        title: 'Command Center & Analytics',
        subtitle: 'Real-time performance metrics, conversion funnel & pipeline analytics',
      },
      admin_panel: {
        title: 'Super Admin Console & Licensing',
        subtitle: 'Client license key generator, system telemetry & Supabase cloud sync',
      },
      inbox: {
        title: 'Live Inbound Replies & Chats',
        subtitle: 'Real-time prospect responses from WhatsApp and Email with tone matching',
      },
      bulk_campaign: {
        title: 'Bulk Campaign & Mass Dispatch',
        subtitle: 'Compose custom messages & dispatch sequentially via Email or Safe WhatsApp Automation',
      },
      places_search: {
        title: 'Google Maps Business Discovery',
        subtitle: 'Find local businesses, clinics, agencies & services via Places API',
      },
      places_crm: {
        title: 'Saved Business CRM',
        subtitle: 'Manage local business pipelines, ratings, interaction notes & conversion status',
      },
      places_queue: {
        title: 'Business Outreach & Pitches',
        subtitle: 'Review & approve AI generated messages for businesses before dispatch',
      },
      youtube_search: {
        title: 'YouTube Creator Discovery',
        subtitle: 'Discover YouTube channels by niche, subscriber count & view metrics',
      },
      youtube_crm: {
        title: 'Creator CRM',
        subtitle: 'Manage content creator deals, subscriber stats & collaboration pipeline',
      },
      youtube_queue: {
        title: 'Creator Outreach Queue',
        subtitle: 'Review & approve sponsorship/collaboration pitches for content creators',
      },
      settings: {
        title: 'Integrations & Settings',
        subtitle: 'Manage API keys for Google Places, YouTube, Gemini, Claude, and system config',
      },
    };

    return titles[currentTab] || { title: 'Dashboard', subtitle: '' };
  };

  const { title, subtitle } = getTitle();

  const handleKillSwitchClick = async () => {
    const nextState = !killSwitchActive;
    if (nextState) {
      if (
        !window.confirm(
          '🚨 ACTIVATE EMERGENCY KILL SWITCH?\n\nThis will instantly FREEZE and HALT all auto-sending, WhatsApp queues, and batch campaigns immediately.'
        )
      ) {
        return;
      }
    }

    setTogglingKillSwitch(true);
    try {
      const res = await toggleEmergencyKillSwitch(nextState);
      if (onKillSwitchToggled) {
        onKillSwitchToggled(res.killSwitchActive);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle kill switch:', err);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  return (
    <header className="h-16 px-6 bg-[#09090b] border-b border-zinc-800/80 flex items-center justify-between gap-4 select-none shrink-0 sticky top-0 z-40">
      {/* Title info */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <span>{title}</span>
            {mockMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                Demo Mode
              </span>
            )}
          </h1>
          <p className="text-[11px] text-zinc-400 truncate max-w-lg hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Guard Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-white" />
          <span>AI Guard Active</span>
        </div>

        {/* EMERGENCY KILL SWITCH BUTTON */}
        <button
          onClick={handleKillSwitchClick}
          disabled={togglingKillSwitch}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            killSwitchActive
              ? 'bg-white text-zinc-950 font-black border border-white animate-pulse hover:bg-zinc-200'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
          }`}
          title={
            killSwitchActive
              ? 'Kill Switch ACTIVE — Click to Deactivate & Resume Outgoing Messaging'
              : 'Emergency Kill Switch — Click to instantly halt all outgoing campaigns'
          }
        >
          {killSwitchActive ? (
            <>
              <Octagon className="h-3.5 w-3.5 fill-zinc-950" />
              <span>KILL SWITCH ACTIVE (FROZEN)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
              <span>Emergency Stop</span>
            </>
          )}
        </button>

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
          title="Refresh real-time pipeline metrics"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
};
