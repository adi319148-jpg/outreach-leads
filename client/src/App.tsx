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
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { UpdateBanner } from './components/Layout/UpdateBanner';
import { LoginPage } from './components/Auth/LoginPage';
import { LandingPage } from './components/Landing/LandingPage';
import { getDashboardStats, getLeads, getInboundReplies, getSettings, checkForAppUpdates, verifyAccessKey } from './services/api';
import { DashboardStats, AppUpdateInfo, AccessKeyInfo } from './types';
import { getDeviceId } from './utils/deviceFingerprint';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLoginGate, setShowLoginGate] = useState<boolean>(false);
  const [currentKeyInfo, setCurrentKeyInfo] = useState<{
    id: number;
    keyCode: string;
    label: string;
    isAdmin?: boolean;
    planType?: string;
    activatedAt?: string | null;
    expiresAt?: string | null;
    daysRemaining?: number | null;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaignQueueCount, setCampaignQueueCount] = useState<number>(0);
  const [unreadRepliesCount, setUnreadRepliesCount] = useState<number>(0);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);

  // Authentication check on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('outreach_access_key') || sessionStorage.getItem('outreach_access_key');
    if (!savedKey) {
      setIsAuthenticated(false);
      return;
    }

    verifyAccessKey(savedKey, getDeviceId())
      .then((res) => {
        if (res.success && res.valid) {
          setIsAuthenticated(true);
          if (res.keyInfo) setCurrentKeyInfo(res.keyInfo);
          fetchStats();
        } else {
          localStorage.removeItem('outreach_access_key');
          sessionStorage.removeItem('outreach_access_key');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        // In case server is starting up or offline, allow persistent key
        setIsAuthenticated(true);
        fetchStats();
      });
  }, []);

  const handleLoginSuccess = (keyInfo: { id: number; keyCode: string; label: string }) => {
    setCurrentKeyInfo(keyInfo);
    setIsAuthenticated(true);
    fetchStats();
  };

  const handleLogout = () => {
    localStorage.removeItem('outreach_access_key');
    sessionStorage.removeItem('outreach_access_key');
    localStorage.removeItem('outreach_session_token');
    sessionStorage.removeItem('outreach_session_token');
    setIsAuthenticated(false);
    setCurrentKeyInfo(null);
  };

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
    if (!isAuthenticated) return;

    fetchStats();

    // Check for software updates on start
    checkForAppUpdates()
      .then((info) => {
        if (info && info.updateAvailable) {
          setUpdateInfo(info);
        }
      })
      .catch(() => {});

    const interval = setInterval(async () => {
      try {
        const replies = await getInboundReplies();
        setUnreadRepliesCount((prev) => (prev !== replies.unreadCount ? replies.unreadCount || 0 : prev));
      } catch (err) {
        // ignore
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Loading state while checking stored authentication key
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center text-white font-mono text-xs gap-3">
        <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="tracking-wider">INITIALIZING OUTREACH AI...</span>
      </div>
    );
  }

  // If not authenticated, render Homepage Landing Page or Passkey Login Gate
  if (!isAuthenticated) {
    if (showLoginGate) {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setShowLoginGate(false)}
        />
      );
    }
    return <LandingPage onOpenLogin={() => setShowLoginGate(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090b] text-white overflow-hidden font-sans">
      {/* Live In-App Update Notification Banner */}
      <UpdateBanner updateInfo={updateInfo} />

      <div className="flex flex-1 overflow-hidden">
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
        isAdmin={Boolean(currentKeyInfo?.isAdmin)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
        {/* Navbar */}
        <Navbar
          currentTab={currentTab}
          onRefresh={fetchStats}
          isRefreshing={loadingStats}
          onSelectTab={(tab) => setCurrentTab(tab)}
          mockMode={false}
          killSwitchActive={killSwitchActive}
          onKillSwitchToggled={(active) => setKillSwitchActive(active)}
          keyInfo={currentKeyInfo}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-[#09090b]">
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              loading={loadingStats}
              onSelectTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {/* Super Admin Console (Admin Only) */}
          {currentTab === 'admin_panel' && (
            <AdminPanel
              currentAdminKey={currentKeyInfo?.keyCode}
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
              onOpenSettings={() => setCurrentTab('settings')}
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
              onOpenCampaign={() => setCurrentTab('bulk_campaign')}
              onOpenSettings={() => setCurrentTab('settings')}
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
  </div>
  );
};

export default App;
