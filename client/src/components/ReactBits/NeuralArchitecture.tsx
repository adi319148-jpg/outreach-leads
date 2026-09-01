import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Youtube, Cpu, MessageCircle, Mail, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { AnimatedBeam } from './AnimatedBeam';
import { BorderBeam } from './BorderBeam';

export const NeuralArchitecture: React.FC = () => {
  return (
    <div className="relative p-6 sm:p-10 rounded-3xl bg-[#0e0e11] border border-zinc-800 shadow-2xl overflow-hidden text-center">
      {/* Background Animated Beam */}
      <AnimatedBeam duration={5} pathColor="rgba(255, 255, 255, 0.08)" gradientStartColor="#ffffff" />

      <div className="relative z-10 space-y-2 mb-10">
        <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
          Autonomous Neural Flow Architecture
        </span>
        <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
          How Raw Leads Become Closed Clients
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
          Every lead flows through our 3-stage neural pipeline with 0 manual data entry and 100% human-delay safety.
        </p>
      </div>

      {/* 3 Columns Pipeline Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Tier 1: Real-Time Ingestion */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141418] border border-zinc-800/90 text-left space-y-2 hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <span>Google Places 360° Radar</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Scrapes 50+ categories in real-time, isolating businesses with missing or broken website links.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#141418] border border-zinc-800/90 text-left space-y-2 hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <Youtube className="h-4 w-4 text-white" />
              </div>
              <span>YouTube Opportunity Finder</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Discovers channels with high subscriber count but poor thumbnail CTR and missing video editors.
            </p>
          </div>
        </div>

        {/* Tier 2: The Central AI Core (With BorderBeam) */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-700 shadow-2xl space-y-4 text-center">
          <BorderBeam size={160} duration={8} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.1)" />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white shadow-xl relative">
            <Cpu className="h-7 w-7 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-black text-white tracking-tight">Gemini 2.0 Neural Engine</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
              0 Token Cost Pool
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Analyzes business reputation, reviews & industry. Crafts bespoke 2-part conversation hooks in pure English or polite Hinglish.
          </p>

          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-white" /> Zero Spam Formula
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-white" /> Double-Send Guard
            </span>
          </div>
        </div>

        {/* Tier 3: Safe Multi-Account Dispatch */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141418] border border-zinc-800/90 text-left space-y-2 hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <span>WhatsApp Anti-Ban Hub</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Multi-number round robin with randomized human delay (30-45s) keeping your numbers 100% ban-safe.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#141418] border border-zinc-800/90 text-left space-y-2 hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span>Multi-Key Cloud Email Rotation</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Distributes cold emails across multiple free Resend accounts (9,000+ free emails/month).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
