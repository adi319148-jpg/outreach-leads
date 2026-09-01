import axios from 'axios';
import {
  Lead,
  DashboardStats,
  AppSettings,
  PitchTone,
  OfferedService,
  PlaceSearchResult,
  YouTubeSearchResult,
  WhatsAppStatusState,
  WhatsAppAccountState,
  BatchWhatsAppProgress,
  InboundReply,
  AppUpdateInfo,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Automatically inject per-user access key and session token for isolated workspace & settings
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('outreach_session_token') || sessionStorage.getItem('outreach_session_token');
  const accessKey = localStorage.getItem('outreach_access_key') || sessionStorage.getItem('outreach_access_key');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (accessKey) {
    config.headers['x-access-key'] = accessKey;
  }
  return config;
});

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<DashboardStats>('/dashboard/stats');
  return res.data;
};

export const searchPlaces = async (params: {
  category: string;
  location: string;
  radius?: number;
  websiteFilter?: 'all' | 'no_website' | 'has_website';
  latitude?: number;
  longitude?: number;
}): Promise<{ leads: PlaceSearchResult[]; isMock: boolean; message?: string }> => {
  const res = await api.post('/places/search', params);
  return res.data;
};

export const searchYouTube = async (params: {
  keyword: string;
  minSubs?: number;
  maxSubs?: number;
  qualityFilter?: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing';
}): Promise<{ leads: YouTubeSearchResult[]; isMock: boolean; message?: string }> => {
  const res = await api.post('/youtube/search', params);
  return res.data;
};

