import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Youtube,
  MessageCircle,
  Mail,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Play,
  Search,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShinyText } from '../ReactBits/ShinyText';
import { DecryptedText } from '../ReactBits/DecryptedText';
import { SpotlightCard } from '../ReactBits/SpotlightCard';
import { BlurText } from '../ReactBits/BlurText';
import { CountUp } from '../ReactBits/CountUp';
import { Magnet } from '../ReactBits/Magnet';
import { InfiniteMarquee } from '../ReactBits/InfiniteMarquee';
import { GradientWaves } from '../ReactBits/GradientWaves';
import { Particles } from '../ReactBits/Particles';
import { BorderBeam } from '../ReactBits/BorderBeam';
import { EasyLeadFlow } from '../ReactBits/EasyLeadFlow';
import { NeuralArchitecture } from '../ReactBits/NeuralArchitecture';
import { PricingSection } from '../ReactBits/PricingSection';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [activeTab, setActiveTab] = useState<'places' | 'youtube' | 'ai' | 'whatsapp'>('places');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Interactive Live Simulator State (Clean Monochrome)
  const [simNiche, setSimNiche] = useState('Dental Clinics');
  const [simCity, setSimCity] = useState('Mumbai');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [simResultsReady, setSimResultsReady] = useState(true);

  // Interactive ROI Calculator State
  const [outreachPerDay, setOutreachPerDay] = useState(40);

  // Language Preview for AI tab
  const [aiLang, setAiLang] = useState<'hinglish' | 'english'>('hinglish');

  const handleRunSimulation = () => {
    setIsScanning(true);
    setScanProgress(0);
    setSimResultsReady(false);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setSimResultsReady(true);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  const handleCtaClick = () => {
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ffffff', '#e4e4e7', '#a1a1aa', '#52525b'],
    });
    onOpenLogin();
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Calculated ROI values
  const hoursSavedPerMonth = Math.round((outreachPerDay * 30 * 4) / 60);
  const estimatedReplies = Math.round(outreachPerDay * 30 * 0.12);
  const estimatedDeals = Math.max(1, Math.round(estimatedReplies * 0.2));
  const estimatedRevenue = (estimatedDeals * 25000).toLocaleString('en-IN');

  const faqs = [
    {
      q: 'How does Outreach AI find leads with missing websites?',
      a: 'Outreach AI queries Google Places and Maps API in real-time across 50+ business categories. It automatically checks each listing for website availability, rating, contact phone numbers, and physical location, isolating businesses that need high-ticket digital upgrades.',
    },
    {
      q: 'How does the Anti-Ban WhatsApp automation work?',
      a: 'Our engine uses the official Baileys Web protocol with multi-account linking, human-like randomized delays (30-45s), and smart round-robin rotation. By splitting messages across multiple phone numbers, your accounts remain 100% safe within safe daily caps.',
    },
    {
      q: 'Can I use Outreach AI for YouTube creators and video editors?',
      a: 'Yes! The YouTube Creator Finder inspects channels based on niche keywords, filtering by subscriber count, view-to-sub ratios, and flagging channels that need high-converting thumbnail redesigns or short-form video editing.',
    },
    {
      q: 'How do I get a Product Passkey or License Key?',
      a: 'You can get your instant product passkey by joining our official Discord community at https://discord.gg/WvhX8fBTx. Our team will assign your private workspace key instantly.',
    },
    {
      q: 'Are my API keys and configurations private from other users?',
      a: 'Absolutely. Every client account and passkey is assigned a completely isolated multi-tenant database workspace. Your API keys, SMTP credentials, and leads are never visible to other users.',
    },
    {
      q: 'What kind of cold messages does the AI generate?',
      a: 'The AI uses a proven 2-part conversation formula: Part 1 asks a genuine, niche-specific customer question (e.g. asking about packages or appointments), and Part 2 makes a gentle observation offering a custom concept preview. It supports both pure English and polite Hinglish.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-white selection:text-black font-sans antialiased overflow-x-hidden relative">
      {/* Background Subtle Monochrome Grid & Interactive Neural Particles */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50 z-0" />
      <Particles className="fixed inset-0 z-0 opacity-40" quantity={40} color="#ffffff" />

      {/* 1. TOP FLOATING NAVBAR (Luxury Glassmorphic Floating Pill) */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-3 z-50 px-4 sm:px-6"
      >
        <div className="max-w-6xl mx-auto h-16 rounded-2xl bg-[#0e0e11]/90 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center shadow overflow-hidden p-1 relative shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden h-full w-full items-center justify-center text-white">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 font-mono">
                  OUTREACH<span className="text-zinc-500">.AI</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-zinc-950 font-bold uppercase shadow-sm">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">Automated Client Acquisition</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#demo" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Plans & Pricing</a>
            <a href="#features" className="hover:text-white transition-colors">Superpowers</a>
            <a href="#simulator" className="hover:text-white transition-colors">Live Radar</a>
            <a href="#calculator" className="hover:text-white transition-colors">ROI Calculator</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://discord.gg/WvhX8fBTx"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-750 transition-all hover:border-zinc-600"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Get Passkey (Discord)</span>
            </a>
            <Magnet magnetStrength={3}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Enter Passkey ➔</span>
              </motion.button>
            </Magnet>
          </div>
        </div>
      </motion.nav>

      {/* 2. HERO SECTION (With ReactBits GradientWaves in Monochrome Theme) */}
      <section className="relative z-10 pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8 overflow-hidden">
        {/* ReactBits GradientWaves WebGL Background (Luxury Monochrome Theme) */}
        <GradientWaves
          className="opacity-80"
          horizonColor="#09090b"
          waveColor="#18181b"
          crestColor="#71717a"
          speed={0.28}
          amplitude={2.2}
          waveScale={0.55}
          waveRatio={0.9}
          swell={28}
          turbulence={16}
          tilt={1.11}
          zoom={1.0}
          height={5.5}
          fogDepth={15}
          detail="medium"
          brightness={1.0}
          opacity={0.65}
          grain={true}
          grainIntensity={0.04}
          mouseInteraction={true}
          parallaxStrength={0.35}
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-750 text-xs text-zinc-300 shadow-inner"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <ShinyText text="Next-Gen Autonomous B2B Client Acquisition Engine" speed={4} className="font-semibold text-xs" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 max-w-4xl mx-auto"
        >
          <div className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            <BlurText
              text="Find High-Ticket Leads. Pitch With AI. Close Deals."
              delay={35}
              animateBy="words"
              className="font-black text-white"
            />
          </div>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            The automated pipeline built for marketing agencies, freelancers, and growth consultants. 
            Discover businesses with missing websites, draft personalized value hooks, and dispatch safely with 0% ban risk.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3 pt-2"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Magnet magnetStrength={3}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCtaClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold shadow-xl transition-all cursor-pointer"
              >
                <span>Launch Outreach Engine</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Magnet>
            <Magnet magnetStrength={3}>
              <a
                href="#demo"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-semibold border border-zinc-750 transition-all cursor-pointer shadow-md"
              >
                <Play className="h-3.5 w-3.5 text-white" />
                <span>See 3-Step Demo ↓</span>
              </a>
            </Magnet>
          </div>

          <div className="text-center pt-2">
            <a
              href="https://discord.gg/WvhX8fBTx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>Don't have an access key?</span>
              <span className="text-white font-bold underline underline-offset-4">Get your passkey on Discord ➔</span>
            </a>
          </div>
        </motion.div>

        {/* Live Metrics Strip with CountUp */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 max-w-4xl mx-auto"
        >
          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 text-left hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="text-2xl font-black text-white font-mono">
              <CountUp to={10000} suffix="+" duration={1.5} />
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Google Leads Extracted</div>
          </motion.div>
          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 text-left hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="text-2xl font-black text-white font-mono">
              <CountUp to={100} suffix="% Safe" duration={1.2} />
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Anti-Ban Multi-WhatsApp</div>
          </motion.div>
          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 text-left hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="text-2xl font-black text-white font-mono">
              <DecryptedText text="0 Token Cost" animateOn="view" />
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Free Gemini & Resend Pool</div>
          </motion.div>
          <motion.div
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 text-left hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="text-2xl font-black text-white font-mono">
              <DecryptedText text="3X Speed" animateOn="view" />
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">Round-Robin Dispatch</div>
          </motion.div>
        </motion.div>

        {/* Live Activity Infinite Marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-2 max-w-5xl mx-auto"
        >
          <InfiniteMarquee
            items={[
              '📍 Dental Clinic found in Mumbai (No Website)',
              '⚡ WhatsApp message dispatched safely via Phone #1',
              '📺 Personal Finance YouTube channel scanned (48.5K Subs)',
              '🤖 Personalized Hinglish AI pitch generated (0 tokens)',
              '✉️ Cold Email delivered via Resend Multi-Pool',
              '🛡️ Double-send prevented for Lead #42',
              '📍 Luxury Interior Designer discovered in South Delhi',
              '⚡ 24/7 Multi-Session WhatsApp Web Active',
            ]}
            speed={30}
          />
        </motion.div>

        {/* Live Autonomous 3-Step Flow Demo - Crystal Clear & Simple */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="pt-6 max-w-5xl mx-auto"
        >
          <EasyLeadFlow />
        </motion.div>
      </section>

      {/* 2.5 NEURAL PIPELINE ARCHITECTURE (ReactBits AnimatedBeam Flow) */}
      <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <NeuralArchitecture />
      </section>

      {/* 3. SIX AUTONOMOUS SUPERPOWERS (SpotlightCard from ReactBits) */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-850">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Six Autonomous Superpowers
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Everything you need to discover, qualify, personalize, and close deals at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700">
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Google Places Lead Harvester</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Extract real-time business listings worldwide. Filter by missing websites, phone numbers, ratings, and physical addresses across 50+ industries.
            </p>
          </SpotlightCard>

          {/* Card 2 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700">
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <Youtube className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">YouTube Creator Opportunity Finder</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Discover channels needing video editing or thumbnail redesigns. Filter by subscriber count and view-to-sub ratios with direct email access.
            </p>
          </SpotlightCard>

          {/* Card 3 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700 relative">
            <BorderBeam size={140} duration={9} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.05)" />
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">AI Value-First Pitch Engine</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generates customized 2-part conversation starters with zero generic spam. Automatically adapts language to pure English or polite Hinglish.
            </p>
          </SpotlightCard>

          {/* Card 4 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700 relative">
            <BorderBeam size={140} duration={9} delay={4.5} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.05)" />
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Account WhatsApp Hub</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect multiple WhatsApp numbers via QR code. Automatically rotates senders round-robin with randomized human delays (30-45s).
            </p>
          </SpotlightCard>

          {/* Card 5 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700">
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Key Cloud Email Rotation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste multiple free Resend keys to multiply free quotas (9,000+ emails/month free) or send directly through Gmail SMTP.
            </p>
          </SpotlightCard>

          {/* Card 6 */}
          <SpotlightCard className="space-y-3 hover:border-zinc-700">
            <div className="p-3 w-fit rounded-xl bg-zinc-900 text-white border border-zinc-750">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Double-Send Guard & Pipeline CRM</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Strict database-backed protection prevents duplicate messages to the same lead. Built-in inbox tracks replies with smart sentiment analysis.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* 4. INTERACTIVE LIVE SIMULATOR (Clean Black & White) */}
      <section id="simulator" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-zinc-850">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-white animate-pulse" />
                <h3 className="text-lg font-bold text-white tracking-tight">Interactive Live Lead Radar Simulator</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Test how Outreach AI discovers unreached prospects & crafts personalized pitches in real-time.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-750">
                ● SIMULATION ACTIVE
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Target Niche</label>
              <select
                value={simNiche}
                onChange={(e) => setSimNiche(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="Dental Clinics">Dental Clinics</option>
                <option value="Real Estate Agencies">Real Estate Agencies</option>
                <option value="Travel & Tours">Travel & Tours</option>
                <option value="Cafes & Bakeries">Cafes & Bakeries</option>
                <option value="Interior Designers">Interior Designers</option>
                <option value="Gyms & Fitness">Gyms & Fitness</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">Target Location</label>
              <select
                value={simCity}
                onChange={(e) => setSimCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="Mumbai">Mumbai, India</option>
                <option value="Delhi NCR">Delhi NCR, India</option>
                <option value="Bengaluru">Bengaluru, India</option>
                <option value="Dubai">Dubai, UAE</option>
                <option value="London">London, UK</option>
                <option value="New York">New York, USA</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunSimulation}
                disabled={isScanning}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{isScanning ? 'Scanning Radar...' : 'Scan Radar Now'}</span>
              </button>
            </div>
          </div>

          {/* Scanning Progress bar animation */}
          {isScanning && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Filtering Google Places for businesses with missing websites...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Simulated Lead Results Cards */}
          {simResultsReady && !isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                <span>⚡ 3 Verified High-Intent Leads Found in {simCity}</span>
                <span className="text-zinc-200 font-semibold">100% Ready for 1-Click Outreach</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Result Card 1 */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-left hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">Apex {simNiche.split(' ')[0]}</div>
                      <div className="text-[10px] text-zinc-500">{simCity} • ★ 4.8 (82 reviews)</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                      NO WEBSITE
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-snug">
                    "Hello team! Consultation timings kya hain? Waise Google pe notice kiya clinic ka appointment link add nahi hai..."
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400">
                    <span>Phone: +91 98201...</span>
                    <span className="text-white font-bold">● Ready</span>
                  </div>
                </div>

                {/* Result Card 2 */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-left hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">Prime {simNiche.split(' ')[0]} Studio</div>
                      <div className="text-[10px] text-zinc-500">{simCity} • ★ 4.6 (45 reviews)</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                      NO WEBSITE
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-snug">
                    "Hi! Available packages ki details mil sakti hain? Online catalogue missing hai isliye humne 1-page concept banaya hai..."
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400">
                    <span>Phone: +91 98192...</span>
                    <span className="text-white font-bold">● Ready</span>
                  </div>
                </div>

                {/* Result Card 3 */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-left hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">Royal Elite {simNiche.split(' ')[0]}</div>
                      <div className="text-[10px] text-zinc-500">{simCity} • ★ 4.9 (110 reviews)</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                      NO WEBSITE
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-snug">
                    "Hello {simCity} branch! WhatsApp inquiry bot concept layout kiya hai taaki customer delay na ho..."
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400">
                    <span>Phone: +91 98923...</span>
                    <span className="text-white font-bold">● Ready</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 5. THREE-STEP WORKFLOW */}
      <section id="workflow" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-850">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How It Works in 3 Simple Steps
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            From discovering unreached prospects to closing deals in your inbox.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3 relative"
          >
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 01</span>
            <h3 className="text-base font-bold text-white">Discover Target Leads</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Search by niche & city or YouTube keywords. Filter out businesses that already have websites to isolate high-intent opportunities.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3 relative"
          >
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 02</span>
            <h3 className="text-base font-bold text-white">Auto-Draft Hyper-Personalized AI Offers</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              1-Click generate custom conversation starters tailored to their business name, location, and specific growth bottlenecks.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3 relative"
          >
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 03</span>
            <h3 className="text-base font-bold text-white">Launch Multi-Channel Safe Dispatch</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Hit launch to send via WhatsApp and Email in the background. Manage incoming replies and sentiment right from your CRM.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 6. INTERACTIVE ROI & TIME SAVED CALCULATOR */}
      <section id="calculator" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-zinc-850">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl space-y-8 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Agency Impact Simulator</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Calculate Your Monthly Growth with Outreach AI
              </h2>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-750 text-xs font-bold text-white">
              ⚡ 100% Automated
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">
                Daily Outreach Messages Target: <span className="font-mono text-white font-bold">{outreachPerDay} leads/day</span>
              </label>
              <span className="text-xs text-zinc-400 font-mono">({outreachPerDay * 30} prospects/mo)</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={outreachPerDay}
              onChange={(e) => setOutreachPerDay(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>10 / day (Solopreneur)</span>
              <span>75 / day (Growing Agency)</span>
              <span>150 / day (Scale)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-4 w-4 text-white" />
                <span>Manual Hours Saved</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{hoursSavedPerMonth} hrs/mo</div>
              <p className="text-[11px] text-zinc-500">Equivalent to 1 full-time SDR intern.</p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <TrendingUp className="h-4 w-4 text-white" />
                <span>Expected Inbound Replies</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">~{estimatedReplies} warm replies</div>
              <p className="text-[11px] text-zinc-500">Based on 12% avg soft-inquiry response.</p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <DollarSign className="h-4 w-4 text-white" />
                <span>Est. Closed Retainers</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">₹{estimatedRevenue}+</div>
              <p className="text-[11px] text-zinc-500">Estimated ~{estimatedDeals} closed clients @ ₹25k avg.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FEATURE DEEP-DIVE SHOWCASE TABS */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-850">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Designed for Speed, Safety & Precision
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Explore the core architectural modules inside the platform.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
          <button
            onClick={() => setActiveTab('places')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'places'
                ? 'bg-zinc-900 border-white text-white'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            📍 Google Places Harvester
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'youtube'
                ? 'bg-zinc-900 border-white text-white'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            📺 YouTube Discovery
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-zinc-900 border-white text-white'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            🤖 AI Pitch Formula
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-zinc-900 border-white text-white'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            📱 WhatsApp Anti-Ban
          </button>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl max-w-4xl mx-auto text-xs space-y-4 text-left">
          {activeTab === 'places' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-white text-sm">Example: "Dental Clinics in Mumbai"</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">Filter: No Website</span>
              </div>
              <div className="space-y-2 font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Apex Dental & Implant Centre</div>
                    <div className="text-zinc-500 text-[11px]">Andheri West, Mumbai • Phone: +91 98201...</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-300 font-bold border border-zinc-800">NO WEBSITE</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">SmileCraft Orthodontics</div>
                    <div className="text-zinc-500 text-[11px]">Bandra West, Mumbai • Phone: +91 98192...</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-300 font-bold border border-zinc-800">NO WEBSITE</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-white text-sm">Example: "Personal Finance & Stock Market"</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">Needs Thumbnail Redesign</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 font-mono">
                <div className="font-bold text-white">Wealth Mastery Hub (48.5K Subscribers)</div>
                <div className="text-zinc-400 text-[11px]">Avg Views: 2.1K/video • Low View-to-Sub Ratio (4.3%)</div>
                <div className="text-zinc-300 text-[11px]">Opportunity: High-converting thumbnail package & 60-sec Short reels repackaging.</div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">2-Part Soft Offer Engine</span>
                  <div className="flex gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                    <button
                      onClick={() => setAiLang('hinglish')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        aiLang === 'hinglish' ? 'bg-white text-black font-bold' : 'text-zinc-400'
                      }`}
                    >
                      Hinglish (India)
                    </button>
                    <button
                      onClick={() => setAiLang('english')}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        aiLang === 'english' ? 'bg-white text-black font-bold' : 'text-zinc-400'
                      }`}
                    >
                      English (Global)
                    </button>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">0 Token Cache Hit</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 leading-relaxed font-sans">
                {aiLang === 'hinglish' ? (
                  <>
                    "Hello doctor / Apex Dental team! Consultation aur dental checkup ke liye timings kya rehti hain? Pre-booking zaroori hai ya direct walk-in kar sakte hain?
                    <br /><br />
                    Waise Google pe search karte time dekha clinic ka direct appointment booking website link add nahi hai. Humne aapke clinic ke liye ek clean 1-page modern appointment booking page ka mockup draft kiya hai—kya main ek short 30-sec preview share karun dekhne ke liye?"
                  </>
                ) : (
                  <>
                    "Hi Apex Dental team! Reaching out to check on your consultation hours and available appointment slots for upcoming checkups.
                    <br /><br />
                    By the way, while searching online I noticed your direct booking website link isn't listed on Google. We put together a clean 1-page modern preview concept for your clinic—would you be open to taking a quick 30-sec look?"
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-white text-sm">WhatsApp Anti-Ban Campaign Monitor</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">2 Phones Linked</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Round-Robin Dispatching: Lead #14 to SmileCraft Dental...</span>
                  <span className="text-white font-bold">Next in 38s</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div className="h-full bg-white w-2/3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7.5 PLANS & PRICING (Starter vs Pro Unlimited) */}
      <PricingSection
        onSelectPlan={(plan) => {
          window.open('https://discord.gg/WvhX8fBTx', '_blank');
        }}
      />

      {/* 8. ABOUT THE PLATFORM - LUXURY BANNER WITH BORDERBEAM */}
      <section id="about" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-850">
        <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#141418] via-[#101014] to-[#09090b] border border-zinc-750 flex flex-col lg:flex-row items-center gap-10 justify-between shadow-2xl overflow-hidden">
          <BorderBeam size={220} duration={12} colorFrom="#ffffff" colorTo="rgba(255, 255, 255, 0.05)" />

          <div className="space-y-5 max-w-2xl text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] font-mono text-zinc-300 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>THE ARCHITECTURE BEHIND OUTREACH AI</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Built Specifically for Digital Agencies & Solopreneurs
            </h2>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              We engineered Outreach AI to eliminate the #1 growth killer: spending hours manually scraping leads, copy-pasting generic cold messages, and getting your primary phone numbers banned on WhatsApp.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">100% Private Workspace</div>
                  <div className="text-[11px] text-zinc-400">Isolated database per key. Your leads are strictly yours.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">0 Token Cost Guarantee</div>
                  <div className="text-[11px] text-zinc-400">Multi-pool Gemini & Resend rotation multiplies free tier.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Anti-Ban Multi-Number WhatsApp</div>
                  <div className="text-[11px] text-zinc-400">Human delays (30-45s) & round-robin account switching.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Lifetime Access</div>
                  <div className="text-[11px] text-zinc-400">No recurring SaaS fee lock-in. Keep 100% of deal profits.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 p-7 rounded-2xl bg-zinc-950 border border-zinc-750 text-center space-y-4 shrink-0 w-full lg:w-80 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow">
              <Lock className="h-6 w-6 text-white" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white">Ready to Start Prospecting?</div>
              <p className="text-[11px] text-zinc-400">Enter your assigned passkey or grab one on Discord.</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCtaClick}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Sign In with Passkey</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            <a
              href="https://discord.gg/WvhX8fBTx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors"
            >
              <span>Get Your Passkey on Discord ➔</span>
            </a>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION (Framer Motion Animated) */}
      <section id="faq" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-zinc-850">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Everything you need to know about the software and licensing.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 cursor-pointer transition-all hover:border-zinc-700"
              onClick={() => toggleFaq(idx)}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">{faq.q}</h3>
                {expandedFaq === idx ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </div>
              <AnimatePresence>
                {expandedFaq === idx && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-zinc-400 leading-relaxed pt-3 border-t border-zinc-800/80 mt-3"
                  >
                    {faq.a}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 10. BOTTOM CTA BANNER */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#121215] border border-zinc-800 shadow-2xl space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Stop Sending Generic Cold Spam. <br className="hidden sm:inline" />
            Start Closing High-Ticket Clients.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
            Get instant access with your product passkey and launch your first AI acquisition campaign in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCtaClick}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold shadow-xl transition-all cursor-pointer"
            >
              <span>Launch Outreach Engine Now</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
            <a
              href="https://discord.gg/WvhX8fBTx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold border border-zinc-800 transition-all"
            >
              <span>Get Passkey on Discord ➔</span>
            </a>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="relative z-10 py-10 px-4 sm:px-6 border-t border-zinc-850 text-center text-xs text-zinc-500 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-zinc-300">Outreach AI Pro</span>
          <span>•</span>
          <a
            href="https://discord.gg/WvhX8fBTx"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 underline"
          >
            Official Discord
          </a>
          <span>•</span>
          <span>Autonomous Client Acquisition & Outreach Engine</span>
        </div>
        <p>© {new Date().getFullYear()} All rights reserved. Enterprise-grade cold outreach technology.</p>
      </footer>
    </div>
  );
};
