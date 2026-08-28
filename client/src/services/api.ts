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
  BatchWhatsAppProgress,
  InboundReply,
} from '../types';

const api = axios.create({
  baseURL: '/api',
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
export const getWhatsAppStatus = async (): Promise<WhatsAppStatusState> => {
  const res = await api.get<WhatsAppStatusState>('/whatsapp/status');
  return res.data;
};

export const connectWhatsApp = async (forceRestart: boolean = false): Promise<WhatsAppStatusState> => {
  const res = await api.post<WhatsAppStatusState>('/whatsapp/connect', { forceRestart });
  return res.data;
};

export const disconnectWhatsApp = async (): Promise<WhatsAppStatusState> => {
  const res = await api.post<WhatsAppStatusState>('/whatsapp/disconnect');
  return res.data;
};

export const sendDirectWhatsAppMessage = async (payload: {
  phone: string;
  message: string;
  leadId?: number;
}): Promise<{ success: boolean; message: string; messageId?: string }> => {
  const res = await api.post('/whatsapp/send', payload);
  return res.data;
};

export const startWhatsAppBatchCampaign = async (
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 30,
  maxDelaySeconds: number = 45
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/whatsapp/batch-start', {
    leads,
    minDelaySeconds,
    maxDelaySeconds,
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

export const getExportCsvUrl = (): string => {
  return '/api/leads/export/csv';
};
