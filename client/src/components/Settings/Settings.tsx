import React, { useState, useEffect, useRef } from 'react';
import {
  getSettings,
  saveSettings,
  testApiKey,
  getWhatsAppStatus,
  getWhatsAppAccounts,
  connectWhatsAppAccount,
  disconnectWhatsAppAccount,
  deleteWhatsAppAccount,
  testSmtpSettings,
  testResendKey,
  checkForAppUpdates,
} from '../../services/api';
import { AppSettings, PitchTone, WhatsAppStatusState, WhatsAppAccountState, AppUpdateInfo } from '../../types';
import { ApiKeyGuideModal } from './ApiKeyGuideModal';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Youtube,
  Cpu,
  Save,
  ExternalLink,
  MessageCircle,
  QrCode,
  Smartphone,
  RefreshCw,
  LogOut,
  Mail,
  Eye,
  EyeOff,
  BookOpen,
  Plus,
  Trash2,
  Users,
  Phone,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsProps {
  onSettingsSaved: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<AppSettings>({
    googlePlacesApiKey: '',
    youtubeApiKey: '',
    geminiApiKey: '',
    claudeApiKey: '',
    defaultPitchTone: 'friendly',
    mockModeEnabled: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '465',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    resendApiKey: '',
    resendFromEmail: 'onboarding@resend.dev',
    updateFeedUrl: 'https://raw.githubusercontent.com/outreachai/releases/main/version.json',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Guide Modal State
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideInitialTab, setGuideInitialTab] = useState<string>('google_places');

  const openGuideFor = (tab: string) => {
    setGuideInitialTab(tab);
    setShowGuideModal(true);
  };

  // Multi-Account WhatsApp state
  const [waAccounts, setWaAccounts] = useState<WhatsAppAccountState[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('account_1');
  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const pollingRef = useRef<any>(null);

  // Test states
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingResend, setTestingResend] = useState(false);
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAddResendModal, setShowAddResendModal] = useState(false);
  const [newResendKeyInput, setNewResendKeyInput] = useState('');
  const [resendViewMode, setResendViewMode] = useState<'list' | 'raw'>('list');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<AppUpdateInfo | null>(null);

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const data = await checkForAppUpdates();
      setUpdateResult(data);
    } catch (e) {
      setUpdateResult({
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
        message: 'Could not connect to update feed.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadWhatsAppStatus();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppStatus = async (targetSessionId?: string) => {
    const sId = targetSessionId || selectedSessionId;
    try {
      const [accountsData, statusData] = await Promise.all([
        getWhatsAppAccounts().catch(() => []),
        getWhatsAppStatus(sId).catch(() => null),
      ]);

      if (Array.isArray(accountsData) && accountsData.length > 0) {
        setWaAccounts(accountsData);
      } else {
        setWaAccounts([{
          id: 'account_1',
          name: 'Primary WhatsApp',
          status: statusData?.status || 'disconnected',
          qrCodeDataUrl: statusData?.qrCodeDataUrl || null,
          userPhone: statusData?.userPhone || null,
          userName: statusData?.userName || null,
          errorMessage: null,
          lastActive: null,
        }]);
      }

      if (statusData) {
        setWaState(statusData);
        if (statusData.status === 'qr_ready' || statusData.status === 'connecting') {
          startPolling(sId);
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp status:', err);
    }
  };

  const startPolling = (sId: string = selectedSessionId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const [accountsData, data] = await Promise.all([
          getWhatsAppAccounts().catch(() => []),
          getWhatsAppStatus(sId),
        ]);
        if (Array.isArray(accountsData) && accountsData.length > 0) {
          setWaAccounts(accountsData);
        }
        setWaState(data);
        if (data.status === 'connected') {
          stopPolling();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 1200);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleSelectAccount = (sId: string) => {
    stopPolling();
    setSelectedSessionId(sId);
    setWaLoading(true);
    getWhatsAppStatus(sId)
      .then((data) => {
        setWaState(data);
        if (data.status === 'qr_ready' || data.status === 'connecting') {
          startPolling(sId);
        }
      })
      .finally(() => setWaLoading(false));
  };

  const handleConnectWhatsApp = async (sId: string = selectedSessionId, force: boolean = true) => {
    setWaLoading(true);
    try {
      const currentAcc = waAccounts.find((a) => a.id === sId);
      const accName = currentAcc?.name || `WhatsApp Account ${sId}`;
      await connectWhatsAppAccount(sId, accName, force);
      const data = await getWhatsAppStatus(sId);
      setWaState(data);
      startPolling(sId);
    } catch (err: any) {
      console.error('Failed to connect WhatsApp session:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async (sId: string = selectedSessionId) => {
    setWaLoading(true);
    try {
      await disconnectWhatsAppAccount(sId);
      const data = await getWhatsAppStatus(sId);
      setWaState(data);
      stopPolling();
      loadWhatsAppStatus(sId);
    } catch (err: any) {
      console.error('Failed to disconnect WhatsApp session:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDeleteAccount = async (sId: string) => {
    if (!confirm('Are you sure you want to remove this WhatsApp account?')) return;
    setWaLoading(true);
    try {
      await deleteWhatsAppAccount(sId);
      const nextAccounts = waAccounts.filter((a) => a.id !== sId);
      const fallbackId = nextAccounts[0]?.id || 'account_1';
      setSelectedSessionId(fallbackId);
      loadWhatsAppStatus(fallbackId);
    } catch (err) {
      console.error('Failed to delete WhatsApp account:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleCreateNewAccount = async () => {
    const nextIndex = waAccounts.length + 1;
    const newSessionId = `account_${Date.now()}`;
    const label = newAccountLabel.trim() || `WhatsApp Account #${nextIndex}`;
    setShowAddAccountModal(false);
    setNewAccountLabel('');
    setSelectedSessionId(newSessionId);
    handleConnectWhatsApp(newSessionId, true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await saveSettings(settings);
      setSaveMsg(res.message || 'Settings saved successfully.');
      onSettingsSaved();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setSaveMsg(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (service: 'google_places' | 'youtube' | 'gemini' | 'claude') => {
    setTestingService(service);
    try {
      const keyMap: Record<string, string | undefined> = {
        google_places: settings.googlePlacesApiKey,
        youtube: settings.youtubeApiKey,
        gemini: settings.geminiApiKey,
        claude: settings.claudeApiKey,
      };

      const res = await testApiKey(service, keyMap[service]);
      setTestResults((prev) => ({
        ...prev,
        [service]: { success: res.success, message: res.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: false,
          message: err.response?.data?.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpResult(null);
    try {
      await saveSettings(settings);
      const res = await testSmtpSettings({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
      });
      setSmtpResult(res);
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setSmtpResult({
        success: false,
        message: err.response?.data?.message || err.message || 'SMTP Connection failed.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestResend = async () => {
    setTestingResend(true);
    setResendResult(null);
    try {
      await saveSettings(settings);
      const res = await testResendKey(settings.resendApiKey);
      setResendResult(res);
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setResendResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Resend API test failed.',
      });
    } finally {
      setTestingResend(false);
    }
  };

  const getResendKeysList = (): string[] => {
    return (settings.resendApiKey || '')
      .split(/[\n,;\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
  };

  const handleAddResendKey = () => {
    const keyToAdd = newResendKeyInput.trim();
    if (!keyToAdd) return;
    const currentKeys = getResendKeysList();
    if (currentKeys.includes(keyToAdd)) {
      alert('This Resend API key is already in your rotation pool!');
      return;
    }
    const updatedKeys = [...currentKeys, keyToAdd];
    setSettings({ ...settings, resendApiKey: updatedKeys.join('\n') });
    setNewResendKeyInput('');
    setShowAddResendModal(false);
    confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
  };

  const handleRemoveResendKey = (indexToRemove: number) => {
    const currentKeys = getResendKeysList();
    const updatedKeys = currentKeys.filter((_, idx) => idx !== indexToRemove);
    setSettings({ ...settings, resendApiKey: updatedKeys.join('\n') });
  };

  const handleTestSingleResendKey = async (key: string) => {
    setTestingResend(true);
    setResendResult(null);
    try {
      const res = await testResendKey(key);
      setResendResult(res);
      if (res.success) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setResendResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Single key test failed.',
      });
    } finally {
      setTestingResend(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Loading Configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-zinc-900 text-white border border-zinc-750">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Settings & Configuration
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your personal API keys, WhatsApp connections, and email dispatch preferences.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openGuideFor('google_places')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>📖 Complete Setup Guide</span>
        </button>
      </div>

      {/* WHATSAPP MULTI-ACCOUNT HUB */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">WhatsApp Multi-Account Automation</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {waAccounts.filter((a) => a.status === 'connected').length} of {waAccounts.length} Connected
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Link multiple WhatsApp numbers for automatic round-robin rotation & anti-ban safe dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openGuideFor('whatsapp')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
            >
              <BookOpen className="h-3 w-3" />
              <span>Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add WhatsApp Number</span>
            </button>
          </div>
        </div>

        {/* Account Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {waAccounts.map((acc) => {
            const isSelected = acc.id === selectedSessionId;
            const isConnected = acc.status === 'connected';
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectAccount(acc.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-zinc-900 border-white text-white font-bold shadow'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : acc.status === 'qr_ready' ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'}`} />
                <span>{acc.name || acc.id}</span>
                {acc.userPhone && (
                  <span className="text-[10px] font-mono text-zinc-400">({acc.userPhone.slice(-4)})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Account Control Box */}
        {(() => {
          const currentAcc = waAccounts.find((a) => a.id === selectedSessionId) || waAccounts[0];
          const isConnected = waState?.status === 'connected';
          const isScanning = waState?.status === 'qr_ready';

          return (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono uppercase">{currentAcc?.name || selectedSessionId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : isScanning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}>
                      {isConnected ? '🟢 CONNECTED' : isScanning ? '🟡 SCAN QR CODE' : '⚪ DISCONNECTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {isConnected ? `Linked Phone: ${waState?.userPhone || 'Active'} • Safe Cap: 40 msgs/day` : 'Click Connect to scan QR code with WhatsApp on your mobile phone.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectWhatsApp(selectedSessionId)}
                      disabled={waLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all"
                    >
                      <LogOut className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectWhatsApp(selectedSessionId, true)}
                      disabled={waLoading || waState?.status === 'connecting'}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>{isScanning ? 'Refresh QR Code' : 'Scan QR & Connect'}</span>
                    </button>
                  )}

                  {waAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(selectedSessionId)}
                      disabled={waLoading}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition-colors"
                      title="Remove this account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Scanner Display */}
              {isScanning && waState?.qrCodeDataUrl && (
                <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-750 flex flex-col md:flex-row items-center gap-6 justify-center animate-in fade-in">
                  <div className="p-3 bg-white rounded-2xl shadow-2xl">
                    <img src={waState.qrCodeDataUrl} alt="WhatsApp QR Code" className="h-44 w-44 object-contain" />
                  </div>
                  <div className="space-y-2 text-xs text-zinc-300 max-w-sm">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Scan with {currentAcc?.name || 'this WhatsApp'}:</span>
                    </h4>
                    <ol className="list-decimal pl-4 space-y-1 text-zinc-400">
                      <li>Open <strong>WhatsApp</strong> on your phone.</li>
                      <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> ➔ <strong>Linked Devices</strong>.</li>
                      <li>Tap <strong>Link a Device</strong> and point your camera at this QR code.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Modal for adding new WhatsApp account */}
        {showAddAccountModal && (
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-white" />
              <span>Link Another WhatsApp Phone Number</span>
            </h4>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300">Account Label / Name</label>
              <input
                type="text"
                value={newAccountLabel}
                onChange={(e) => setNewAccountLabel(e.target.value)}
                placeholder={`e.g. Sales Phone #${waAccounts.length + 1} or Support WhatsApp`}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-750 text-xs text-white placeholder-zinc-500 focus:border-white"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewAccount}
                className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow"
              >
                Create & Show QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {saveMsg && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>{saveMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Google Places API Key */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Places API Key</h3>
                <p className="text-xs text-zinc-400">Used for searching businesses and clinics on Google Maps.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openGuideFor('google_places')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>Guide</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestKey('google_places')}
                disabled={testingService === 'google_places'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${testingService === 'google_places' ? 'animate-spin' : ''}`} />
                <span>Test Key</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKeys['places'] ? 'text' : 'password'}
              value={settings.googlePlacesApiKey || ''}
              onChange={(e) => setSettings({ ...settings, googlePlacesApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
            />
            <button
              type="button"
              onClick={() => toggleShowKey('places')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
            >
              {showKeys['places'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {testResults['google_places'] && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testResults['google_places'].success ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
              <span>{testResults['google_places'].message}</span>
            </div>
          )}
        </div>

        {/* 2. YouTube Data API Key */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <Youtube className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">YouTube Data API v3 Key</h3>
                <p className="text-xs text-zinc-400">Used for discovering YouTube creators, channels, and metrics.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openGuideFor('youtube')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>Guide</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestKey('youtube')}
                disabled={testingService === 'youtube'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${testingService === 'youtube' ? 'animate-spin' : ''}`} />
                <span>Test Key</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKeys['youtube'] ? 'text' : 'password'}
              value={settings.youtubeApiKey || ''}
              onChange={(e) => setSettings({ ...settings, youtubeApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
            />
            <button
              type="button"
              onClick={() => toggleShowKey('youtube')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
            >
              {showKeys['youtube'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {testResults['youtube'] && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testResults['youtube'].success ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
              <span>{testResults['youtube'].message}</span>
            </div>
          )}
        </div>

        {/* 3. Gemini AI Key */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Gemini API Key (Free)</h3>
                <p className="text-xs text-zinc-400">Used for generating tailored pitches, audits, and tone-matched replies.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openGuideFor('gemini')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>Free Key Guide</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestKey('gemini')}
                disabled={testingService === 'gemini'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all"
              >
                <RefreshCw className={`h-3 w-3 ${testingService === 'gemini' ? 'animate-spin' : ''}`} />
                <span>Test Key</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKeys['gemini'] ? 'text' : 'password'}
              value={settings.geminiApiKey || ''}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
            />
            <button
              type="button"
              onClick={() => toggleShowKey('gemini')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
            >
              {showKeys['gemini'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {testResults['gemini'] && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testResults['gemini'].success ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
              <span>{testResults['gemini'].message}</span>
            </div>
          )}
        </div>

        {/* 4. Direct Email SMTP Dispatch */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Direct In-App Email (Gmail SMTP)</h3>
                <p className="text-xs text-zinc-400">Send cold outreach emails directly in the background.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openGuideFor('gmail_smtp')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>App Password Guide</span>
              </button>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp || !settings.smtpUser || !settings.smtpPass}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${testingSmtp ? 'animate-spin' : ''}`} />
                <span>{testingSmtp ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {smtpResult && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${smtpResult.success ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
              <span>{smtpResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Sender Email Address</label>
              <input
                type="email"
                value={settings.smtpUser || ''}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">App Password (Gmail 16-character App Password)</label>
              <input
                type={showKeys['smtp'] ? 'text' : 'password'}
                value={settings.smtpPass || ''}
                onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                placeholder="abcd efgh ijkl mnop"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
              />
            </div>
          </div>
        </div>

        {/* 5. Resend Cloud Email API (Multi-Key Rotation & Account Manager) */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">Resend Cloud Email API (Multi-Key Rotation)</h3>
                  {(() => {
                    const keys = getResendKeysList();
                    const count = keys.length;
                    return count > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-emerald-400 border border-zinc-700">
                        ⚡ {count} Key{count > 1 ? 's' : ''} Active • {(count * 3000).toLocaleString()} Free Emails/Mo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">
                        0 Keys in Pool
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-zinc-400">
                  Connect multiple free Resend keys to multiply quotas and auto-rotate senders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddResendModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Resend Key</span>
              </button>

              <button
                type="button"
                onClick={() => setResendViewMode(resendViewMode === 'list' ? 'raw' : 'list')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
                title="Switch between card list and raw paste"
              >
                <Layers className="h-3 w-3" />
                <span>{resendViewMode === 'list' ? 'Raw Paste' : 'Cards View'}</span>
              </button>

              <button
                type="button"
                onClick={() => openGuideFor('resend')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>Guide</span>
              </button>

              <button
                type="button"
                onClick={handleTestResend}
                disabled={testingResend || !settings.resendApiKey}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${testingResend ? 'animate-spin' : ''}`} />
                <span>{testingResend ? 'Testing...' : 'Test All Keys'}</span>
              </button>
            </div>
          </div>

          {resendResult && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${resendResult.success ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
              <span>{resendResult.message}</span>
            </div>
          )}

          {/* Modal / Form to Add New Resend Key */}
          {showAddResendModal && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Add Another Resend API Key to Rotation Pool</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">+3,000 Emails/Mo</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Resend API Key (starts with <span className="font-mono text-zinc-400">re_...</span>)
                </label>
                <input
                  type="text"
                  value={newResendKeyInput}
                  onChange={(e) => setNewResendKeyInput(e.target.value)}
                  placeholder="re_123456789_abcdefg..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddResendModal(false);
                    setNewResendKeyInput('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddResendKey}
                  disabled={!newResendKeyInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow disabled:opacity-40 cursor-pointer"
                >
                  + Add Key to Pool
                </button>
              </div>
            </div>
          )}

          {/* Key List Display vs Raw Textarea */}
          {resendViewMode === 'list' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="font-semibold text-zinc-300">Configured Resend Accounts & Rotation Keys</span>
                <span className="text-[11px] font-mono">{getResendKeysList().length} in pool</span>
              </div>

              {getResendKeysList().length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 text-center space-y-3">
                  <div className="p-3 w-fit mx-auto rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800">
                    <Mail className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    No Resend API keys added yet. Add free Resend keys to rotate and multiply your monthly email quotas (3,000 free emails per key).
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddResendModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Your First Resend Key</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {getResendKeysList().map((key, idx) => {
                    const isVisible = showKeys[`resend_${idx}`];
                    const masked = key.length > 8 ? `${key.slice(0, 4)}••••••••${key.slice(-4)}` : '••••••••';

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-750 shrink-0">
                            Key #{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-zinc-200 truncate">
                            {isVisible ? key : masked}
                          </span>
                          <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-900 text-emerald-400 border border-zinc-800 shrink-0">
                            +3,000/mo
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleShowKey(`resend_${idx}`)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                            title={isVisible ? 'Hide Key' : 'Show Key'}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestSingleResendKey(key)}
                            disabled={testingResend}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold border border-zinc-800 transition-colors"
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove Key #${idx + 1} from rotation pool?`)) {
                                handleRemoveResendKey(idx);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition-colors"
                            title="Remove Key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowAddResendModal(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-900/60 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Another Resend Key / Account</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Raw Resend API Keys (Multi-Line)</label>
                <span className="text-[10px] text-zinc-500 font-mono">1 key per line or comma-separated</span>
              </div>
              <textarea
                rows={3}
                value={settings.resendApiKey || ''}
                onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                placeholder="re_key1...&#10;re_key2...&#10;re_key3..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white resize-y"
              />
            </div>
          )}

          {/* Sender / From Email */}
          <div className="pt-2 border-t border-zinc-850">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Sender / From Email Address</label>
              <input
                type="text"
                value={settings.resendFromEmail || ''}
                onChange={(e) => setSettings({ ...settings, resendFromEmail: e.target.value })}
                placeholder="onboarding@resend.dev or yourname@yourdomain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:border-white"
              />
              <p className="text-[11px] text-zinc-500">
                Default sandbox is <span className="font-mono text-zinc-400">onboarding@resend.dev</span>. Once you verify a custom domain in Resend, you can use any from-address (e.g. <span className="font-mono text-zinc-400">alex@youragency.com</span>).
              </p>
            </div>
          </div>
        </div>

        {/* 6. Software Updates & Version */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Software Updates & Version</h3>
                <p className="text-xs text-zinc-400">
                  Current Installed Version: <span className="font-bold text-white font-mono">v1.0.0</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
            </button>
          </div>

          {updateResult && (
            <div className={`p-4 rounded-xl text-xs space-y-2.5 border ${updateResult.updateAvailable ? 'bg-zinc-900 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-white shrink-0" />
                  <span className="font-semibold">
                    {updateResult.updateAvailable ? `🎉 New Update Available: v${updateResult.latestVersion}` : 'You are on the latest version (v1.0.0).'}
                  </span>
                </div>

                {updateResult.updateAvailable && updateResult.downloadUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(updateResult.downloadUrl, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow transition-all"
                  >
                    <span>Download v{updateResult.latestVersion} (.EXE)</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>

              {updateResult.releaseNotes && (
                <p className="text-zinc-400 text-xs bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <strong className="text-white">What's New:</strong> {updateResult.releaseNotes}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span>Update Manifest Feed URL</span>
              <span className="text-[10px] text-zinc-500 font-normal">Where app checks for new versions</span>
            </label>
            <input
              type="text"
              value={settings.updateFeedUrl || ''}
              onChange={(e) => setSettings({ ...settings, updateFeedUrl: e.target.value })}
              placeholder="https://raw.githubusercontent.com/outreachai/releases/main/version.json"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono focus:border-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Interactive In-App API Key & Setup Guide Modal */}
      <ApiKeyGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        initialTab={guideInitialTab}
      />
    </div>
  );
};
