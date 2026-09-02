import React, { useState, useEffect } from 'react';
import {
  getAccessKeys,
  createAccessKey,
  toggleAccessKey,
  updateAccessKeyPlan,
  resetDeviceBinding,
  extendAccessKey,
  deleteAccessKey,
  getSettings,
} from '../../services/api';
import { AccessKeyInfo, AppSettings } from '../../types';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Shield,
  RefreshCw,
  ExternalLink,
  Users,
  Database,
  Lock,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminPanelProps {
  currentAdminKey?: string;
  onSelectTab?: (tab: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentAdminKey }) => {
  const [accessKeys, setAccessKeys] = useState<AccessKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // New Key Form
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newCustomKey, setNewCustomKey] = useState('');
  const [newKeyPlan, setNewKeyPlan] = useState<'starter' | 'pro'>('starter');
  const [newKeyDuration, setNewKeyDuration] = useState<number>(30);
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoadingKeys(true);
    try {
      const [keysRes, settingsRes] = await Promise.all([
        getAccessKeys(),
        getSettings(),
      ]);
      if (keysRes.success) setAccessKeys(keysRes.keys);
      if (settingsRes) setSettings(settingsRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) {
      setActionMsg({ type: 'error', text: 'Please specify a client name or label.' });
      return;
    }

    setCreatingKey(true);
    setActionMsg(null);

    try {
      const res = await createAccessKey({
        label: newKeyLabel.trim(),
        customKey: newCustomKey.trim() || undefined,
        planType: newKeyPlan,
        durationDays: newKeyDuration,
      });

      if (res.success && res.key) {
        setAccessKeys((prev) => [res.key!, ...prev]);
        setNewKeyLabel('');
        setNewCustomKey('');
        setNewKeyDuration(30);
        setShowNewKeyForm(false);
        setActionMsg({
          type: 'success',
          text: `New ${res.key.plan_type === 'starter' ? 'Starter (₹499/mo)' : 'Agency Pro (₹999/mo)'} access passkey created for ${res.key.label}!`,
        });
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Failed to create access key' });
      }
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to generate key',
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleExtendSubscription = async (id: number, label: string, days: number = 30) => {
    try {
      const res = await extendAccessKey(id, days);
      if (res.success) {
        setAccessKeys((prev) =>
          prev.map((k) =>
            k.id === id
              ? {
                  ...k,
                  expires_at: res.expiresAt || null,
                  is_active: 1,
                  days_left:
                    k.days_left !== null && k.days_left !== undefined && k.days_left > 0
                      ? k.days_left + days
                      : days,
                }
              : k
          )
        );
        setActionMsg({
          type: 'success',
          text: `Subscription extended by +${days} days for "${label}"! New expiry: ${
            res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : 'Active'
          }`,
        });
      } else {
        alert(res.error || 'Failed to extend subscription');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to extend subscription');
    }
  };

  const handleToggleKey = async (id: number, currentActive: number) => {
    try {
      const res = await toggleAccessKey(id, currentActive !== 1);
      if (res.success) {
        setAccessKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, is_active: currentActive === 1 ? 0 : 1 } : k))
        );
      }
    } catch (err) {
      console.error('Failed to toggle key:', err);
    }
  };

  const handleUpdatePlan = async (id: number, planType: 'starter' | 'pro') => {
    try {
      const res = await updateAccessKeyPlan(id, planType);
      if (res.success) {
        setAccessKeys((prev) =>
          prev.map((k) =>
            k.id === id
              ? {
                  ...k,
                  plan_type: planType,
                  daily_limit: planType === 'starter' ? 40 : 999999,
                  max_whatsapp_accounts: planType === 'starter' ? 1 : 10,
                }
              : k
          )
        );
        setActionMsg({
          type: 'success',
          text: `Plan updated to ${planType === 'starter' ? 'Starter (₹499/mo • 40 msgs/day)' : 'Agency Pro (₹999/mo • Unlimited)'}!`,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update subscription plan');
    }
  };

  const handleResetDevice = async (id: number, label: string) => {
    if (
      !confirm(
        `Are you sure you want to reset device lock for "${label}"?\n\nThe user will be able to bind their new computer/browser on their next login.`
      )
    ) {
      return;
    }
    try {
      const res = await resetDeviceBinding(id);
      if (res.success) {
        setAccessKeys((prev) =>
          prev.map((k) =>
            k.id === id
              ? { ...k, bound_device_id: null, bound_device_info: null, bound_at: null }
              : k
          )
        );
        setActionMsg({
          type: 'success',
          text: `Device lock released for "${label}". They can now bind a new machine!`,
        });
      } else {
        alert(res.error || 'Failed to reset device binding');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset device binding');
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Are you sure you want to permanently revoke and delete this client license?')) return;
    try {
      const res = await deleteAccessKey(id);
      if (res.success) {
        setAccessKeys((prev) => prev.filter((k) => k.id !== id));
        setActionMsg({ type: 'success', text: 'License key removed.' });
      } else {
        alert(res.error || 'Failed to delete key');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete key');
    }
  };

  const handleCopyKey = (key: AccessKeyInfo) => {
    navigator.clipboard.writeText(key.key_code);
    setCopiedKeyId(key.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const activeKeysCount = accessKeys.filter((k) => k.is_active === 1).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in pb-16 font-sans">
      {/* Top Super Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white text-zinc-950 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">Super Admin Console</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-zinc-950 uppercase tracking-wide">
                Admin Only
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Live Sync</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Issue client passkeys, control workspace permissions, and manage cloud database synchronization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={loadingKeys}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingKeys ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowNewKeyForm(!showNewKeyForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Client Key</span>
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-zinc-900 border-white text-white'
              : 'bg-zinc-900 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="text-zinc-500 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Licenses</span>
            <KeyRound className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{accessKeys.length}</p>
          <p className="text-[11px] text-zinc-500">Issued passkeys in system</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Starter Plan (₹199/mo)</span>
            <span className="text-xs">🥉</span>
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            {accessKeys.filter((k) => k.plan_type === 'starter').length}
          </p>
          <p className="text-[11px] text-zinc-400">1 WhatsApp • 40 Msgs/Day</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Agency Pro (Unlimited)</span>
            <span className="text-xs">🥇</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {accessKeys.filter((k) => k.plan_type !== 'starter' && k.key_code !== 'OUTREACH-PRO-2025').length}
          </p>
          <p className="text-[11px] text-emerald-400">Multi-Account • Unlimited</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Active Licenses</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeKeysCount}</p>
          <p className="text-[11px] text-zinc-400">Currently unlocked workspaces</p>
        </div>
      </div>

      {/* Generate New Key Form Modal / Drawer */}
      {showNewKeyForm && (
        <form onSubmit={handleCreateKey} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-700 space-y-4 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-300" />
              <span>Create New Client License Key</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Syncs automatically with Supabase</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Client / Business Name <span className="text-white">*</span>
              </label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="e.g. Client - Dr. Rahul Dental Clinic"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                required
              />
              <p className="text-[10px] text-zinc-500">Identifies who this key belongs to</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Custom Key Code <span className="text-zinc-500 font-normal">(Optional - auto-generated if left blank)</span>
              </label>
              <input
                type="text"
                value={newCustomKey}
                onChange={(e) => setNewCustomKey(e.target.value)}
                placeholder="e.g. OUTREACH-CLIENT-2025"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs text-white placeholder-zinc-500 font-mono uppercase focus:border-white focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500">Leave empty for secure random format (OUTREACH-XXXX-XXXX-XXXX)</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-300">
                Assigned License Plan Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewKeyPlan('starter')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newKeyPlan === 'starter'
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs">Starter Plan (₹499/mo)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">1 Account • 40 Msgs/Day • 200 Google Maps Leads/Day</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewKeyPlan('pro')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newKeyPlan === 'pro'
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Agency Pro Plan (₹999/mo)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-white text-black font-mono font-bold">UNLIMITED</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Multiple Accounts • Unlimited Msgs Daily</div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-300">
                Subscription Validity Duration (Countdown Timer)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setNewKeyDuration(30)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    newKeyDuration === 30
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>30 Days (1 Month)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Timer starts on client's 1st login</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewKeyDuration(365)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    newKeyDuration === 365
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>365 Days (1 Year)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Annual client pass</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewKeyDuration(90)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    newKeyDuration === 90
                      ? 'bg-zinc-900 border-white text-white shadow-md'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    <span>90 Days (Quarterly)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">3 Months validity</div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowNewKeyForm(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={creatingKey}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all disabled:opacity-40"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{creatingKey ? 'Generating...' : 'Create & Activate Key'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Access Keys Table Card */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-zinc-400" />
              <span>Client License Keys Directory</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {accessKeys.length} total
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Only clients with an <strong className="text-white">Active</strong> key can unlock the application.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/70 text-zinc-400 border-b border-zinc-800 font-semibold">
              <tr>
                <th className="py-3 px-4">License Passkey</th>
                <th className="py-3 px-4">Client / Assigned To</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Validity (Timer & Renew)</th>
                <th className="py-3 px-4">Device Lock (1 User)</th>
                <th className="py-3 px-4">Today's WhatsApp</th>
                <th className="py-3 px-4">License Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {accessKeys.map((key) => {
                const isAdminKey = key.is_admin === 1 || key.key_code === 'OUTREACH-PRO-2025';
                const todaySent = key.today_whatsapp_count || 0;
                const isStarter = key.plan_type === 'starter';
                return (
                  <tr key={key.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="tracking-wide">{key.key_code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyKey(key)}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                          title="Copy Key to Clipboard"
                        >
                          {copiedKeyId === key.id ? (
                            <Check className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-sans text-zinc-300 font-medium">
                      {key.label}
                    </td>

                    <td className="py-3 px-4">
                      {isAdminKey ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-zinc-950 font-sans">
                          👑 Super Admin
                        </span>
                      ) : (
                        <select
                          value={key.plan_type || 'pro'}
                          onChange={(e) => handleUpdatePlan(key.id, e.target.value as 'starter' | 'pro')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer outline-none transition-all ${
                            isStarter
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <option value="starter" className="bg-zinc-950 text-amber-300 font-bold">
                            🥉 Starter (₹499 • 40/day)
                          </option>
                          <option value="pro" className="bg-zinc-950 text-emerald-300 font-bold">
                            🥇 Agency Pro (₹999 • Unlimited)
                          </option>
                        </select>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans text-xs">
                      {isAdminKey ? (
                        <span className="text-zinc-500 font-mono text-[11px]">👑 Lifetime Admin</span>
                      ) : key.expires_at ? (
                        key.days_left !== null && key.days_left !== undefined && key.days_left > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{key.days_left}d Left</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                              <span>Exp: {new Date(key.expires_at).toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() => handleExtendSubscription(key.id, key.label, 30)}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium transition-colors cursor-pointer"
                                title="Add +30 Days on payment renewal"
                              >
                                +30d 🔄
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 font-mono animate-pulse">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Expired</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                              <span>Exp: {new Date(key.expires_at).toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() => handleExtendSubscription(key.id, key.label, 30)}
                                className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Renew client with +30 days"
                              >
                                Renew +30d 🔄
                              </button>
                            </div>
                          </div>
                        )
                      ) : key.duration_days && key.duration_days > 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-mono font-medium text-amber-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{key.duration_days}d Pass</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">Starts on 1st login</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono text-[11px]">⏳ Unset Duration</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans text-xs">
                      {isAdminKey ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                          👑 Bypass Lock
                        </span>
                      ) : key.bound_device_id ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-200">
                            <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span
                              className="font-semibold text-[11px] truncate max-w-[130px]"
                              title={key.bound_device_info || 'Bound Device'}
                            >
                              {key.bound_device_info || 'Bound Device'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-zinc-500 font-mono">
                              {key.bound_at ? new Date(key.bound_at).toLocaleDateString() : 'Locked'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetDevice(key.id, key.label)}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-medium transition-colors cursor-pointer"
                              title="Unbind device so client can login on a new machine"
                            >
                              Reset 🔄
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Unbound (1st Locks)</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans text-xs">
                      {isAdminKey ? (
                        <span className="text-zinc-500 font-mono text-[11px]">Unlimited Admin</span>
                      ) : isStarter ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-amber-300">{todaySent} / 40</span>
                            <span className="text-zinc-500 text-[10px]">today</span>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 transition-all"
                              style={{ width: `${Math.min(100, (todaySent / 40) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <span>{todaySent} sent today</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">Unlimited Capacity</div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleKey(key.id, key.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          key.is_active === 1
                            ? 'bg-zinc-800 text-white border-zinc-700'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${key.is_active === 1 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span>{key.is_active === 1 ? 'Active' : 'Revoked'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-zinc-500 text-[11px]">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never used'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {!isAdminKey && (
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                          title="Delete Access Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase Cloud Connection Details Card */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Supabase Cloud Database Connection</h3>
              <p className="text-xs text-zinc-400">Real-time sync endpoint for remote authentication.</p>
            </div>
          </div>

          <a
            href="https://supabase.com/dashboard/project/bryrrgzbxggmxtelscyo/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 transition-all"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans uppercase">Project Reference</span>
            <p className="text-white font-bold truncate">bryrrgzbxggmxtelscyo</p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans uppercase">Table Name</span>
            <p className="text-white font-bold truncate">public.access_keys</p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans uppercase">Cloud Sync State</span>
            <p className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live & Connected</span>
            </p>
          </div>
        </div>
      </div>

      {/* Secret Master Admin Key Customizer */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Your Secret Super Admin Passkey</h3>
              <p className="text-xs text-zinc-400">
                Change your private login master key at any time. Only you know this secret passkey.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const input = (document.getElementById('new-master-key-input') as HTMLInputElement)?.value;
            if (!input || input.trim().length < 4) {
              alert('Please enter a secret key with at least 4 characters.');
              return;
            }
            try {
              const res = await (await import('../../services/api')).changeMasterKey(input.trim());
              if (res.success) {
                const updatedKey = res.newKey || input.trim().toUpperCase();
                localStorage.setItem('outreach_access_key', updatedKey);
                (document.getElementById('new-master-key-input') as HTMLInputElement).value = '';
                setActionMsg({ type: 'success', text: `🔒 Master Admin Key updated to: ${updatedKey}` });
                try {
                  confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
                } catch (e) {}
                loadData();
              } else {
                setActionMsg({ type: 'error', text: res.error || 'Failed to update master passkey.' });
              }
            } catch (err: any) {
              setActionMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to update master passkey.' });
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
        >
          <div className="sm:col-span-2">
            <input
              id="new-master-key-input"
              type="text"
              placeholder="Enter your new secret master key..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase focus:border-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Update Secret Key</span>
          </button>
        </form>
      </div>
    </div>
  );
};
