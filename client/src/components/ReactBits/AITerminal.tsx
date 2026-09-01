import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, Sparkles, Check, Copy, Play, RefreshCw, Cpu } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  category: string;
  location: string;
  radarFinding: string;
  aiAngle: string;
  generatedPitch: string;
}

const scenarios: Scenario[] = [
  {
    id: 'dental',
    name: 'Apex Dental Care',
    category: 'Healthcare & Clinic',
    location: 'Bandra, Mumbai',
    radarFinding: 'Missing website link on Google Maps • 4.8★ (94 reviews)',
    aiAngle: 'Inquire about dental implant timings, then offer 1-page booking concept',
    generatedPitch:
      'Hello doctor! Dental implant consultation ke timings kya rehte hain? Google pe clinic dekha par direct booking page link nahi mila—humne clinic ke liye ek clean modern booking preview draft kiya hai. Kya main 30-sec preview share karun?',
  },
  {
    id: 'youtube',
    name: 'FinanceWithAditi',
    category: 'YouTube Creator',
    location: 'National / Finance Niche',
    radarFinding: '42.5K Subscribers • Low CTR thumbnails on last 4 uploads',
    aiAngle: 'Point out retention gap, offer A/B high-converting thumbnail mockup',
    generatedPitch:
      'Hey Aditi! Loved your breakdown on index funds yesterday. Noticed the click-through might be missing out on your latest 3 videos due to low-contrast thumbnails—mocked up 2 high-CTR concepts for your next drop. Mind if I send them over free?',
  },
  {
    id: 'interior',
    name: 'Vogue Luxe Spaces',
    category: 'Architecture & Design',
    location: 'South Delhi',
    radarFinding: 'Active phone number • Zero mobile portfolio page',
    aiAngle: 'Ask for residential portfolio catalog, present interactive 3D concept',
    generatedPitch:
      'Hi team Vogue! Do you take on 3BHK turnkey renovation projects in South Delhi? I was searching for your online lookbook. We designed a rapid mobile portfolio concept showcasing before/after sliders—open to a quick preview?',
  },
];

export const AITerminal: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(scenarios[0]);
  const [logIndex, setLogIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const logs = [
    { tag: 'RADAR_SCAN', text: `Scanning Google Places for "${selectedScenario.category}" in ${selectedScenario.location}...` },
    { tag: 'DATA_EXTRACT', text: `Target isolated: ${selectedScenario.name} • ${selectedScenario.radarFinding}` },
    { tag: 'NEURAL_AUDIT', text: `Opportunity Angle: ${selectedScenario.aiAngle}` },
    { tag: 'GEMINI_2.0', text: `Synthesizing non-salesy 2-part conversation hook (0 tokens spent)...` },
    { tag: 'DISPATCH_READY', text: `Generated customized pitch for WhatsApp & Email pipeline:` },
  ];

  useEffect(() => {
    setLogIndex(0);
    const timers: any[] = [];
    for (let i = 0; i <= logs.length; i++) {
      timers.push(
        setTimeout(() => {
          setLogIndex(i);
        }, (i + 1) * 350)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [selectedScenario]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedScenario.generatedPitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRerun = () => {
    setIsSimulating(true);
    setLogIndex(0);
    setTimeout(() => {
      setIsSimulating(false);
      setLogIndex(logs.length);
    }, 1500);
  };

  return (
    <div className="rounded-3xl bg-[#09090b]/90 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
      {/* Terminal Top Window Bar */}
      <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <TerminalIcon className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-200 font-bold">autonomous-lead-engine.ts</span>
            <span className="text-zinc-500">•</span>
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE REASONING
            </span>
          </div>
        </div>

        {/* Preset Category Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                selectedScenario.id === sc.id
                  ? 'bg-white text-zinc-950 font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {sc.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 font-mono text-xs space-y-4">
        {/* Step-by-step Telemetry Logs */}
        <div className="space-y-2 text-left">
          {logs.slice(0, logIndex).map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2.5"
            >
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold shrink-0">
                {log.tag}
              </span>
              <span className="text-zinc-300 leading-relaxed">{log.text}</span>
            </motion.div>
          ))}

          {logIndex < logs.length && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Processing autonomous steps...</span>
            </div>
          )}
        </div>

        {/* Pitch Generation Output Card */}
        {logIndex >= logs.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-left relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-sans">
                <Sparkles className="h-3.5 w-3.5 text-white" />
                <span className="font-bold text-white">AI Non-Salesy 2-Part Conversation Starter</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] transition-all cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-850 text-zinc-200 text-xs leading-relaxed font-sans select-all">
              "{selectedScenario.generatedPitch}"
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-sans pt-1 border-t border-zinc-900">
              <span>Target: {selectedScenario.name} • {selectedScenario.location}</span>
              <span className="text-emerald-400 font-mono font-medium">Ready for WhatsApp 1-Click Send</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Terminal Footer Controls */}
      <div className="px-6 py-3 border-t border-zinc-850 bg-zinc-950/60 flex items-center justify-between text-xs font-mono text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-zinc-400" />
          <span>Gemini 2.0 Flash • 0ms Latency Overhead</span>
        </span>
        <button
          onClick={handleRerun}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>Re-run Trace</span>
        </button>
      </div>
    </div>
  );
};
