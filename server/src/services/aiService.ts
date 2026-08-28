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
 * Intelligent Gap & Niche Analysis Engine
 */
export function performGapAnalysis(lead: LeadForPitch): {
  primaryGap: string;
  recommendedService: OfferedService;
  gentleObservation: string;
} {
  if (lead.source === 'youtube') {
    return {
      primaryGap: 'Brand collaboration and sponsorship inquiry',
      recommendedService: 'content_creation_reels',
      gentleObservation: 'Direct commercial collaboration inquiry.',
    };
  }

  if (lead.has_website === false || !lead.website) {
    return {
      primaryGap: 'Direct booking & service catalog inquiry',
      recommendedService: 'website_design',
      gentleObservation: 'Inquiring about packages and pricing catalogue.',
    };
  }

  return {
    primaryGap: 'Instant customer inquiry response on WhatsApp',
    recommendedService: 'whatsapp_ai_agent',
    gentleObservation: 'High intent customer inquiry.',
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

  const gapResult = performGapAnalysis(lead);
  const targetService = offeredService !== 'general' ? offeredService : gapResult.recommendedService;

  const leadContext = formatLeadContext(lead);
  const prompt = buildUltraHumanInquiryPrompt(lead, leadContext, targetService, format, customInstructions);

  let rawPitch = '';
  let provider = 'smart-template-engine';
  let isMock = true;

  // 1. Try Gemini
  if (geminiKey) {
    for (const modelName of GEMINI_MODELS) {
      try {
        await aiRateLimiter.acquire();
        console.log(`[AI Engine] Generating Ultra-Human Niche Inquiry with Gemini (${modelName})...`);
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
        console.error(`[AI Engine] Gemini (${modelName}) error:`, err.message);
      }
    }
  }

  // 2. Try Claude
  if (!rawPitch && claudeKey) {
    try {
      await aiRateLimiter.acquire();
      console.log(`[AI Engine] Generating Ultra-Human Niche Inquiry with Claude...`);
      const anthropic = new Anthropic({ apiKey: claudeKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = (response.content[0] as any)?.text?.trim() || '';
      if (text) {
        rawPitch = cleanPitchText(text);
        provider = 'claude-3-haiku';
        isMock = false;
      }
    } catch (err: any) {
      console.error('[AI Engine] Claude error:', err.message);
    }
  }

  // 3. Ultra-Human Dynamic Niche-Specific Fallback Engine (Multi-variant randomized pool)
  if (!rawPitch) {
    rawPitch = generateUltraHumanNicheFallback(lead, targetService, format);
    provider = 'human-inquiry-engine';
    isMock = true;
  }

  // 4. Run Sanitizer
  const guardrailResult = validateAndSanitizePitch(rawPitch);

  return {
    pitch: guardrailResult.sanitizedText,
    provider,
    isMock,
    warnings: guardrailResult.warnings.length > 0 ? guardrailResult.warnings : undefined,
  };
}

function formatLeadContext(lead: LeadForPitch): string {
  const parts: string[] = [`Business/Creator Name: ${lead.name}`, `Niche/Category: ${lead.category || 'Business'}`];
  if (lead.address) parts.push(`Location/City: ${lead.address.split(',')[0]}`);
  if (lead.source === 'youtube') {
    if (lead.subscriber_count) parts.push(`Subscribers: ${lead.subscriber_count.toLocaleString()}`);
  }
  return parts.join('\n');
}

/**
 * Ultra-Human Prompt Generator:
 * Generates natural, high-converting customer inquiry questions that businesses reply to instantly!
 */
function buildUltraHumanInquiryPrompt(
  lead: LeadForPitch,
  leadContext: string,
  targetService: OfferedService,
  format: 'whatsapp' | 'email',
  customInstructions?: string
): string {
  const loc = lead.address ? lead.address.split(',')[0].trim() : 'aapke city';

  return `You are a real, friendly human writing a short, conversational WhatsApp message to an Indian business owner or content creator.

BUSINESS DETAILS:
${leadContext}

GOAL:
Start a genuine, natural conversation that guarantees a fast reply from the business owner by asking a relevant, niche-specific inquiry question (like a genuine prospective customer or client).

STRICT HUMAN COPYWRITING RULES (DO NOT SOUND LIKE AI OR TELEMARKETER):
1. ABSOLUTELY DO NOT MENTION RATINGS, STARS, OR REVIEWS (e.g. NEVER say "4.8 rating", "5 stars", "Google reviews dekhe"). Real humans NEVER mention stars.
2. ABSOLUTELY DO NOT start with "Main X company se bol raha hoon" or "I hope this finds you well" or any robotic opener.
3. ASK A NICHE-RELEVANT NATURAL QUESTION:
   - If Travel agency: Ask about customized tour packages (e.g. Goa/Manali or upcoming holiday package pricing & itinerary on WhatsApp).
   - If Dental/Doctor/Clinic: Ask about consultation timings, fees, or appointment booking process.
   - If Real Estate/Builder: Ask about brochure, ongoing projects, or 2BHK/3BHK starting price range in ${loc}.
   - If Restaurant/Cafe/Bakery: Ask about table booking, party celebration packages, or menu on WhatsApp.
   - If Gym/Fitness: Ask about monthly/quarterly membership charges, timings, or personal trainer availability.
   - If Salon/Spa: Ask about hair spa/facial/bridal packages price list.
   - If Interior/Architect: Ask about flat interior packages, estimate process, and portfolio on WhatsApp.
   - If Event/Wedding: Ask about dates availability, pricing packages, and portfolio on WhatsApp.
   - If CA/Legal: Ask about GST/Tax consultation charges and appointment slots.
   - If Agency/IT/Website: Ask about basic quote, portfolio, and timeline for a project.
   - If YouTube Creator: Ask about brand collaboration, sponsorship details, or collaboration process.
   - If any other business: Ask about their service packages, catalogue, or current booking process on WhatsApp.
4. TONE: 100% natural, polite Indian Hinglish with "Aap".
5. LENGTH: Super short (2 to 3 lines max, under 40 words). Must look like a real person typed it on their phone!
6. FORMAT: Clean WhatsApp message (no subject line).

${customInstructions ? `Special guidance: ${customInstructions}` : ''}

Output ONLY the raw message text.`;
}

function cleanPitchText(text: string): string {
  return text.replace(/^["']|["']$/g, '').trim();
}

/**
 * Ultra-Human Dynamic Niche Fallback Engine
 * Extensive library with 5+ realistic, natural inquiry questions per Indian industry niche (NO ratings, 100% human).
 */
function generateUltraHumanNicheFallback(
  lead: LeadForPitch,
  service: OfferedService,
  format: 'whatsapp' | 'email'
): string {
  const cat = (lead.category || '').toLowerCase();
  const name = lead.name;
  const loc = lead.address ? lead.address.split(',')[0].trim() : 'aapke yahan';
  const variant = Math.floor(Math.random() * 5);

  // 1. TRAVEL & TOURS / HOLIDAY PACKAGES
  if (/travel|tour|holiday|trip|flight|visa|resort|vacation|trek/i.test(cat)) {
    const options = [
      `Hi ${name} team! Next month customized holiday package ke baare mein poochna tha—Manali / Goa ke 4-day tour packages aur itinerary ki details WhatsApp pe mil sakti hain kya?`,
      `Hello! Family holiday trip plan kar rahe the—kya aapke upcoming customized domestic / international tour packages aur pricing WhatsApp pe share kar sakte hain?`,
      `Hi ${name}! Customized holiday package booking ka kya process rehta hai aapke yahan? Details aur starting pricing share kar dijiye please.`,
      `Hello team! Goa ya Himachal ke customized 3-4 days tour package ka rate card WhatsApp pe bhej sakte hain kya?`,
      `Hi! Weekend getaway trip ke liye best options aur package itinerary check karni thi—details WhatsApp pe share kar sakte hain?`,
    ];
    return options[variant % options.length];
  }

  // 2. DENTAL & CLINIC / DOCTORS / HEALTHCARE
  if (/dental|dentist|clinic|doctor|hospital|ortho|skin|physio|eye|derma/i.test(cat)) {
    const options = [
      `Hello doctor / ${name} team! Consultation aur checkup ke liye timings kya rehti hain? Pre-booking zaroori hai ya direct walk-in kar sakte hain?`,
      `Hi team! Consultation fees aur appointments ke available slots check karne the—WhatsApp pe process share kar sakte hain?`,
      `Hello! Checkup aur consultation ke liye weekend slots available hain kya? Details mil sakti hain please?`,
      `Hi doctor! Routine consultation aur treatment charges ki information check karni thi—WhatsApp pe process guide kar dijiye.`,
      `Hello ${name} team! New patient appointment book karne ka kya process rehta hai aapke clinic me?`,
    ];
    return options[variant % options.length];
  }

  // 3. RESTAURANT / CAFE / BAKERY / FOOD
  if (/restaurant|cafe|bakery|food|hotel|bar|pizza|dining|lounge|cater|sweet/i.test(cat)) {
    const options = [
      `Hi ${name} team! Weekend pe family dinner / party booking ke liye table reservation available hai kya? Menu aur timings share kar sakte hain?`,
      `Hello! Small gathering / birthday party celebration ke liye packages aur menu options WhatsApp pe mil sakte hain kya?`,
      `Hi! Table reservation aur current food menu details check karni thi—kya WhatsApp pe share kar sakte hain?`,
      `Hello team! Weekend dining ke liye pre-booking slots aur best-seller menu recommendations mil sakte hain kya?`,
      `Hi ${name}! Group booking aur catering packages ke baare mein poochna tha—pricing details WhatsApp pe bhej dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 4. REAL ESTATE / BUILDERS / PROPERTY
  if (/real estate|builder|property|realtor|developer|housing|flat|apartment|plot/i.test(cat)) {
    const options = [
      `Hello ${name} team! ${loc} mein ongoing residential / commercial projects ke brochure aur starting price range WhatsApp pe share kar sakte hain kya?`,
      `Hi! Ready to move 2BHK/3BHK flats / plots ki available inventory ki details check karni thi—brochure aur price list bhej sakte hain?`,
      `Hello! Property investment options aur latest pricing sheets WhatsApp pe mil sakti hain kya?`,
      `Hi ${name} team! ${loc} ke aas-paas new launched projects ki floor plan aur payment plan details WhatsApp pe share kar dijiye.`,
      `Hello! Commercial / residential spaces ki current availability aur site visit schedule ka kya process rehta hai?`,
    ];
    return options[variant % options.length];
  }

  // 5. GYM / FITNESS / YOGA / SPORTS
  if (/gym|fitness|crossfit|yoga|trainer|workout|sports|zumba|dance|martial/i.test(cat)) {
    const options = [
      `Hi ${name} team! Monthly aur quarterly membership ke charges aur timings kya hain? Personal trainer options available hain kya?`,
      `Hello! Gym admission fees aur morning/evening batch timings ki details WhatsApp pe mil sakti hain?`,
      `Hi! 3-month membership plans aur trial session ka kya process rehta hai aapke yahan?`,
      `Hello team! Personal training packages aur gym workout timings ki list WhatsApp pe share kar sakte hain?`,
      `Hi ${name}! Membership fee structure aur weekend trial slot ke baare mein details bhej dijiye please.`,
    ];
    return options[variant % options.length];
  }

  // 6. SALON / SPA / BEAUTY / MAKEUP
  if (/salon|spa|beauty|parlour|makeup|hair|barber|nail|skincare/i.test(cat)) {
    const options = [
      `Hi ${name} team! Hair treatments aur facial packages ki price list WhatsApp pe mil sakti hai kya? Weekend appointment book karni thi.`,
      `Hello! Bridal makeup aur beauty service packages ki details aur charges share kar sakte hain please?`,
      `Hi! Available service menu aur weekend slots ke baare mein poochna tha—details share kar dijiye.`,
      `Hello team! Hair spa aur beauty grooming packages ki rate list WhatsApp pe share kar sakte hain kya?`,
      `Hi ${name}! Appointment availability aur service price card WhatsApp pe bhej dijiye please.`,
    ];
    return options[variant % options.length];
  }

  // 7. INTERIOR DESIGN / ARCHITECT / HOME DECOR
  if (/interior|architect|decor|furniture|renovation|designer|modular|kitchen/i.test(cat)) {
    const options = [
      `Hi ${name} team! Flat interior design ke basic packages aur portfolio check karna tha—kya details WhatsApp pe share kar sakte hain?`,
      `Hello! New home interior work ke liye consultation ka kya process rehta hai? Initial estimate aur portfolio mil sakta hai?`,
      `Hi! Modular kitchen aur full interior renovation packages ki basic details dekhni thi—process kya hai aapka?`,
      `Hello ${name} team! 2BHK/3BHK interior design estimate aur recent project pictures WhatsApp pe share kar sakte hain?`,
      `Hi! Site visit aur interior consultation schedule karne ke baare mein poochna tha—details share kar dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 8. EVENT PLANNERS / PHOTOGRAPHY / BANQUET
  if (/event|photo|wedding|banquet|dj|stage|catering|hall/i.test(cat)) {
    const options = [
      `Hi ${name} team! Upcoming wedding / family event ke liye dates availability aur photography/event packages ki details WhatsApp pe mil sakti hain kya?`,
      `Hello! Event decoration aur photography packages ka pricing card WhatsApp pe share kar sakte hain please?`,
      `Hi ${name}! Available package options aur portfolio check karna tha—details bhej sakte hain?`,
      `Hello team! Upcoming event booking ke liye slot availability aur rate sheet WhatsApp pe send kar dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 9. COACHING / TUITION / CLASSES / EDUCATION
  if (/coaching|tuition|class|school|academy|institute|ielts|spoken|exam/i.test(cat)) {
    const options = [
      `Hello ${name} team! Upcoming batch admission, schedule aur fee structure ki details WhatsApp pe mil sakti hain kya?`,
      `Hi! Courses ke syllabus aur demo class schedule ke baare mein poochna tha—details share kar sakte hain?`,
      `Hello team! New batch timings aur fee structure WhatsApp pe send kar dijiye please.`,
      `Hi ${name}! Course enrollment aur demo session ka kya process rehta hai aapke yahan?`,
    ];
    return options[variant % options.length];
  }

  // 10. CA / CS / TAX / LEGAL / GST
  if (/ca|tax|gst|legal|advocate|lawyer|consultant|accountant/i.test(cat)) {
    const options = [
      `Hi ${name} team! Business GST filing aur tax consultation ke charges aur appointment process ki details WhatsApp pe mil sakti hain kya?`,
      `Hello! Company registration aur accounting service packages ke baare mein poochna tha—details share kar sakte hain?`,
      `Hi! Consultation slots aur service charges ki details check karni thi—WhatsApp pe share kar dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 11. CAR / BIKE / AUTOMOBILE SERVICES
  if (/car|auto|bike|garage|motor|detailing|repair|tyre|service/i.test(cat)) {
    const options = [
      `Hi ${name} team! Car detailing aur ceramic coating / full service ke packages aur pricing WhatsApp pe mil sakti hai kya?`,
      `Hello! Vehicle service appointment book karne ka kya process rehta hai? Rates aur available slots share kar dijiye.`,
      `Hi! Service packages aur estimate check karna tha—kya WhatsApp pe details share kar sakte hain?`,
    ];
    return options[variant % options.length];
  }

  // 12. DIGITAL AGENCY / WEB / IT / MARKETING
  if (/agency|marketing|seo|software|developer|web|media/i.test(cat)) {
    const options = [
      `Hi ${name} team! Website development aur digital marketing ke basic packages aur portfolio check karna tha—details WhatsApp pe share kar sakte hain?`,
      `Hello! Business website redesign aur SEO ke liye basic quote aur timeline kya rehti hai aapki?`,
      `Hi! Lead generation ads aur social media management ke packages ki details mil sakti hain kya?`,
      `Hello team! Custom web / mobile project ke liye portfolio aur consultation process WhatsApp pe share kar dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 13. YOUTUBE CREATOR
  if (lead.source === 'youtube') {
    const options = [
      `Hi ${name}! Aapke channel pe videos kaafi regular aur engaging lagte hain.\n\nEk quick brand collaboration / sponsorship ke baare mein poochna tha—kya aapse yahan WhatsApp ya email pe discuss kar sakte hain?`,
      `Hello ${name}! Video collaboration aur brand integration ke details check karni thi—commercial rate card WhatsApp ya email pe share kar sakte hain?`,
      `Hi ${name}! Aapke upcoming videos me brand partnership / sponsorship slots available hain kya? Details share kar dijiye.`,
    ];
    return options[variant % options.length];
  }

  // 14. GENERAL / LOCAL BUSINESS FALLBACK (NO RATINGS, 100% NATURAL HUMAN INQUIRY)
  const defaultOptions = [
    `Hi ${name} team! ${loc} mein aapka business dekha—aapke current services / packages aur pricing ki details WhatsApp pe share kar sakte hain kya?`,
    `Hello ${name} team! Ek quick inquiry thi—aapke service packages aur appointment booking ka kya process rehta hai? Details share kar dijiye please.`,
    `Hi! ${loc} mein aapke services check karne the—kya catalogue / brochure WhatsApp pe bhej sakte hain?`,
    `Hello team! Aapke latest packages aur pricing list WhatsApp pe share kar sakte hain kya?`,
    `Hi ${name}! Aapke yahan booking / appointment lene ka kya process rehta hai? Details share kar dijiye please.`,
  ];
  return defaultOptions[variant % defaultOptions.length];
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
 * Generate Smart Reply Matching Sentiment, Guardrails & Human Style
 */
export async function generateSmartReply(
  incomingMessage: string,
  originalPitch?: string,
  leadName?: string,
  senderName: string = 'Kropix Studio'
): Promise<{ reply: string; sentiment: SentimentAnalysis; warnings?: string[] }> {
  const sentiment = analyzeMessageSentiment(incomingMessage);
  const geminiKey = await getSetting('geminiApiKey');

  const prompt = `You are a real, friendly human conversational specialist responding on WhatsApp to an Indian business client's message.

CLIENT NAME: ${leadName || 'Client'}
CLIENT INCOMING MESSAGE: "${incomingMessage}"
${originalPitch ? `ORIGINAL OUTREACH INQUIRY: "${originalPitch}"` : ''}

DETECTED SENTIMENT & GOAL:
Sentiment: ${sentiment.sentiment} (${sentiment.toneLabel})
Recommended Approach: ${sentiment.recommendedStyle}

CRITICAL RULES:
1. NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP".
2. NO ROBOTIC JARGON. Keep replies natural, respectful, and short (2 to 3 sentences).
3. Use polite, conversational Indian Hinglish with "Aap".
4. Focus on taking ONE natural next step.

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
      replyText = `Awesome! Ye raha aapke business ke liye concept details: [Demo Link]. Dekh kar batayein kaisa laga!`;
    } else if (sentiment.sentiment === 'skeptical') {
      replyText = `Pricing aapke exact requirement aur scope pe depend karti hai. Hum pehle ek custom sample banakar share karte hain taaki aap quality dekh sakein. Kya main details send karun?`;
    } else if (sentiment.sentiment === 'direct_busy') {
      replyText = `Sure! Ye quick concept details ka link hai: [Demo Link]. Jab bhi free hon, check karke batayein.`;
    } else {
      replyText = `Zaroor! Maine aapke business ke niche se related sample concept ready kiya hai. Kya main direct WhatsApp pe share karun?`;
    }
  }

  const sanitized = validateAndSanitizePitch(replyText);

  return {
    reply: sanitized.sanitizedText,
    sentiment,
    warnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };
}
