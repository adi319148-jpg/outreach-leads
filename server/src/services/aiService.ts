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

  // 4. Established business ready for scaling leads
  return {
    primaryGap: 'Scaling direct inquiries & appointments via targeted ads',
    recommendedService: 'paid_ads',
    gentleObservation:
      'Meta aur Google ads ke through daily direct quality customer inquiries multiply ki ja sakti hain.',
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
        console.log(`[Kropix AI Engine] Generating Direct Value pitch for [${targetService}] with Gemini (${modelName})...`);
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
      console.log(`[Kropix AI Engine] Generating Direct Value pitch for [${targetService}] with Claude...`);
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

  // 3. Smart algorithmic fallback
  if (!rawPitch) {
    rawPitch = generateKropixDirectValueFallback(lead, targetService, gapResult, format, senderName);
    provider = 'kropix-direct-value-engine';
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

  return `You are a high-conversion, ultra-natural outreach specialist for KROPIX STUDIO reaching out to Indian business owners & creators.

CLIENT DETAILS:
${leadContext}

IDENTIFIED GAP: ${gapResult.primaryGap}
GENTLE OBSERVATION: ${gapResult.gentleObservation}
SERVICE & VALUE OFFER (ONLY PITCH THIS ONE):
${serviceAngles[targetService]}

DIRECT VALUE HOOK RULES (NO TELECALLER OPENERS):
1. DO NOT start with "Main Kropix Studio se baat kar raha hoon" or any telemarketer-style greeting.
2. Line 1 (Hook): Start directly with genuine recognition of their business/reputation (e.g. "Hi ${lead.name} team! Aapka setup aur Google pe ${lead.rating || ''}★ reviews notice kiye—customer feedback sach mein kaafi solid hai.").
3. Line 2 (Helpful Observation): Mention the gentle observation without being negative or shaming.
4. Line 3 (Value Offer): Concrete concept or mockup crafted for them.
5. Line 4 (Soft CTA): Low-friction question (e.g. "Kya main iska ek quick 30-sec preview share karun aapke sath?" or "Open to seeing a quick concept?").
6. STRICT AGENCY RULE: NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP". Always refer to it simply as a "concept preview", "mockup preview", "sample concept", or "quick demo".
7. Tone: Polite, respectful Indian Hinglish with "Aap".
8. Length: Exactly 4 to 5 short lines for WhatsApp (Feels 100% human, zero AI clichés).

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

function generateKropixDirectValueFallback(
  lead: LeadForPitch,
  service: OfferedService,
  gap: ReturnType<typeof performGapAnalysis>,
  format: 'whatsapp' | 'email',
  senderName: string
): string {
  const loc = lead.address ? lead.address.split(',')[0].trim() : 'aapke area';

  if (format === 'whatsapp') {
    if (service === 'whatsapp_ai_agent' || service === 'ai_automation') {
      return `Hi ${lead.name} team! ${loc} mein aapka setup aur reviews notice kiye—kaafi solid feedback hai.\n\nAajkal bohot se customers WhatsApp pe instant inquiries bhejte hain, lekin busy hours me response late hone se leads miss ho jaati hain.\n\nHumne aapke business ke liye ek 24/7 AI WhatsApp Agent ka quick concept banaya hai jo inquiries answer karke direct appointments book karta hai—kya main ek 30-sec live demo share karun dekhne ke liye?`;
    }

    if (service === 'website_design') {
      if (lead.has_website === false || !lead.website) {
        return `Hi ${lead.name} team! ${loc} mein aapka setup aur Google pe ${lead.rating ? `${lead.rating}★` : 'positive'} reviews notice kiye—customer trust sach mein kaafi badiya hai.\n\nBas ek observation thi ki Google pe direct booking website link add nahi hai jisse kayi naye clients miss ho sakte hain.\n\nHumne aapke business ke liye ek clean 1-page modern booking website ka mockup design kiya hai—kya main ek quick preview share karun dekhne ke liye?`;
      } else {
        return `Hi ${lead.name} team! ${loc} mein aapka work aur Google rating kaafi impressive laga!\n\nAapki website check ki aur 2 chhote mobile tweaks notice kiye jisse direct inquiries 15-20% boost ho sakti hain.\n\nMaine ek short 60-second video breakdown ready kiya hai—kya main share karun aapke sath?`;
      }
    }

    if (service === 'content_creation_reels') {
      return `Hi ${lead.name} team! Aapka setup aur customer reviews dekh kar kaafi achha laga.\n\nAajkal local customers 30-sec reels aur videos dekh kar sabse zyada connect karte hain.\n\nHumne aapke brand ke liye 2 high-impact short video ideas script kiye hain—kya main sample clips share karun?`;
    }

    if (service === 'gmb_local_seo') {
      return `Hi ${lead.name} team! ${loc} mein aapka reputation kaafi solid hai!\n\nGoogle Business profile mein thodi si optimization se aap apne area ke search results mein top spots rank kar sakte hain.\n\nMaine ek 2-page local ranking audit breakdown ready kiya hai—kya main share karun aapke sath?`;
    }

    return `Hi ${lead.name} team! Aapke positive customer reviews dekh kar reach out kar raha hoon.\n\nAapke business ke liye ek customized growth concept draft kiya hai—kya aap open hain ek quick preview dekhne ke liye?`;
  } else {
    // Email format
    return `Subject: Quick idea for ${lead.name}\n\nHello Team ${lead.name},\n\nCame across ${lead.name} in ${loc}—love the solid reputation and reviews you've built!\n\n${gap.gentleObservation}\n\nWe put together a clean, modern concept tailored for your business to help boost direct customer inquiries.\n\nWould you be open to taking a quick look at a preview? Please let me know.\n\nBest regards,\nTeam Kropix Studio`;
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
 * High-Conversion Few-Shot In-Context Training for Real Client Replies (Zero "Free" Phrasing)
 */
function getKropixTrainingKnowledge(): string {
  return `KROPIX STUDIO - INBOUND CLIENT CONVERSATION TRAINING RULES & EXAMPLES:

CRITICAL POLICY: NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP". Refer to it simply as a "concept preview", "mockup preview", "sample concept", or "quick demo".

CORE OBJECTION HANDLING & SCENARIOS:

Scenario 1: Client asks about PRICING ("Kitna charge karte ho?" / "Pricing kya hai?")
Rule: Do NOT throw a random price. Explain pricing is customized to exact business scope, and offer the concept preview first so they see value upfront.
Trained Response Style:
"Pricing aapke exact requirement aur scope pe depend karti hai. Hum pehle ek custom mockup banakar share karte hain taaki aap design aur quality dekh sakein. Kya main mockup preview send karun?"

Scenario 2: Client asks for SAMPLES / PORTFOLIO ("Sample dikhao" / "Portfolio link?")
Rule: Direct, warm, and shares a sample or offer for their specific niche.
Trained Response Style:
"Zaroor! Ye hamare recent web aur branding projects ka portfolio hai: [Link]. Maine aapke business ke niche se related 2 sample concepts bhi ready kiye hain. Kya main direct WhatsApp pe share karun?"

Scenario 3: Client wants to SCHEDULE A CALL ("Call pe baat karte hain" / "When can we talk?")
Rule: Offer 2 clear, low-friction time slots (e.g. today 4 PM or tomorrow morning).
Trained Response Style:
"Bilkul! 5-10 minute ka quick call perfect rahega. Kya aaj 4:30 PM ya kal subah 11:30 AM aapke liye convenient rahega?"

Scenario 4: Client is BUSY / SHORT ("Details bhejo" / "What is it?")
Rule: Ultra-concise (<25 words), zero fluff, give the direct concept link.
Trained Response Style:
"Sure! Ye aapke business ke liye 1-page modern booking website ka quick preview link hai: [Demo Link]. Jab bhi free hon, check karke batayein."

Scenario 5: Client is HESITANT ("Abhi zaroorat nahi hai / Later")
Rule: Polite, no hard feelings, leave the door open with a soft 1-pager.
Trained Response Style:
"Bilkul samajh sakta hoon! Koi jaldi nahi hai. Main WhatsApp pe ek short 1-page concept chhod deta hoon, future mein jab bhi requirement ho aap check kar sakte hain."

Scenario 6: Client is READY / ENTHUSIASTIC ("Haan share karo!" / "Sure send it")
Rule: High energy, instant value delivery.
Trained Response Style:
"Awesome! Ye raha aapka custom 1-page booking concept preview: [Demo Link]. Dekh kar batayein kaisa laga!"
`;
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
ORIGINAL OUTREACH PITCH SENT: "${originalPitch || 'N/A'}"
CLIENT'S INCOMING MESSAGE: "${incomingMessage}"

DETECTED CLIENT SENTIMENT: ${sentiment.toneLabel}
TONE MATCHING GUIDELINES: ${sentiment.recommendedStyle}

${getKropixTrainingKnowledge()}

${getGuardrailRulesDescription()}

CRITICAL RULES FOR RESPONSE:
1. Always write in natural, conversational Indian Hinglish using respectful "Aap" (never "tum").
2. STRICT AGENCY RULE: NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP". Refer to it simply as "custom mockup", "concept preview", "sample", or "quick demo".
3. Match the exact training scenario from the Kropix Studio Knowledge Base above.
4. Length: Strictly Under 45 words (WhatsApp friendly, direct, human).
5. DO NOT make unverified price quotes ($/₹), DO NOT promise delivery dates, and DO NOT make refund claims.
6. Move the client smoothly to the next micro-step (sharing sample mockup preview, or scheduling a quick 5-min chat).

Output ONLY the exact response message text.`;

  let replyText = '';

  if (geminiKey) {
    try {
      await aiRateLimiter.acquire();
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      replyText = cleanPitchText(response.text().trim());
    } catch (err: any) {
      console.error('[Kropix AI Engine] Reply generation error:', err.message);
    }
  }

  if (!replyText) {
    if (sentiment.sentiment === 'enthusiastic') {
      replyText = `Awesome! Maine aapke business ke liye ek quick concept preview ready kiya hai—kya main yahi WhatsApp pe direct link share karun?`;
    } else if (sentiment.sentiment === 'skeptical') {
      replyText = `Pricing aapke exact scope pe depend karti hai. Hum pehle ek custom mockup bana kar share karte hain taaki aap design aur quality dekh sakein. Kya main preview share karun?`;
    } else if (sentiment.sentiment === 'direct_busy') {
      replyText = `Zaroor! Ye hamare work ka ek quick 60-sec preview hai. Kya main direct link share karun?`;
    } else {
      replyText = `Reply karne ke liye shukriya! Main aapke business ke liye 2-min ka tailored sample concept share kar sakta hoon. Kab convenient rahega aapko?`;
    }
  }

  const sanitized = validateAndSanitizePitch(replyText);

  return {
    reply: sanitized.sanitizedText,
    sentiment,
    warnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };
}
