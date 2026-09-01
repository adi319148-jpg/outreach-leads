import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BorderBeam } from './BorderBeam';

interface DemoNiche {
  id: string;
  icon: string;
  label: string;
  query: string;
  location: string;
  businessName: string;
  rating: string;
  phone: string;
  issueBadge: string;
  aiMessage: string;
  replyRate: string;
}

const niches: DemoNiche[] = [
  {
    id: 'dental',
    icon: '🦷',
    label: 'Dental Clinics',
    query: 'Dental Clinics in Mumbai',
    location: 'Bandra West, Mumbai',
    businessName: 'Apex Dental Care & Implant Centre',
    rating: '★ 4.8 (84 Reviews)',
    phone: '+91 98201 44XXX',
    issueBadge: '⚠️ Website Missing (High-Value Opportunity)',
    aiMessage:
      'Hello Dr. Sharma! Dental implant consultation ke timings kya rehte hain? Google pe clinic dekha par direct booking page link nahi mila—humne clinic ke liye ek clean modern booking concept banaya hai. Kya main 30-sec preview share karun?',
    replyRate: '38% Avg Reply Rate',
  },
  {
    id: 'realestate',
    icon: '🏠',
    label: 'Real Estate Agents',
    query: 'Real Estate Consultants in Delhi',
    location: 'South Extension, Delhi',
    businessName: 'Luxe Habitat Realty',
    rating: '★ 4.7 (52 Reviews)',
    phone: '+91 98110 32XXX',
    issueBadge: '⚠️ Mobile Portfolio Missing',
    aiMessage:
      'Hi team Luxe Habitat! South Delhi me 3BHK ready-to-move options available hain? Online brochure link search kar raha tha Google pe. Humne aapke listings ke liye ek sleek WhatsApp brochure catalogue design kiya hai—kya main share karun?',
    replyRate: '42% Avg Reply Rate',
  },
  {
    id: 'gym',
    icon: '🏋️',
    label: 'Gyms & Fitness',
    query: 'Fitness Centers in Bengaluru',
    location: 'Indiranagar, Bengaluru',
    businessName: 'IronForge Crossfit & Gym',
    rating: '★ 4.9 (120 Reviews)',
    phone: '+91 98450 11XXX',
    issueBadge: '⚠️ No Membership Link',
    aiMessage:
      'Hey IronForge! Morning batch personal training ke membership plans kya hain? Google profile pe membership pricing page nahi dikha—humne gym ke liye 1-page rapid sign-up page mockup kiya hai. Mind if I send the preview?',
    replyRate: '35% Avg Reply Rate',
  },
  {
    id: 'youtube',
    icon: '📺',
    label: 'YouTube Creators',
    query: 'Finance Channels (30K - 100K Subs)',
    location: 'National / Finance Niche',
    businessName: 'Finance With Aditi (54K Subs)',
    rating: '★ 4.9 (210 Videos)',
    phone: 'business.aditi@gmail.com',
    issueBadge: '⚠️ Low CTR Thumbnails & Zero Shorts',
    aiMessage:
      'Hey Aditi! Loved your recent video on index funds. Noticed your click-through might be missing out on viewers due to low-contrast thumbnails—mocked up 2 high-CTR concepts for your next drop for free. Can I send them over?',
    replyRate: '45% Avg Reply Rate',
  },
];

export const EasyLeadFlow: React.FC = () => {
  const [selectedNiche, setSelectedNiche] = useState<DemoNiche>(niches[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedNiche.aiMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateClick = () => {
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#ffffff', '#a1a1aa', '#52525b'],
    });
  };

  return (
    <div className="rounded-3xl bg-[#121215]/90 border border-zinc-800 shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden text-left space-y-6">
      <BorderBeam size={220} duration={12} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.05)" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-750 text-[11px] font-mono text-zinc-300 font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span>SUPER SIMPLE 3-STEP WORKFLOW</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            See How Outreach AI Works in 10 Seconds
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            No technical knowledge or coding needed. Select a business below to see the live discovery & pitch flow:
          </p>
        </div>

        {/* Niche Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
          {niches.map((niche) => (
            <button
              key={niche.id}
              onClick={() => {
                setSelectedNiche(niche);
                handleSimulateClick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedNiche.id === niche.id
                  ? 'bg-white text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <span>{niche.icon}</span>
              <span>{niche.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3 Step Interactive Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative">
        {/* Step 1 */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                STEP 01
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Auto-Search</span>
            </div>

            <h4 className="text-sm font-bold text-white">Select Any Category & City</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bas category aur city likhein. Outreach AI official Google Places API se saare local businesses ko 1 click me scan kar leta hai.
            </p>

            {/* Input Mockup Box */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                <Search className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-white font-bold">{selectedNiche.query}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800">
                <span>Google Places Radar</span>
                <span className="text-emerald-400 font-bold">● Active 360° Scan</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>50+ Cities & Categories Supported</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                STEP 02
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Smart Filter</span>
            </div>

            <h4 className="text-sm font-bold text-white">Filters Out Businesses With NO Website</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tool automatically un businesses ko highlight karta hai jinka website link missing hai—yani unhe website aur marketing ki sabse zyada zaroorat hai!
            </p>

            {/* Business Result Card Mockup */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-white">{selectedNiche.businessName}</div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span>{selectedNiche.location}</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-300 font-mono font-semibold">{selectedNiche.rating}</span>
              </div>

              <div className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="truncate">{selectedNiche.issueBadge}</span>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 flex justify-between">
                <span>Phone: <span className="text-white font-bold">{selectedNiche.phone}</span></span>
                <span className="text-emerald-400 font-bold">100% Verified</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Isolates high-paying potential clients</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                STEP 03
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">AI 1-Click Pitch</span>
            </div>

            <h4 className="text-sm font-bold text-white">AI Writes 1-Click WhatsApp Message</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              AI bina kisi generic spam ke seedha natural conversation hook likhta hai. Client ko lagta hai real customer inquiry hai, aur woh khushi se reply karta hai!
            </p>

            {/* WhatsApp Message Chat Bubble */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Personalized WhatsApp Pitch</span>
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-zinc-200 text-xs leading-relaxed italic">
                "{selectedNiche.aiMessage}"
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                <span className="text-emerald-400 font-bold">{selectedNiche.replyRate}</span>
                <span>Anti-Ban Human Delay (35s)</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>1-Click Safe Dispatch via Linked WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">Summary:</strong> Tool Google se bina website wale businesses dhoondhta hai aur 1-click me personalized message bhej deta hai.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-bold font-mono">0% Ban Risk • 100% Automated</span>
        </div>
      </div>
    </div>
  );
};
