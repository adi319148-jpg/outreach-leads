import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Sparkles, MessageCircle, Mail, ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import { BorderBeam } from './BorderBeam';

interface PricingSectionProps {
  onSelectPlan: (plan: 'starter' | 'pro') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="pricing" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-850">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-750 text-[11px] font-mono text-zinc-300 font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-white" />
          <span>TRANSPARENT & AFFORDABLE PRICING</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Simple Plans Built to Pay for Themselves in 1 Client
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Choose the plan that matches your outreach scale. No hidden fees, instant passkey delivery.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="inline-flex items-center gap-2 p-1 rounded-2xl bg-zinc-950 border border-zinc-800 pt-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly Billed
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Yearly (Annual Pass)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
              SAVE 58%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
        {/* PLAN 1: STARTER / SOLO */}
        <div className="relative rounded-3xl bg-[#121215]/85 border border-zinc-800 p-8 flex flex-col justify-between space-y-8 shadow-xl text-left hover:border-zinc-700 transition-all">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                  SOLO / STARTER
                </span>
                <h3 className="text-xl font-bold text-white mt-2">Starter Freelancer</h3>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <MessageCircle className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Perfect for solo web designers, video editors, and freelancers looking for steady daily clients.
            </p>

            {/* Price */}
            <div className="border-y border-zinc-850 py-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {billingCycle === 'monthly' ? '₹499' : '₹2,499'}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {billingCycle === 'monthly' ? '/ month' : '/ 1-year pass'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono mt-1">
                {billingCycle === 'monthly' ? '● Safe steady outreach • Cancel anytime' : '● Single payment • 12 months full access'}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span><strong>1 WhatsApp Account</strong> Linked</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span><strong>40 Messages Daily Limit</strong> (Safe & Steady)</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span><strong>1 Email Account</strong> (40 cold emails/day)</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span><strong>Unlimited Google Maps 360° Radar</strong></span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>Gemini 2.0 AI Personalized Hook Engine</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>Built-in Private Local CRM</span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectPlan('starter')}
            className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-750 text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Get Starter Passkey (₹{billingCycle === 'monthly' ? '199' : '999'})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>

        {/* PLAN 2: AGENCY PRO (UNLIMITED) */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#16161c] to-[#0f0f13] border border-zinc-700 p-8 flex flex-col justify-between space-y-8 shadow-2xl text-left overflow-hidden">
          <BorderBeam size={220} duration={10} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.05)" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-white text-zinc-950 shadow-sm">
                  <Flame className="h-3 w-3 fill-current text-zinc-950" />
                  <span>MOST POPULAR • UNLIMITED</span>
                </div>
                <h3 className="text-xl font-black text-white mt-2">Agency Pro Unlimited</h3>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white text-zinc-950 flex items-center justify-center font-bold shadow-md">
                <Zap className="h-5 w-5 fill-current" />
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              For high-growth agencies, marketing teams, and power outreachers needing high-volume dispatch.
            </p>

            {/* Price */}
            <div className="border-y border-zinc-750 py-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {billingCycle === 'monthly' ? '₹999' : '₹4,999'}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {billingCycle === 'monthly' ? '/ month' : '/ 1-year pass'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono mt-1">
                {billingCycle === 'monthly' ? '● Unlimited volume • Priority AI speed' : '● 12 months full unlimited access • Save 58%'}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-white font-semibold">
                <div className="h-5 w-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span><strong>Multiple WhatsApp Accounts</strong> (Round-Robin Switching)</span>
              </div>

              <div className="flex items-center gap-2.5 text-white font-semibold">
                <div className="h-5 w-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span className="text-emerald-400 font-bold">UNLIMITED Messages Daily (0 Restrictions)</span>
              </div>

              <div className="flex items-center gap-2.5 text-white font-semibold">
                <div className="h-5 w-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span><strong>Multiple Email Accounts</strong> (Resend Multi-Key Pool)</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>Unlimited Google Places & YouTube Channel Discovery</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>Anti-Ban Human Delay (30-45s Random Interval)</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>1-Click Bulk Campaign Dispatch Engine</span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-200">
                <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span>Full CSV / Excel Export & Live Replies Inbox</span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectPlan('pro')}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2 relative z-10"
          >
            <span>Get Agency Pro Passkey (₹{billingCycle === 'monthly' ? '499' : '1,999'}) ➔</span>
          </motion.button>
        </div>
      </div>

      {/* Trust & Guarantee Strip */}
      <div className="mt-12 max-w-4xl mx-auto p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Instant Passkey Delivery
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> UPI, GPay, PhonePe & Cards Accepted
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Private Local Database
        </span>
      </div>
    </section>
  );
};
