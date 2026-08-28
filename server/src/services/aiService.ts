import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from './settingsService';
import { aiRateLimiter } from '../utils/rateLimiter';
import { validateAndSanitizePitch, getGuardrailRulesDescription } from './guardrailService';

export type OfferedService =
  | 'whatsapp_ai_agent'
  | 'ai_automation'
  | 'website_design'
  | 'social_media_management'
  | 'branding_logo'
  | 'paid_ads'
  | 'gmb_local_seo'
  | 'content_creation_reels'
  | 'general';

export interface LeadForPitch {
  name: string;
  category?: string;
  source: 'google_places' | 'youtube';
  address?: string;
  website?: string;
  has_website?: boolean;
  instagram_handle?: string;
  rating?: number;
  user_ratings_total?: number;
  subscriber_count?: number;
  video_count?: number;
  description?: string;
  offered_service?: OfferedService;
  custom_instructions?: string;
  sender_name?: string;
  format?: 'whatsapp' | 'email';
}

export type PitchTone = 'friendly' | 'value_offer' | 'collab' | 'direct';

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

/**
 * Intelligent Gap Analysis Engine
 * Evaluates client data and picks the single most impactful service to pitch.
 */
export function performGapAnalysis(lead: LeadForPitch): {
  primaryGap: string;
  recommendedService: OfferedService;
  gentleObservation: string;
} {
  // 1. If lead has NO website
  if (lead.has_website === false || !lead.website) {
    return {
      primaryGap: 'No active business website or direct booking link on Google',
      recommendedService: 'website_design',
      gentleObservation:
        'Google pe direct booking website link add nahi hai jisse kayi naye customers miss ho sakte hain.',
    };
  }

  // 2. If YouTube Creator or visual local business needing short-form Reels
  if (lead.source === 'youtube' || (lead.category && /gym|fitness|restaurant|cafe|fashion|studio|dental/i.test(lead.category))) {
    return {
      primaryGap: 'High customer attention shifting to short-form Reels & Video Content',
      recommendedService: 'content_creation_reels',
      gentleObservation:
        'Aajkal local customers 30-sec reels aur videos dekh kar sabse zyada connect aur visit karte hain.',
    };
  }

  // 3. If has website but low reviews / needs local visibility
  if (!lead.rating || (lead.user_ratings_total && lead.user_ratings_total < 30)) {
    return {
      primaryGap: 'Low visibility on Google local maps search in their city',
      recommendedService: 'gmb_local_seo',
      gentleObservation:
        'Google Business profile optimization se aap apne area ke search results mein top spots rank kar sakte hain.',
    };
  }

  // 4. Default high-demand service: 24/7 WhatsApp AI Agent
  return {
    primaryGap: 'Converting manual WhatsApp & customer phone queries into instant automatic bookings',
    recommendedService: 'whatsapp_ai_agent',
    gentleObservation:
      'WhatsApp par customers ki late responses ki wajah se leads drop hone se rokne ke liye 24/7 AI response zaroori hai.',
  };
}