export const getLeads = async (params?: {
  source?: string;
  status?: string;
  inCampaign?: boolean;
  category?: string;
  hasWebsite?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ leads: Lead[]; total: number; page: number; totalPages: number }> => {
  const res = await api.get('/leads', { params });
  return res.data;
};

export const saveLeads = async (
  leads: Array<Partial<Lead>>,
  autoPitch?: boolean,
  offeredService?: OfferedService
): Promise<{ success: boolean; savedCount: number; message?: string }> => {
  const res = await api.post('/leads/batch-save', { leads, autoPitch, offeredService });
  return res.data;
};

export const saveBatchLeads = saveLeads;

export const updateLead = async (id: number, data: Partial<Lead> & { markContacted?: boolean }): Promise<Lead> => {
  const res = await api.patch(`/leads/${id}`, data);
  return res.data;
};

export const deleteLead = async (id: number): Promise<{ success: boolean }> => {
  const res = await api.delete(`/leads/${id}`);
  return res.data;
};

export const bulkDeleteLeads = async (ids: number[]): Promise<{ success: boolean }> => {
  for (const id of ids) {
    await api.delete(`/leads/${id}`);
  }
  return { success: true };
};

export const addToCampaignQueue = async (
  leadIds: number[]
): Promise<{ success: boolean; addedCount: number; totalInCampaign: number }> => {
  const res = await api.post('/leads/campaign-queue/add', { ids: leadIds, leadIds });
  return res.data;
};

export const removeFromCampaignQueue = async (
  leadIds: number[]
): Promise<{ success: boolean; removedCount: number }> => {
  const res = await api.post('/leads/campaign-queue/remove', { ids: leadIds, leadIds });
  return res.data;
};

export const clearCampaignQueue = async (): Promise<{ success: boolean }> => {
  const res = await api.post('/leads/campaign-queue/clear');
  return res.data;
};

export const generatePitch = async (params: {
  leadId?: number;
  lead?: Partial<Lead>;
  tone?: PitchTone;
  offeredService?: OfferedService;
  customInstructions?: string;
}): Promise<{ pitch: string; tone: PitchTone; offeredService: OfferedService }> => {
  const res = await api.post('/ai/generate-pitch', params);
  return res.data;
};

export const batchGeneratePitches = async (
  leadIds: number[],
  tone?: PitchTone,
  offeredService?: OfferedService,
  customInstructions?: string
): Promise<{ success: boolean; count: number; results: any[] }> => {
  const res = await api.post('/ai/batch-generate', {
    leadIds,
    tone,
    offeredService,
    customInstructions,
  });
  return res.data;
};

export const getSettings = async (): Promise<AppSettings> => {
  const res = await api.get('/settings');
  return res.data;
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/settings', settings);
  return res.data;
};

export const testApiKey = async (
  service: 'google_places' | 'youtube' | 'gemini' | 'claude',
  key?: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/settings/test-key', { service, key });
  return res.data;
};

export const toggleEmergencyKillSwitch = async (
  active: boolean
): Promise<{ success: boolean; killSwitchActive: boolean; message: string }> => {
  const res = await api.post('/settings/kill-switch', { active });
  return res.data;
};

// WhatsApp API Methods
export const getWhatsAppAccounts = async (): Promise<WhatsAppAccountState[]> => {
  const res = await api.get<WhatsAppAccountState[]>('/whatsapp/accounts');
  return res.data;
};

export const getWhatsAppStatus = async (sessionId: string = 'account_1'): Promise<WhatsAppStatusState> => {
  const res = await api.get<WhatsAppStatusState>(`/whatsapp/status?sessionId=${sessionId}`);
  return res.data;
};

export const connectWhatsAppAccount = async (
  sessionId: string,
  accountName?: string,
  forceRestart: boolean = false
): Promise<WhatsAppAccountState> => {
  const res = await api.post<WhatsAppAccountState>('/whatsapp/connect', { sessionId, accountName, forceRestart });
  return res.data;
};

export const disconnectWhatsAppAccount = async (sessionId: string): Promise<WhatsAppAccountState> => {
  const res = await api.post<WhatsAppAccountState>('/whatsapp/disconnect', { sessionId });
  return res.data;
};

export const deleteWhatsAppAccount = async (sessionId: string): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/whatsapp/accounts/${sessionId}`);
  return res.data;
};

export const connectWhatsApp = async (forceRestart: boolean = false): Promise<WhatsAppStatusState> => {
  return connectWhatsAppAccount('account_1', 'Primary WhatsApp', forceRestart);
};

export const disconnectWhatsApp = async (): Promise<WhatsAppStatusState> => {
  return disconnectWhatsAppAccount('account_1');
};

export const sendDirectWhatsAppMessage = async (payload: {
  phone: string;
  message: string;
  leadId?: number;
  sessionId?: string;
}): Promise<{ success: boolean; message: string; messageId?: string }> => {
  const res = await api.post('/whatsapp/send', payload);
  return res.data;
};

export const startWhatsAppBatchCampaign = async (
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 30,
  maxDelaySeconds: number = 45,
  allowedSessionIds?: string[]
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/whatsapp/batch-start', {
    leads,
    minDelaySeconds,
    maxDelaySeconds,
    allowedSessionIds,
  });
  return res.data;
};

export const getWhatsAppBatchStatus = async (): Promise<BatchWhatsAppProgress> => {
  const res = await api.get<BatchWhatsAppProgress>('/whatsapp/batch-status');
  return res.data;
};

export const stopWhatsAppBatchCampaign = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/whatsapp/batch-stop');
  return res.data;
};

// Inbound Replies API Methods
export const getInboundReplies = async (): Promise<{ replies: InboundReply[]; unreadCount: number }> => {
  const res = await api.get<{ replies: InboundReply[]; unreadCount: number }>('/replies');
  return res.data;
};

export const markRepliesAsRead = async (replyIds?: number[]): Promise<{ success: boolean }> => {
  const res = await api.post('/replies/mark-read', { replyIds });
  return res.data;
};

export const generateAISmartReply = async (payload: {
  incomingMessage: string;
  originalPitch?: string;
  leadName?: string;
}): Promise<{
  reply: string;
  sentiment: { sentiment: string; toneLabel: string; recommendedStyle: string };
  warnings?: string[];
}> => {
  const res = await api.post('/replies/generate-ai-response', payload);
  return res.data;
};

export const simulateInboundReply = async (payload?: {
  leadId?: number;
  channel?: 'whatsapp' | 'email';
  messageText?: string;
  senderName?: string;
}): Promise<{ success: boolean; replyId: number; message: string }> => {
  const res = await api.post('/replies/simulate', payload || {});
  return res.data;
};

export const sendQuickWhatsAppResponse = async (payload: {
  leadId?: number;
  phone: string;
  message: string;
}): Promise<{ success: boolean; message?: string }> => {
  const res = await api.post('/replies/send-response', payload);
  return res.data;
};

// Direct In-App Email API Methods (Zero Tabs)
export const sendDirectEmailMessage = async (payload: {
  to: string;
  subject?: string;
  message: string;
  leadId?: number;
}): Promise<{ success: boolean; message: string; messageId?: string }> => {
  const res = await api.post('/email/send', payload);
  return res.data;
};

export const sendBatchEmailMessages = async (
  leads: Array<{ id: number; name: string; email: string; subject?: string; message: string }>
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/batch-send', { leads });
  return res.data;
};

export const testSmtpSettings = async (credentials?: {
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
}): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/test', credentials || {});
  return res.data;
};

export const testResendKey = async (resendApiKey?: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/test-resend', { resendApiKey });
  return res.data;
};

export const getExportCsvUrl = (): string => {
  return '/api/leads/export/csv';
};

export const checkForAppUpdates = async (): Promise<AppUpdateInfo> => {
  const res = await api.get<AppUpdateInfo>('/settings/check-update');
  return res.data;
};

// Access Key Authentication API Methods
export const loginWithAccessKey = async (
  accessKey: string,
  deviceId?: string,
  deviceInfo?: string
): Promise<{ success: boolean; token?: string; error?: string; deviceLocked?: boolean; keyInfo?: { id: number; keyCode: string; label: string } }> => {
  const res = await api.post('/auth/login', { accessKey, deviceId, deviceInfo });
  return res.data;
};

export const verifyAccessKey = async (
  accessKey: string,
  deviceId?: string
): Promise<{ success: boolean; valid: boolean; error?: string; deviceMismatch?: boolean; keyInfo?: { id: number; keyCode: string; label: string } }> => {
  const res = await api.post('/auth/verify', { accessKey, deviceId });
  return res.data;
};

export const getAccessKeys = async (): Promise<{ success: boolean; keys: import('../types').AccessKeyInfo[] }> => {
  const res = await api.get('/auth/keys');
  return res.data;
};

export const createAccessKey = async (payload: {
  label?: string;
  customKey?: string;
  planType?: 'starter' | 'pro';
}): Promise<{ success: boolean; message: string; key?: import('../types').AccessKeyInfo; error?: string }> => {
  const res = await api.post('/auth/keys', payload);
  return res.data;
};

export const toggleAccessKey = async (
  id: number,
  isActive: boolean
): Promise<{ success: boolean; message: string }> => {
  const res = await api.patch(`/auth/keys/${id}/toggle`, { isActive });
  return res.data;
};

export const updateAccessKeyPlan = async (
  id: number,
  planType: 'starter' | 'pro'
): Promise<{ success: boolean; message: string; error?: string }> => {
  const res = await api.patch(`/auth/keys/${id}/plan`, { planType });
  return res.data;
};

export const resetDeviceBinding = async (
  id: number
): Promise<{ success: boolean; message: string; error?: string }> => {
  const res = await api.post(`/auth/keys/${id}/reset-device`);
  return res.data;
};

export const deleteAccessKey = async (id: number): Promise<{ success: boolean; message: string; error?: string }> => {
  const res = await api.delete(`/auth/keys/${id}`);
  return res.data;
};

export const changeMasterKey = async (newMasterKey: string): Promise<{ success: boolean; message: string; newKey?: string; error?: string }> => {
  const res = await api.post('/auth/change-master-key', { newMasterKey });
  return res.data;
};
