import React, { useState, useEffect, useRef } from 'react';
import {
  getSettings,
  saveSettings,
  testApiKey,
  getWhatsAppStatus,
  getWhatsAppAccounts,
  connectWhatsAppAccount,
  disconnectWhatsAppAccount,
  connectWhatsApp,
  disconnectWhatsApp,
  testSmtpSettings,
  testResendKey,
} from '../../services/api';
import { AppSettings, PitchTone, WhatsAppStatusState, WhatsAppAccountState } from '../../types';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Youtube,
  Cpu,
  Save,
  HelpCircle,
  ExternalLink,
  Info,
  FolderCheck,
  ArrowUpRight,
  MessageCircle,
  QrCode,
  Smartphone,
  RefreshCw,
  LogOut,
  Zap,
  Mail,
  Plus,
  Users,
} from 'lucide-react';

import confetti from 'canvas-confetti';

interface SettingsProps {
  onSettingsSaved: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // WhatsApp State
  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const pollingRef = useRef<any>(null);

  // Test states
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingResend, setTestingResend] = useState(false);
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const loadWhatsAppStatus = async () => {
    try {
      const data = await getWhatsAppStatus();
      setWaState(data);
      if (data.status === 'qr_ready' || data.status === 'connecting') {
        startPolling();
      }
    } catch (err) {
      console.error('Failed to load WhatsApp status:', err);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getWhatsAppStatus();
        setWaState(data);
        if (data.status === 'connected') {
          stopPolling();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleConnectWhatsApp = async (force: boolean = true) => {
    setWaLoading(true);
    try {
      await connectWhatsAppAccount('account_1', 'Primary WhatsApp', force);
      const data = await getWhatsAppStatus();
      setWaState(data);
      startPolling();
    } catch (err: any) {
      console.error('Failed to connect WhatsApp session:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setWaLoading(true);
    try {
      await disconnectWhatsAppAccount('account_1');
      const data = await getWhatsAppStatus();
      setWaState(data);
      stopPolling();
    } catch (err: any) {
      console.error('Failed to disconnect WhatsApp session:', err);
    } finally {
      setWaLoading(false);
    }
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
      // First save settings so backend has latest values
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
    if (!settings.resendApiKey) return;
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
        message: err.response?.data?.message || err.message || 'Resend verification failed.',
      });
    } finally {
      setTestingResend(false);
    }
  };

  const services = [
    {
      id: 'google_places' as const,
      label: 'Google Places API Key',
      keyField: 'googlePlacesApiKey' as keyof AppSettings,
      hasKeyField: 'hasGooglePlacesKey' as keyof AppSettings,
      icon: MapPin,
      color: 'text-sky-400',
      helpUrl: settings.detectedGoogleProject?.projectId
        ? `https://console.cloud.google.com/apis/credentials?project=${settings.detectedGoogleProject.projectId}`
        : 'https://developers.google.com/maps/documentation/places/web-service/get-api-key',
      placeholder: 'AIzaSy...',
      desc: 'Used for business search, ratings, phone numbers and physical address lookup.',
    },
    {
      id: 'youtube' as const,
      label: 'YouTube Data API v3 Key',
      keyField: 'youtubeApiKey' as keyof AppSettings,
      hasKeyField: 'hasYoutubeKey' as keyof AppSettings,
      icon: Youtube,
      color: 'text-rose-400',
      helpUrl: settings.detectedGoogleProject?.projectId
        ? `https://console.cloud.google.com/apis/credentials?project=${settings.detectedGoogleProject.projectId}`
        : 'https://developers.google.com/youtube/v3/getting-started',
      placeholder: 'AIzaSy...',
      desc: 'Used to search creators, subscriber counts, total views, and video metrics.',
    },
    {
      id: 'gemini' as const,
      label: 'Google Gemini API Key (Gemini 3.6 Flash Active)',
      keyField: 'geminiApiKey' as keyof AppSettings,
      hasKeyField: 'hasGeminiKey' as keyof AppSettings,
      icon: Sparkles,
      color: 'text-indigo-400',
      helpUrl: 'https://aistudio.google.com/app/apikey',
      placeholder: 'AIzaSy...',
      desc: 'Powers fast, personalized <70-word outreach pitch generation with live AI.',
    },
    {
      id: 'claude' as const,
      label: 'Anthropic Claude API Key',
      keyField: 'claudeApiKey' as keyof AppSettings,
      hasKeyField: 'hasClaudeKey' as keyof AppSettings,
      icon: Cpu,
      color: 'text-amber-400',
      helpUrl: 'https://console.anthropic.com/settings/keys',
      placeholder: 'sk-ant-api03-...',
      desc: 'Alternative premium AI model for hyper-custom outreach copywriting.',
    },
  ];

  const detected = settings.detectedGoogleProject;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
          <KeyRound className="h-5 w-5 text-sky-400" />
          <span>Integrations, WhatsApp Pairing & System Settings</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure official Google APIs, Google Gemini AI key, and pair your WhatsApp account via QR Code for 1-click in-app direct messaging.
        </p>
      </div>

      {/* WHATSAPP WEB IN-APP PAIRING CARD */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">WhatsApp Web In-App Automation</h3>
                {waState?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected (+{waState.userPhone || 'Active'})
                  </span>
                ) : waState?.status === 'qr_ready' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    QR Ready to Scan
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pair your WhatsApp account via QR code to automatically send cold pitches in the background (Zero Tabs needed).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {waState?.status === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnectWhatsApp}
                disabled={waLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConnectWhatsApp(true)}
                disabled={waLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <QrCode className={`h-4 w-4 ${waLoading ? 'animate-spin' : ''}`} />
                <span>
                  {waLoading
                    ? 'Generating QR...'
                    : waState?.status === 'qr_ready'
                    ? 'Refresh QR Code'
                    : 'Scan QR Code (Pair)'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Display & Instructions */}
        {waState?.status === 'qr_ready' && waState.qrCodeDataUrl && (
          <div className="p-5 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center gap-6 animate-in fade-in">
            <div className="p-3 bg-white rounded-2xl shadow-2xl shrink-0">
              <img
                src={waState.qrCodeDataUrl}
                alt="WhatsApp QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            </div>

            <div className="space-y-3 text-xs text-slate-300 flex-1">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span>How to pair WhatsApp:</span>
              </div>
              <ol className="space-y-1.5 list-decimal list-inside text-slate-300 leading-relaxed">
                <li>Open <strong>WhatsApp</strong> on your phone.</li>
                <li>Tap <strong>Settings (iPhone)</strong> or <strong>Three Dots (Android)</strong> ➔ <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and point your camera at the QR code on the left.</li>
              </ol>
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold pt-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Listening for scan... Page will auto-connect once scanned!</span>
              </div>
            </div>
          </div>
        )}

        {waState?.status === 'connected' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-200">WhatsApp is Linked and Ready!</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Active account: <strong>+{waState.userPhone}</strong> ({waState.userName || 'Linked Device'}). You can now launch automated batch campaigns from the Bulk Campaign tab.
              </p>
            </div>
          </div>
        )}

        {waState?.errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{waState.errorMessage}</span>
          </div>
        )}
      </div>

      {/* Detected Google Cloud Credentials Banner */}
      {detected?.found && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <FolderCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Google Cloud Project Detected: <span className="font-mono text-sky-300">{detected.projectId}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Found <code className="text-sky-400 font-mono">client_secret.json</code> in your folder.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              OAuth File Detected
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Info className="h-3.5 w-3.5" />
              <span>Note on Google API Key vs OAuth Secret:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Places Search and YouTube Creator Search use a standard <strong>Google API Key</strong> (<code className="text-sky-400">AIzaSy...</code>). You can generate it inside this existing project in 10 seconds:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`https://console.cloud.google.com/apis/credentials?project=${detected.projectId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-colors"
              >
                <span>1. Generate API Key in "{detected.projectId}"</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>

              <a
                href={`https://console.cloud.google.com/apis/library/places.googleapis.com?project=${detected.projectId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <span>2. Enable Places API</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>

              <a
                href={`https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=${detected.projectId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <span>3. Enable YouTube API</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {saveMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Keys Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Integration Credentials</h3>

          <div className="grid grid-cols-1 gap-4">
            {services.map((s) => {
              const Icon = s.icon;
              const hasKey = Boolean(settings[s.hasKeyField]);
              const testResult = testResults[s.id];
              const isTesting = testingService === s.id;

              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl bg-slate-800 border border-slate-700 ${s.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                          {s.label}
                          {hasKey && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Configured
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{s.desc}</p>
                      </div>
                    </div>

                    <a
                      href={s.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={(settings[s.keyField] as string) || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, [s.keyField]: e.target.value })
                      }
                      placeholder={s.placeholder}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleTestKey(s.id)}
                      disabled={isTesting}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isTesting ? 'Testing...' : 'Test Key'}
                    </button>
                  </div>

                  {/* Test Feedback */}
                  {testResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resend Email API Configuration Card (Fast & Free) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-100">Resend Email API (High Speed Auto-Sending)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300">
                    3,000 Free Emails/Month ⚡
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send cold outreach emails directly in the background using your Resend API Key (Zero Password needed).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestResend}
              disabled={testingResend || !settings.resendApiKey}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={`h-3 w-3 ${testingResend ? 'animate-spin' : ''}`} />
              <span>{testingResend ? 'Testing...' : 'Test Resend API'}</span>
            </button>
          </div>

          {resendResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                resendResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {resendResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{resendResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Resend API Key
              </label>
              <input
                type="password"
                value={settings.resendApiKey || ''}
                onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                placeholder="re_..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Sender Email / From Address
              </label>
              <input
                type="text"
                value={settings.resendFromEmail || 'onboarding@resend.dev'}
                onChange={(e) => setSettings({ ...settings, resendFromEmail: e.target.value })}
                placeholder="e.g. onboarding@resend.dev or your custom domain email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Info className="h-3.5 w-3.5" />
              <span>Resend Domain & Cold Sending Note:</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Resend free sandbox (<code className="text-rose-300">onboarding@resend.dev</code>) allows sending test emails to your registered email (<code className="text-sky-300">adi319148@gmail.com</code>).
              To send cold outreach to external clients via API, add your custom domain at{' '}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:underline font-semibold"
              >
                resend.com/domains ↗
              </a>
              . Alternatively, use <strong>1-Click Gmail Web ↗</strong> in Bulk Campaign for 100% free unlimited sending with zero setup!
            </p>
          </div>
        </div>

        {/* Email SMTP Configuration Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Direct Email Automation (SMTP / Gmail App Password)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300">
                    Zero Tabs
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Send cold outreach emails directly in the background without opening browser tabs or external mail apps.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp || !settings.smtpUser || !settings.smtpPass}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${testingSmtp ? 'animate-spin' : ''}`} />
              <span>{testingSmtp ? 'Testing...' : 'Test SMTP Connection'}</span>
            </button>
          </div>

          {smtpResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                smtpResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {smtpResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{smtpResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Gmail / Sender Email Address
              </label>
              <input
                type="email"
                value={settings.smtpUser || ''}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                placeholder="e.g. yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                App Password (Gmail 16-character App Password)
              </label>
              <input
                type="password"
                value={settings.smtpPass || ''}
                onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                placeholder="e.g. abcd efgh ijkl mnop"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">SMTP Host Server</label>
              <input
                type="text"
                value={settings.smtpHost || 'smtp.gmail.com'}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">SMTP Port</label>
              <input
                type="text"
                value={settings.smtpPort || '465'}
                onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                placeholder="465 (SSL) or 587 (TLS)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Global Defaults */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Outreach Preferences</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default Pitch Persona</label>
              <select
                value={settings.defaultPitchTone || 'friendly'}
                onChange={(e) =>
                  setSettings({ ...settings, defaultPitchTone: e.target.value as PitchTone })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-sky-500"
              >
                <option value="friendly">Friendly & Conversational (&lt;70 words)</option>
                <option value="value_offer">Value Offer / Quick Audit</option>
                <option value="collab">Partnership / Collaboration</option>
                <option value="direct">Direct & Concise</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.mockModeEnabled)}
                  onChange={(e) =>
                    setSettings({ ...settings, mockModeEnabled: e.target.checked })
                  }
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 accent-sky-500"
                />
                <span>Force Demo/Simulation Mode for all queries</span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
