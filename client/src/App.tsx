import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { PlacesSearch } from './components/PlacesSearch/PlacesSearch';
import { YoutubeSearch } from './components/YoutubeSearch/YoutubeSearch';
import { PitchQueue } from './components/PitchQueue/PitchQueue';
import { LeadsCRM } from './components/LeadsCRM/LeadsCRM';
import { BulkCampaign } from './components/BulkCampaign/BulkCampaign';
import { RepliesInbox } from './components/RepliesInbox/RepliesInbox';
import { Settings } from './components/Settings/Settings';
import { getDashboardStats, getLeads, getInboundReplies, getSettings } from './services/api';
import { DashboardStats } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaignQueueCount, setCampaignQueueCount] = useState<number>(0);
  const [unreadRepliesCount, setUnreadRepliesCount] = useState<number>(0);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);

      const camp = await getLeads({ inCampaign: true });
      setCampaignQueueCount(camp.total || 0);

      const replies = await getInboundReplies();
      setUnreadRepliesCount(replies.unreadCount || 0);

      const settings = await getSettings();
      setKillSwitchActive(Boolean(settings.killSwitchActive));
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(async () => {
      try {
        const replies = await getInboundReplies();
        setUnreadRepliesCount(replies.unreadCount || 0);
      } catch (err) {
        // ignore
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#0B0F17] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        unreadRepliesCount={unreadRepliesCount}
        campaignQueueCount={campaignQueueCount}
        placesQueueCount={stats?.placesCount || 0}
        youtubeQueueCount={stats?.youtubeCount || 0}
        placesTotalLeads={stats?.placesCount || 0}
        youtubeTotalLeads={stats?.youtubeCount || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F17]">
        {/* Navbar */}
        <Navbar
          currentTab={currentTab}
          onRefresh={fetchStats}
          isRefreshing={loadingStats}
          onSelectTab={(tab) => setCurrentTab(tab)}
          mockMode={false}
          killSwitchActive={killSwitchActive}
          onKillSwitchToggled={(active) => setKillSwitchActive(active)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60">
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              loading={loadingStats}
              onSelectTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {/* Live Inbound Replies Inbox */}
          {currentTab === 'inbox' && (
            <RepliesInbox onRepliesUpdated={fetchStats} />
          )}

          {/* Bulk Mass Campaign Hub */}
          {currentTab === 'bulk_campaign' && (
            <BulkCampaign onCampaignUpdated={fetchStats} />
          )}

          {/* Business (Google Maps) Hub */}
          {currentTab === 'places_search' && (
            <PlacesSearch
              onLeadsSaved={() => {
                fetchStats();
                setCurrentTab('places_queue');
              }}
              onOpenCampaign={() => setCurrentTab('bulk_campaign')}
            />
          )}

          {currentTab === 'places_crm' && (
            <LeadsCRM
              sourcePreset="google_places"
              onLeadsUpdated={fetchStats}
              onOpenQueue={() => setCurrentTab('places_queue')}
              onOpenCampaign={() => setCurrentTab('bulk_campaign')}
            />
          )}

          {currentTab === 'places_queue' && (
            <PitchQueue
              sourcePreset="google_places"
              onQueueUpdated={fetchStats}
            />
          )}

          {/* YouTube Creators Hub */}
          {currentTab === 'youtube_search' && (
            <YoutubeSearch
              onLeadsSaved={() => {
                fetchStats();
                setCurrentTab('youtube_queue');
              }}
            />
          )}

          {currentTab === 'youtube_crm' && (
            <LeadsCRM
              sourcePreset="youtube"
              onLeadsUpdated={fetchStats}
              onOpenQueue={() => setCurrentTab('youtube_queue')}
              onOpenCampaign={() => setCurrentTab('bulk_campaign')}
            />
          )}

          {currentTab === 'youtube_queue' && (
            <PitchQueue
              sourcePreset="youtube"
              onQueueUpdated={fetchStats}
            />
          )}

          {/* Settings */}
          {currentTab === 'settings' && (
            <Settings onSettingsSaved={fetchStats} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
