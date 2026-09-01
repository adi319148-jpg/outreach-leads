import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  MapPin,
  Youtube,
  Sparkles,
  Cpu,
  MessageCircle,
  Mail,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

interface ApiKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

interface GuideItem {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  officialUrl: string;
  urlLabel: string;
  costInfo: string;
  steps: Array<{ title: string; desc: string; tip?: string; copyText?: string }>;
}

export const ApiKeyGuideModal: React.FC<ApiKeyGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'google_places',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  const guides: Record<string, GuideItem> = {
    google_places: {
      id: 'google_places',
      name: 'Google Places API',
      category: 'Business Discovery',
      icon: <MapPin className="h-4 w-4" />,
      officialUrl: 'https://console.cloud.google.com/apis/library/places-backend.googleapis.com',
      urlLabel: 'Open Google Cloud Console',
      costInfo: '$200 Monthly Free Credit from Google (covers thousands of lead queries)',
      steps: [
        {
          title: '1. Create or Open a Google Cloud Project',
          desc: 'Visit the Google Cloud Console. Log in with your Gmail account and create a new project (e.g. "Outreach Lead Finder").',
        },
        {
          title: '2. Enable the Places API (New)',
          desc: 'In the API Library search for "Places API (New)" or "Places API", and click the blue "ENABLE" button.',
        },
        {
          title: '3. Create API Credentials',
          desc: 'Go to "APIs & Services" ➔ "Credentials". Click "+ CREATE CREDENTIALS" at the top and select "API key".',
        },
        {
          title: '4. Copy & Paste Key into Settings',
          desc: 'Copy your generated API key (starts with AIzaSy...) and paste it into the Google Places API Key field in Outreach AI Settings.',
          tip: 'Tip: You can restrict the key to "Places API" for security under key settings.',
        },
      ],
    },
    youtube: {
      id: 'youtube',
      name: 'YouTube Data API v3',
      category: 'Creator Discovery',
      icon: <Youtube className="h-4 w-4" />,
      officialUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
      urlLabel: 'Open YouTube API Library',
      costInfo: '100% Free 10,000 Quota Units per day provided by Google',
      steps: [
        {
          title: '1. Enable YouTube Data API v3',
          desc: 'In your Google Cloud Console, open the API Library and search for "YouTube Data API v3". Click "ENABLE".',
        },
        {
          title: '2. Generate API Key',
          desc: 'Navigate to "Credentials" ➔ Click "+ CREATE CREDENTIALS" ➔ Select "API key".',
        },
        {
          title: '3. Paste into Outreach AI Settings',
          desc: 'Copy your API key and paste it into the YouTube API Key field in Settings. You can also use the same key as Google Places if enabled in the same project!',
          tip: 'Tip: 10,000 daily quota units allow finding hundreds of creators every single day completely free.',
        },
      ],
    },
    gemini: {
      id: 'gemini',
      name: 'Google Gemini AI (Free)',
      category: 'AI Cold Pitch Generation',
      icon: <Sparkles className="h-4 w-4" />,
      officialUrl: 'https://aistudio.google.com/app/apikey',
      urlLabel: 'Open Google AI Studio (Instant Key)',
      costInfo: '100% Free tier with high rate limits (Gemini 2.5 Flash / 1.5 Pro)',
      steps: [
        {
          title: '1. Visit Google AI Studio',
          desc: 'Go to aistudio.google.com and log in with your Google / Gmail account.',
        },
        {
          title: '2. Click "Get API key"',
          desc: 'Click on the blue "Get API key" button in the left sidebar or top right corner.',
        },
        {
          title: '3. Create Key in 1-Click',
          desc: 'Click "Create API key in new project". Google will generate your key instantly (takes less than 10 seconds).',
        },
        {
          title: '4. Paste into Gemini API Key Box',
          desc: 'Copy your key (starts with AIzaSy...) and paste it in Settings under Gemini API Key. Click "Test Key" to verify!',
          tip: 'Recommended: Gemini 2.5 is ultra-fast, intelligent, and completely free for pitch personalization.',
        },
      ],
    },
    claude: {
      id: 'claude',
      name: 'Anthropic Claude AI',
      category: 'Alternative AI Model',
      icon: <Cpu className="h-4 w-4" />,
      officialUrl: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'Open Anthropic Console',
      costInfo: 'Pay-as-you-go API (Claude 3.5 Sonnet / Claude 3 Haiku)',
      steps: [
        {
          title: '1. Sign up on Anthropic Console',
          desc: 'Visit console.anthropic.com and create an account.',
        },
        {
          title: '2. Generate an API Key',
          desc: 'Go to Settings ➔ API Keys ➔ Click "Create Key". Give it a name like "Outreach AI".',
        },
        {
          title: '3. Paste into Settings',
          desc: 'Copy the secret key (starts with sk-ant-...) and paste it into the Claude API Key field in Settings.',
        },
      ],
    },
    whatsapp: {
      id: 'whatsapp',
      name: 'WhatsApp Web Automation',
      category: '1-Click Multi-Account Dispatch',
      icon: <MessageCircle className="h-4 w-4" />,
      officialUrl: 'https://web.whatsapp.com',
      urlLabel: 'WhatsApp Web Info',
      costInfo: '100% Free — Uses your own WhatsApp phone number via Baileys Web Protocol',
      steps: [
        {
          title: '1. Click "Connect Primary WhatsApp" in Settings',
          desc: 'In Outreach AI Settings, locate the WhatsApp Web Automation card and click the white "Connect Primary WhatsApp" button.',
        },
        {
          title: '2. Scan the Live QR Code',
          desc: 'A live QR code will appear on your screen in real time.',
        },
        {
          title: '3. Open WhatsApp on your Phone',
          desc: 'Open WhatsApp on your mobile phone ➔ Tap Settings (or 3 dots on Android) ➔ Tap "Linked Devices" ➔ Tap "Link a Device" and scan the QR code on your computer screen.',
        },
        {
          title: '4. Connected & Ready!',
          desc: 'Once scanned, the app will show "Connected" with a green badge. You can now dispatch cold personalized WhatsApp messages with 1-click in Bulk Campaign!',
          tip: 'Safety Feature: Outreach AI includes intelligent human-like delays (5-12s) and a 1-click Kill Switch to keep your WhatsApp account 100% safe.',
        },
      ],
    },
    gmail_smtp: {
      id: 'gmail_smtp',
      name: 'Gmail SMTP (App Password)',
      category: 'Cold Email Outreach',
      icon: <Mail className="h-4 w-4" />,
      officialUrl: 'https://myaccount.google.com/apppasswords',
      urlLabel: 'Open Gmail App Passwords Page',
      costInfo: '100% Free — Send cold emails from your own @gmail.com or Google Workspace inbox',
      steps: [
        {
          title: '1. Enable 2-Step Verification on your Google Account',
          desc: 'Go to myaccount.google.com/security and ensure "2-Step Verification" is turned ON.',
        },
        {
          title: '2. Generate an "App Password"',
          desc: 'Visit myaccount.google.com/apppasswords. Enter an App name like "Outreach AI" and click "Create".',
        },
        {
          title: '3. Copy the 16-Character Password',
          desc: 'Google will show a 16-character password (e.g. abcd efgh ijkl mnop). Copy this password.',
        },
        {
          title: '4. Enter Credentials in Outreach AI Settings',
          desc: 'Enter your Gmail address in "Sender Email Address" and paste the 16-character password in "App Password". Click "Test Connection" to verify!',
          tip: 'Note: Use your 16-character App Password, NOT your regular Gmail login password.',
        },
      ],
    },
    resend: {
      id: 'resend',
      name: 'Resend API (Cloud Email)',
      category: 'High-Deliverability Email API',
      icon: <Mail className="h-4 w-4" />,
      officialUrl: 'https://resend.com/api-keys',
      urlLabel: 'Open Resend Dashboard',
      costInfo: 'Free 3,000 emails/month (100 emails/day completely free)',
      steps: [
        {
          title: '1. Create a Free Account on Resend',
          desc: 'Go to resend.com and sign up for a free developer account.',
        },
        {
          title: '2. Generate API Key',
          desc: 'Go to "API Keys" in the left menu ➔ Click "Create API Key" ➔ Copy the key (starts with re_...).',
        },
        {
          title: '3. Paste into Settings',
          desc: 'Paste the key into "Resend API Key" and enter your verified sender email address. Click "Test Connection".',
        },
      ],
    },
  };

  const currentGuide = guides[activeTab] || guides.google_places;

  const handleCopy = (text: string, indexKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(indexKey);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#121215] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between gap-4 bg-[#121215]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-zinc-950 font-bold shadow">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Complete API & System Setup Guide
              </h2>
              <p className="text-xs text-zinc-400">
                Step-by-step instructions and direct links to get all your API keys and credentials.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body with Left Tabs and Right Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 bg-zinc-950/80 border-b md:border-b-0 md:border-r border-zinc-800 p-3 space-y-1 overflow-y-auto shrink-0">
            <div className="px-2 py-1 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Choose Service
            </div>
            {Object.values(guides).map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveTab(g.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all text-left ${
                  activeTab === g.id
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <div className={activeTab === g.id ? 'text-zinc-950' : 'text-zinc-400'}>
                  {g.icon}
                </div>
                <div className="truncate">
                  <p className="leading-tight truncate">{g.name}</p>
                  <p className={`text-[10px] truncate ${activeTab === g.id ? 'text-zinc-700' : 'text-zinc-500'}`}>
                    {g.category}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#0e0e11]">
            {/* Service Title & Action Header */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-750 text-white">
                    {currentGuide.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{currentGuide.name}</h3>
                    <p className="text-xs text-zinc-400 font-medium">{currentGuide.category}</p>
                  </div>
                </div>

                <a
                  href={currentGuide.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all shrink-0"
                >
                  <span>{currentGuide.urlLabel}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Pricing & Free Tier Info Pill */}
              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-white shrink-0" />
                <span><strong>Pricing / Quota:</strong> {currentGuide.costInfo}</span>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Step-by-Step Setup Instructions
              </h4>

              <div className="space-y-3">
                {currentGuide.steps.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      <span>{s.title}</span>
                    </div>
                    <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                      {s.desc}
                    </p>

                    {s.tip && (
                      <div className="ml-6 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                        {s.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-[#121215]">
          <span className="text-[11px] text-zinc-500 font-mono">
            Outreach AI • Complete API & Licensing Documentation
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow transition-all"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
