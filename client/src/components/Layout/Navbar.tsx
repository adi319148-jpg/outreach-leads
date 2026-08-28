import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import {
  RotateCcw,
  Sparkles,
  Zap,
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
        title: 'Kropix Outreach Command Center',
        subtitle: 'Real-time metrics, conversion funnel & pipeline analytics',
      },
      inbox: {
        title: 'Live Inbound Replies & Chats',
        subtitle: 'Real-time prospect responses from WhatsApp and Email with tone matching & quick actions',
      },
      bulk_campaign: {
        title: 'Bulk Campaign & Mass Dispatch Hub',
        subtitle: 'Compose custom messages & dispatch sequentially via Email or Safe WhatsApp Automation',
      },
      places_search: {
        title: 'Google Maps Business Discovery',
        subtitle: 'Find local businesses, clinics, agencies & services via Places API',
      },
      places_crm: {
        title: 'Saved Local Business CRM',
        subtitle: 'Manage local business pipelines, ratings, interaction notes & conversion status',
      },
      places_queue: {
        title: 'Business Outreach & Pitch Review',
        subtitle: 'Review & approve AI generated messages for businesses before dispatch',
      },
      youtube_search: {
        title: 'YouTube Creator & Channel Discovery',
        subtitle: 'Discover YouTube channels by niche, subscriber count & view metrics via YouTube Data API',
      },
      youtube_crm: {
        title: 'Saved YouTube Creators CRM',
        subtitle: 'Manage content creator deals, subscriber stats, notes & collaboration pipeline',
      },
      youtube_queue: {
        title: 'Creator Outreach & Pitch Queue',
        subtitle: 'Review & approve sponsorship/collaboration pitches for content creators',
      },
      settings: {
        title: 'Integrations & Configuration',
        subtitle: 'Manage API keys for Google Places, YouTube, Gemini, Claude, and system preferences',
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
    <header className="h-16 px-6 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0 sticky top-0 z-40">
      {/* Title info */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{title}</span>
            {mockMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Demo Mode
              </span>
            )}
          </h1>
          <p className="text-[11px] text-slate-400 truncate max-w-lg hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Fact-Checking Guard Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] text-slate-300 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Fact-Checking Guard Active</span>
        </div>

        {/* 🚨 EMERGENCY KILL SWITCH BUTTON */}
        <button
          onClick={handleKillSwitchClick}
          disabled={togglingKillSwitch}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
            killSwitchActive
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse ring-2 ring-rose-500/60'
              : 'bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-slate-700'
          }`}
          title={
            killSwitchActive
              ? 'Click to unlock safety lock & resume operations'
              : '1-Click Kill Switch: Instantly halt all auto-sending & batch queues'
          }
        >
          <Octagon className={`h-3.5 w-3.5 ${killSwitchActive ? 'fill-white text-rose-600' : 'text-rose-400'}`} />
          <span>{killSwitchActive ? '🚨 KILL SWITCH: HALTED' : 'Kill Switch'}</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors shadow-sm"
          title="Refresh metrics & queues"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden md:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