export async function generatePitch(
  lead: LeadForPitch,
  tone: PitchTone = 'friendly',
  offeredService: OfferedService = 'general',
  customInstructions?: string,
  format: 'whatsapp' | 'email' = 'whatsapp',
  senderName: string = 'Kropix Studio'
): Promise<{ pitch: string; provider: string; isMock: boolean; warnings?: string[] }> {
  const geminiKey = await getSetting('geminiApiKey');
  const claudeKey = await getSetting('claudeApiKey');

  // Perform automatic Gap Analysis
  const gapResult = performGapAnalysis(lead);
  const targetService = offeredService !== 'general' ? offeredService : gapResult.recommendedService;

  const leadContext = formatLeadContext(lead);
  const prompt = buildKropixDirectValuePrompt(lead, leadContext, targetService, gapResult, format, senderName, customInstructions);

  let rawPitch = '';
  let provider = 'smart-template-engine';
  let isMock = true;

  // 1. Try Gemini
  if (geminiKey) {
    for (const modelName of GEMINI_MODELS) {
      try {
        await aiRateLimiter.acquire();
        console.log(`[Kropix AI Engine] Generating Dynamic pitch for [${targetService}] with Gemini (${modelName})...`);
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        if (text) {
          rawPitch = cleanPitchText(text);
          provider = modelName;
          isMock = false;
          break;
        }
      } catch (err: any) {
        console.error(`[Kropix AI Engine] Gemini (${modelName}) error:`, err.message);
      }
    }
  }

  // 2. Try Claude
  if (!rawPitch && claudeKey) {
    try {
      await aiRateLimiter.acquire();
      console.log(`[Kropix AI Engine] Generating Dynamic pitch for [${targetService}] with Claude...`);
      const anthropic = new Anthropic({ apiKey: claudeKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = (response.content[0] as any)?.text?.trim() || '';
      if (text) {
        rawPitch = cleanPitchText(text);
        provider = 'claude-3-haiku';
        isMock = false;
      }
    } catch (err: any) {
      console.error('[Kropix AI Engine] Claude error:', err.message);
    }
  }

  // 3. Smart dynamic algorithmic fallback (Multi-template randomized engine)
  if (!rawPitch) {
    rawPitch = generateKropixDirectValueFallback(lead, targetService, gapResult, format, senderName);
    provider = 'kropix-dynamic-engine';
    isMock = true;
  }

  // 4. Run Fact-Checking & Promise Guardrail Sanitizer
  const guardrailResult = validateAndSanitizePitch(rawPitch);

  return {
    pitch: guardrailResult.sanitizedText,
    provider,
    isMock,
    warnings: guardrailResult.warnings.length > 0 ? guardrailResult.warnings : undefined,
  };
}

function formatLeadContext(lead: LeadForPitch): string {
  const parts: string[] = [`Business/Channel Name: ${lead.name}`, `Category: ${lead.category || 'Local Business'}`];
  
  if (lead.source === 'google_places') {
    if (lead.address) parts.push(`Location: ${lead.address}`);
    if (lead.rating) parts.push(`Google Rating: ${lead.rating}★ (${lead.user_ratings_total || 0} reviews)`);
    parts.push(`Website Status: ${lead.has_website !== false && lead.website ? `Active (${lead.website})` : 'NO WEBSITE (High Opportunity)'}`);
    if (lead.instagram_handle) parts.push(`Instagram: ${lead.instagram_handle}`);
  } else if (lead.source === 'youtube') {
    if (lead.subscriber_count) parts.push(`Subscribers: ${lead.subscriber_count.toLocaleString()}`);
    if (lead.video_count) parts.push(`Videos: ${lead.video_count}`);
  }
  return parts.join('\n');
}

function buildKropixDirectValuePrompt(
  lead: LeadForPitch,
  leadContext: string,
  targetService: OfferedService,
  gapResult: ReturnType<typeof performGapAnalysis>,
  format: 'whatsapp' | 'email',
  senderName: string,
  customInstructions?: string
): string {
  const serviceAngles: Record<OfferedService, string> = {
    whatsapp_ai_agent: 'Offer a custom 24/7 WhatsApp AI Assistant / Chatbot that automatically answers customer inquiries, qualifies leads, and books appointments instantly in Hinglish & English without manual staff effort.',
    ai_automation: 'Offer custom AI automation workflows and automated response bots to handle customer calls, WhatsApp queries, and lead capture automatically 24/7.',
    website_design: lead.has_website === false || !lead.website
      ? 'Offer a clean 1-page modern mobile booking mockup preview tailored for their business since they have no website.'
      : 'Offer a 60-sec video breakdown of 2 quick mobile tweaks to increase direct booking inquiries.',
    social_media_management: 'Offer 3 custom social media creative concepts tailored for their brand.',
    branding_logo: 'Offer a modern brand identity & creative concept preview.',
    paid_ads: 'Offer a 1-page breakdown on how local ads can bring 20+ direct inquiries every week.',
    gmb_local_seo: 'Offer a 2-page local Google Maps ranking audit breakdown.',
    content_creation_reels: 'Offer 2 sample short reels/video clips scripted for their business.',
    general: 'Offer a quick tailored growth concept.',
  };

  const styleVariants = [
    'STYLE 1: Direct & Practical Observer (focus on practical customer experience and immediate value preview).',
    'STYLE 2: Genuine Peer Recognition (highlight their exact reputation and suggest 1 seamless conversion upgrade).',
    'STYLE 3: Growth & ROI Angle (focus on how other top businesses in their city are automating inquiries).',
    'STYLE 4: Creative Concept Pitch (focus on a tailored demo concept already prepared for them).',
  ];
  const chosenStyle = styleVariants[Math.floor(Math.random() * styleVariants.length)];

  return `You are a high-conversion, ultra-natural outreach specialist for KROPIX STUDIO reaching out to Indian business owners & creators.

CLIENT DETAILS:
${leadContext}

IDENTIFIED GAP: ${gapResult.primaryGap}
SERVICE & VALUE OFFER: ${serviceAngles[targetService]}
APPLIED WRITING ANGLE: ${chosenStyle}

CRITICAL DYNAMIC COPYWRITING & ANTI-ROBOTIC RULES:
1. NEVER use a repetitive formula or telemarketer greeting ("Main Kropix Studio se baat kar raha hoon", "I hope this finds you well").
2. Make every message unique in opening, flow, and phrasing.
3. Hook variety: Use genuine recognition of their business, location, rating (${lead.rating || ''}★), or customer volume.
4. Soft CTA variety: Use conversational closing questions like:
   - "Kya main iska ek quick 30-sec demo preview share karun?"
   - "Open to seeing a quick concept mockup?"
   - "Ek short 1-page breakdown bhejun aapke sath dekhne ke liye?"
   - "Would you be open to taking a quick look at the preview?"
5. STRICT AGENCY RULE: NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP". Always refer to it simply as a "concept preview", "mockup preview", "sample concept", or "quick demo".
6. Tone: Natural, friendly Indian Hinglish with "Aap" (Polite, conversational, feels 100% human).
7. Length: Exactly 4 to 5 short lines for WhatsApp (Under 70 words).

${getGuardrailRulesDescription()}

${
  format === 'whatsapp'
    ? 'FORMAT: WhatsApp format (4 to 5 short lines, no subject line).'
    : 'FORMAT: Email format (Subject Line on line 1, followed by 5 to 6 lines body).'
}
${customInstructions ? `Additional guidance: ${customInstructions}` : ''}

Output ONLY the raw outreach message text.`;
}

function cleanPitchText(text: string): string {
  return text.replace(/^["']|["']$/g, '').trim();
}

/**
 * Dynamic Multi-Template Algorithmic Fallback Engine
 * Uses randomized pools of hooks, value offers, and soft CTAs so no two messages are identical.
 */
function generateKropixDirectValueFallback(
  lead: LeadForPitch,
  service: OfferedService,
  gap: ReturnType<typeof performGapAnalysis>,
  format: 'whatsapp' | 'email',
  senderName: string
): string {
  const loc = lead.address ? lead.address.split(',')[0].trim() : 'aapke city';
  const ratingStr = lead.rating ? `${lead.rating}★` : 'positive';
  const variantIndex = Math.floor(Math.random() * 4);

  if (format === 'whatsapp') {
    // 1. WHATSAPP AI AGENT & AI AUTOMATION
    if (service === 'whatsapp_ai_agent' || service === 'ai_automation') {
      const templates = [
        `Hi ${lead.name} team! ${loc} mein aapka business setup aur reviews notice kiye—customer trust kaafi solid hai.\n\nAajkal bohot se customers WhatsApp pe instant inquiries bhejte hain, lekin busy hours me response late hone se leads miss ho jaati hain.\n\nHumne aapke business ke liye ek 24/7 AI WhatsApp Agent ka quick concept design kiya hai jo automatically inquiries answer karke bookings schedule karta hai—kya main ek 30-sec live demo share karun?`,
        `Hello ${lead.name} team! ${loc} mein aapka work dekh kar reach out kar raha hoon.\n\nEk quick observation thi: peak hours me customer messages handle karne me time lagta hai jisse direct deals drop hoti hain.\n\nHumne ek custom 24/7 WhatsApp AI Chatbot workflow draft kiya hai jo inquiries ko 5 second me answer aur qualify karta hai—kya aap open hain ek quick demo dekhne ke liye?`,
        `Hi ${lead.name}! Google pe aapki ${ratingStr} rating dekh kar kaafi achha laga!\n\nAapke industry ke leading brands ab 24/7 WhatsApp AI Automation use kar rahe hain customer support aur appointment booking ke liye.\n\nMaine aapke brand ke liye ek tailored AI WhatsApp Agent ka sample concept banaya hai—kya main ek short preview share karun?`,
        `Namaste ${lead.name} team! ${loc} mein aapka customer response kaafi impressive hai.\n\nHumne aapke business ke daily WhatsApp traffic ko automate karne ke liye ek smart AI Agent concept ready kiya hai jo Hindi/English dono me clients handle kar sakta hai.\n\nKya main iska ek quick 30-sec video demo share karun aapke sath?`,
      ];
      return templates[variantIndex % templates.length];
    }

    // 2. WEBSITE DESIGN
    if (service === 'website_design') {
      if (lead.has_website === false || !lead.website) {
        const templates = [
          `Hi ${lead.name} team! ${loc} mein aapka setup aur Google pe ${ratingStr} reviews notice kiye—customer trust sach mein kaafi badiya hai.\n\nBas ek observation thi ki Google pe direct booking website link add nahi hai jisse kayi naye clients miss ho sakte hain.\n\nHumne aapke business ke liye ek clean 1-page modern booking website ka mockup design kiya hai—kya main ek quick preview share karun dekhne ke liye?`,
          `Hello ${lead.name} team! ${loc} mein aapke Google reviews kaafi solid lage!\n\nNotice kiya ki online search karne pe aapka koi direct official website page nahi khulta jisse competitors ko faayda hota hai.\n\nHumne aapke business ke liye ek premium mobile-friendly booking concept ready kiya hai—kya aap open hain ek short preview dekhne ke liye?`,
          `Hi ${lead.name}! ${loc} mein aapka popular reputation notice kiya.\n\nAapke Google listing pe website missing hone ki wajah se direct online inquiries track nahi ho pa rahi hain.\n\nMaine aapke liye ek fast 1-page modern web design mockup prepare kiya hai—kya main iska ek 30-sec preview link bhejun?`,
          `Namaste ${lead.name} team! Google Maps pe aapka business dekha—feedback kaafi achha hai!\n\nAapke business ko local search me top spot aur direct inquiries dilane ke liye ek modern booking landing page ka concept draft kiya hai.\n\nKya main ek quick concept preview share karun aapke sath?`,
        ];
        return templates[variantIndex % templates.length];
      } else {
        const templates = [
          `Hi ${lead.name} team! ${loc} mein aapka work aur Google rating kaafi impressive laga!\n\nAapki website check ki aur 2 chhote mobile tweaks notice kiye jisse direct inquiries 15-20% boost ho sakti hain.\n\nMaine ek short 60-second video breakdown ready kiya hai—kya main share karun aapke sath?`,
          `Hello ${lead.name} team! Aapka setup aur website visit kiya—design achha hai!\n\nBas mobile loading speed aur direct call button placement me ek quick optimization notice ki jisse inquiry conversion double ho sakti hai.\n\nKya main ek short 1-page breakdown share karun aapke review ke liye?`,
        ];
        return templates[variantIndex % templates.length];
      }
    }

    // 3. SHORT-FORM REELS & VIDEO EDITING
    if (service === 'content_creation_reels') {
      const templates = [
        `Hi ${lead.name} team! Aapka setup aur customer reviews dekh kar kaafi achha laga.\n\nAajkal local customers 30-sec reels aur videos dekh kar sabse zyada connect karte hain.\n\nHumne aapke brand ke liye 2 high-impact short video ideas script kiye hain—kya main sample clips share karun?`,
        `Hello ${lead.name} team! ${loc} mein aapka reputation notice kiya!\n\nAapke niche me short-form video reels se organically 3x zyada walk-in customers attract ho rahe hain.\n\nMaine aapke business ke liye 2 custom viral reel concepts format kiye hain—kya main ek quick preview share karun?`,
        `Hi ${lead.name}! Google pe aapka business aur rating dekhi—solid customer trust hai!\n\nAapke services ko highlight karne ke liye 2 aesthetic short-form promotional reels ka concept draft kiya hai.\n\nKya aap open hain ek quick sample preview dekhne ke liye?`,
      ];
      return templates[variantIndex % templates.length];
    }

    // 4. GOOGLE MAPS LOCAL SEO
    if (service === 'gmb_local_seo') {
      const templates = [
        `Hi ${lead.name} team! ${loc} mein aapka reputation kaafi solid hai!\n\nGoogle Business profile mein thodi si optimization se aap apne area ke search results mein top spots rank kar sakte hain.\n\nMaine ek 2-page local ranking audit breakdown ready kiya hai—kya main share karun aapke sath?`,
        `Hello ${lead.name} team! ${loc} mein local searches check kar rahe the aur aapka business notice kiya.\n\nCategory keywords aur photo optimization ke through Google Maps pe aapke business ke calls aur direction requests kaafi badh sakte hain.\n\nKya main ek short ranking audit report share karun aapke sath?`,
      ];
      return templates[variantIndex % templates.length];
    }

    // 5. GENERAL & PAID ADS
    const generalTemplates = [
      `Hi ${lead.name} team! ${loc} mein aapke positive customer reviews dekh kar reach out kar raha hoon.\n\nAapke business ke liye ek customized digital growth concept draft kiya hai jisse direct customer inquiries scale ho sakein.\n\nKya aap open hain ek quick 30-sec preview dekhne ke liye?`,
      `Hello ${lead.name} team! ${loc} mein aapka brand aur rating kaafi solid lagi.\n\nHumne aapke niche ke liye targeted customer acquisition ka ek high-converting concept layout kiya hai.\n\nKya main ek short concept overview share karun aapke sath?`,
    ];
    return generalTemplates[variantIndex % generalTemplates.length];
  } else {
    // Email format with variety
    const emailSubjects = [
      `Quick question regarding ${lead.name}`,
      `Growth idea for ${lead.name} in ${loc}`,
      `Quick observation & concept for ${lead.name}`,
    ];
    const chosenSubject = emailSubjects[variantIndex % emailSubjects.length];

    return `Subject: ${chosenSubject}\n\nHello Team ${lead.name},\n\nCame across ${lead.name} in ${loc}—love the solid reputation and reviews you've built!\n\n${gap.gentleObservation}\n\nWe put together a clean, modern concept tailored for your business to help boost direct customer inquiries.\n\nWould you be open to taking a quick look at a preview? Please let me know.\n\nBest regards,\nTeam Kropix Studio`;
  }
}

/**
 * Sentiment & Tone Matching Engine
 */
export interface SentimentAnalysis {
  sentiment: 'enthusiastic' | 'curious' | 'skeptical' | 'direct_busy' | 'cautious' | 'neutral';
  toneLabel: string;
  recommendedStyle: string;
}

export function analyzeMessageSentiment(incomingText: string): SentimentAnalysis {
  const text = incomingText.toLowerCase();

  if (/\b(love|awesome|great|super|interested|excited|definitely|let's do it|sure!|yes!|badiya|achha|ha|haa|bhejo|share karo|batao)\b/.test(text)) {
    return {
      sentiment: 'enthusiastic',
      toneLabel: '🤩 Enthusiastic & Eager',
      recommendedStyle: 'Match their energy with warm, high-energy Hinglish and clear scheduling steps.',
    };
  }

  if (/\b(how much|cost|pricing|price|expensive|guarantee|proof|kitna|charge|rate|paisa|trust|scam|expensive)\b/.test(text)) {
    return {
      sentiment: 'skeptical',
      toneLabel: '🧐 Skeptical / Price-Conscious',
      recommendedStyle: 'Provide respectful reassurance, zero pressure, explain pricing is customized and offer the preview first.',
    };
  }

  if (text.length < 35 && /\b(send details|how|what is it|link\??|info\??|tell me more|details bhejo|link)\b/.test(text)) {
    return {
      sentiment: 'direct_busy',
      toneLabel: '⚡ Direct & Busy',
      recommendedStyle: 'Be ultra-concise (<35 words), give the direct next step or preview immediately in Hinglish.',
    };
  }

  if (/\b(can you explain|what do you do|how does it work|sample|portfolio|case study|kaise karte ho|kya kya karte ho)\b/.test(text)) {
    return {
      sentiment: 'curious',
      toneLabel: '🤔 Curious & Exploratory',
      recommendedStyle: 'Share a clear, punchy 2-sentence value breakdown and offer a 60-sec video or sample concept.',
    };
  }

  if (/\b(maybe|not sure|later|busy right now|next month|baad mein|abhi nahi|no need)\b/.test(text)) {
    return {
      sentiment: 'cautious',
      toneLabel: '⏳ Hesitant / Busy',
      recommendedStyle: 'Respect their time, offer to send a quick one-pager for them to review whenever convenient.',
    };
  }

  return {
    sentiment: 'neutral',
    toneLabel: '💬 Professional & Inquiring',
    recommendedStyle: 'Clear, helpful, and professional tone with a single low-friction next step.',
  };
}

/**
 * Generate Smart Reply Matching Sentiment, Guardrails & Kropix Studio Training (No "Free" phrasing)
 */
export async function generateSmartReply(
  incomingMessage: string,
  originalPitch?: string,
  leadName?: string,
  senderName: string = 'Kropix Studio'
): Promise<{ reply: string; sentiment: SentimentAnalysis; warnings?: string[] }> {
  const sentiment = analyzeMessageSentiment(incomingMessage);
  const geminiKey = await getSetting('geminiApiKey');

  const prompt = `You are an elite, highly trained conversational closing specialist writing on behalf of KROPIX STUDIO responding to an Indian business client's message.

CLIENT NAME: ${leadName || 'Client'}
CLIENT INCOMING MESSAGE: "${incomingMessage}"
${originalPitch ? `ORIGINAL OUTREACH PITCH SENT: "${originalPitch}"` : ''}

DETECTED SENTIMENT & GOAL:
Sentiment: ${sentiment.sentiment} (${sentiment.toneLabel})
Recommended Approach: ${sentiment.recommendedStyle}

CRITICAL RULES:
1. NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP". Refer to it as a "concept preview", "mockup preview", "sample concept", or "quick demo".
2. Keep replies natural, respectful, and short (2 to 4 sentences).
3. Use polite, conversational Indian Hinglish with "Aap".
4. Focus on taking ONE low-friction next step (sharing preview or setting a 5-min call).

${getGuardrailRulesDescription()}

Output ONLY the raw reply text.`;

  let replyText = '';

  if (geminiKey) {
    for (const modelName of GEMINI_MODELS) {
      try {
        await aiRateLimiter.acquire();
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        if (text) {
          replyText = cleanPitchText(text);
          break;
        }
      } catch (err: any) {
        console.error(`[SmartReply Engine] Gemini error (${modelName}):`, err.message);
      }
    }
  }

  if (!replyText) {
    if (sentiment.sentiment === 'enthusiastic') {
      replyText = `Awesome! Ye raha aapke business ke liye custom concept preview: [Demo Link]. Dekh kar batayein kaisa laga!`;
    } else if (sentiment.sentiment === 'skeptical') {
      replyText = `Pricing aapke exact requirement aur scope pe depend karti hai. Hum pehle ek custom mockup banakar share karte hain taaki aap design aur quality dekh sakein. Kya main preview send karun?`;
    } else if (sentiment.sentiment === 'direct_busy') {
      replyText = `Sure! Ye aapke business ke liye 1-page modern concept ka quick preview link hai: [Demo Link]. Jab bhi free hon, check karke batayein.`;
    } else {
      replyText = `Zaroor! Maine aapke business ke niche se related sample concept preview ready kiya hai. Kya main direct WhatsApp pe share karun?`;
    }
  }

  const sanitized = validateAndSanitizePitch(replyText);

  return {
    reply: sanitized.sanitizedText,
    sentiment,
    warnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };
}
