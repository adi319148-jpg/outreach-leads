export type LeadSource = 'google_places' | 'youtube';
export type LeadStatus = 'not_contacted' | 'contacted' | 'replied' | 'converted' | 'rejected';
export type PitchStatus = 'draft' | 'ready' | 'sent';
export type PitchTone = 'friendly' | 'professional' | 'direct' | 'creative' | 'bold';

export type OfferedService =
  | 'whatsapp_ai_agent'
  | 'ai_automation'
  | 'website_design'
  | 'video_editing'
  | 'graphic_design'
  | 'content_creation_reels'
  | 'branding_logo'
  | 'paid_ads'
  | 'gmb_local_seo'
  | 'social_media_management'
  | 'local_seo'
  | 'general';

export interface Lead {
  id: number;
  source: LeadSource;
  external_id: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  has_website?: boolean;
  contact_email?: string;
  instagram_handle?: string;
  channel_handle?: string;
  subscriber_count?: number;
  video_count?: number;
  view_count?: number;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  status: LeadStatus;
  notes?: string;
  pitch?: string;
  pitch_tone?: PitchTone;
  offered_service?: OfferedService;
  pitch_status: PitchStatus;
  in_campaign_queue?: boolean;
  campaign_queue_at?: string;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
  thumbnail_quality_status?: string;
  opportunity_reason?: string;
  recent_video_title?: string;
  recent_video_thumbnail?: string;
  google_maps_url?: string;
}

export interface PlaceSearchResult {
  external_id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  has_website: boolean;
  instagram_handle?: string;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  google_maps_url?: string;
  selected?: boolean;
  already_contacted?: boolean;
}

export type ThumbnailQualityStatus =
  | 'needs_thumbnail_redesign'
  | 'needs_video_editing'
  | 'optimized_visuals';

export interface YouTubeSearchResult {
  external_id: string;
  name: string;
  category: string;
  channel_handle?: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  avg_views_per_video?: number;
  view_to_sub_ratio?: number;
  thumbnail_quality_status?: ThumbnailQualityStatus;
  opportunity_reason?: string;
  description: string;
  website: string;
  contact_email?: string;
  phone?: string;
  thumbnail_url?: string;
  recent_video_title?: string;
  recent_video_thumbnail?: string;
  selected?: boolean;
  already_contacted?: boolean;
}

export interface DashboardStats {
  totalLeads: number;
  notContacted: number;
  contacted: number;
  replied: number;
  converted: number;
  rejected: number;
  totalReached: number;
  conversionRate: string;
  responseRate: string;
  placesCount: number;
  youtubeCount: number;
  pitchesReady: number;
  recentLeads: Lead[];
}

export interface AppSettings {
  googlePlacesApiKey?: string;
  youtubeApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
  defaultPitchTone?: PitchTone;
  mockModeEnabled?: boolean;
  hasGooglePlacesKey?: boolean;
  hasYoutubeKey?: boolean;
  hasGeminiKey?: boolean;
  hasClaudeKey?: boolean;
  killSwitchActive?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  hasResendKey?: boolean;
  detectedGoogleProject?: {
    found: boolean;
    projectId?: string;
    clientId?: string;
  };
}

export interface WhatsAppStatusState {
  status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'error';
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  lastActive: string | null;
  killSwitchActive?: boolean;
}

export interface BatchWhatsAppProgress {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  currentLeadName: string | null;
  currentPhone: string | null;
  secondsRemaining: number;
  statusMessage: string | null;
  logs: Array<{ time: string; leadName: string; phone: string; success: boolean; message: string }>;
}

export interface InboundReply {
  id: number;
  lead_id?: number;
  channel: 'whatsapp' | 'email';
  sender_id: string;
  sender_name?: string;
  message_text: string;
  received_at: string;
  is_read: number;
  lead_name?: string;
  lead_category?: string;
  lead_status?: LeadStatus;
  original_pitch?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_source?: LeadSource;
  sentiment?: {
    sentiment: string;
    toneLabel: string;
    recommendedStyle: string;
  };
}
