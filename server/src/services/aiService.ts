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
 * Intelligent International Location & Language Detector
 */
export function isInternationalLead(lead: LeadForPitch): boolean {
  const addr = (lead.address || '').toLowerCase();

  // If explicitly mentions India or known Indian cities/states
  if (
    /\b(india|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|surat|lucknow|kanpur|nagpur|indore|bhopal|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|navi mumbai|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|guwahati|solapur|hubli|dharwad|bareilly|moradabad|mysore|gurgaon|gurugram|noida|aligarh|jalandhar|tiruchirappalli|bhubaneswar|salem|mira-bhayandar|thiruvananthapuram|bhiwandi|saharanpur|gorakhpur|guntur|bikaner|amravati|noida|jammu|dehradun|maharashtra|karnataka|tamil nadu|gujarat|rajasthan|uttar pradesh|punjab|kerala|haryana|telangana|west bengal)\b/i.test(
      addr
    )
  ) {
    return false;
  }

  // Non-Indian country keywords
  if (
    /\b(usa|united states|uk|united kingdom|canada|australia|dubai|uae|emirates|london|new york|california|texas|florida|toronto|sydney|melbourne|germany|france|singapore|new zealand|south africa|ireland|austin|chicago|miami|seattle|manchester|birmingham|vancouver|auckland|berlin|paris|dublin|tokyo)\b/i.test(
      addr
    )
  ) {
    return true;
  }

  // Default: if no address provided or ambiguous, default to Hinglish unless address looks international
  return false;
}

/**
 * Intelligent Gap & Niche Analysis Engine
 */
export function performGapAnalysis(lead: LeadForPitch): {
  primaryGap: string;
  recommendedService: OfferedService;
  gentleObservation: string;
} {
  const isIntl = isInternationalLead(lead);

  if (lead.source === 'youtube') {
    return {
      primaryGap: isIntl
        ? 'Brand collaboration and short-form video repurposing'
        : 'Brand collaboration, sponsorship & short-form video repurposing',
      recommendedService: 'content_creation_reels',
      gentleObservation: isIntl
        ? 'Looking to explore brand partnership and short video clips.'
        : 'Direct commercial collaboration inquiry.',
    };
  }

  if (lead.has_website === false || !lead.website) {
    return {
      primaryGap: isIntl
        ? 'No direct booking link or official website listed on Google'
        : 'Google pe official website link aur details properly add nahi hain',
      recommendedService: 'website_design',
      gentleObservation: isIntl
        ? 'Notice that your official website and online details are not listed on Google.'
        : 'Online search karne par direct booking link aur details easily nahi dikh rahi hain.',
    };
  }

  return {
    primaryGap: isIntl
      ? 'Instant 24/7 automated inquiry response & booking system'
      : 'Instant 24/7 WhatsApp customer inquiry handling & bookings',
    recommendedService: 'whatsapp_ai_agent',
    gentleObservation: isIntl
      ? 'Automated inquiry response improves booking conversions.'
      : 'High intent customer inquiry.',
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

  const isIntl = isInternationalLead(lead);
  const gapResult = performGapAnalysis(lead);
  const targetService = offeredService !== 'general' ? offeredService : gapResult.recommendedService;

  const leadContext = formatLeadContext(lead);
  const prompt = buildInquiryPlusPitchPrompt(lead, leadContext, targetService, format, isIntl, customInstructions);

  let rawPitch = '';
  let provider = 'smart-template-engine';
  let isMock = true;

  // 1. Try Gemini
  if (geminiKey) {
    for (const modelName of GEMINI_MODELS) {
      try {
        await aiRateLimiter.acquire();
        console.log(`[AI Engine] Generating ${isIntl ? 'English (Intl)' : 'Hinglish'} Question + Pitch for [${targetService}] with Gemini (${modelName})...`);
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
      console.log(`[AI Engine] Generating ${isIntl ? 'English (Intl)' : 'Hinglish'} Question + Pitch with Claude...`);
      const anthropic = new Anthropic({ apiKey: claudeKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 220,
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

  // 3. Ultra-Human Dynamic Hybrid Fallback Engine (Question + Pitch Observation)
  if (!rawPitch) {
    rawPitch = isIntl
      ? generateInternationalEnglishFallback(lead, targetService, format)
      : generateInquiryPlusPitchFallback(lead, targetService, format);
    provider = isIntl ? 'intl-english-engine' : 'hybrid-pitch-engine';
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
  parts.push(`Website Status: ${lead.has_website !== false && lead.website ? `Active (${lead.website})` : 'NO WEBSITE (Missing on Google)'}`);
  if (lead.source === 'youtube') {
    if (lead.subscriber_count) parts.push(`Subscribers: ${lead.subscriber_count.toLocaleString()}`);
  }
  return parts.join('\n');
}

/**
 * Ultra-Human Question + Soft Pitch Hybrid Prompt:
 * Supports dynamic language adaptation (Pure English for International leads, Polite Hinglish for Indian leads).
 */
function buildInquiryPlusPitchPrompt(
  lead: LeadForPitch,
  leadContext: string,
  targetService: OfferedService,
  format: 'whatsapp' | 'email',
  isInternational: boolean,
  customInstructions?: string
): string {
  const hasWebsite = lead.has_website !== false && Boolean(lead.website);

  if (isInternational) {
    return `You are a friendly, professional human writing a short, conversational outreach message on WhatsApp/Email to a business owner or creator located in USA, UK, Canada, Australia, or globally.

BUSINESS DETAILS:
${leadContext}

LANGUAGE REQUIREMENT: 100% NATIVE ENGLISH (ZERO HINDI/HINGLISH WORDS).

EXACT 2-PART CONVERSATION FORMULA TO FOLLOW:
- PART 1 (Natural Niche Inquiry): Start directly with a genuine, niche-specific question (e.g. for travel ask about customized package pricing/itinerary, for dental ask about consultation/cleanings, for real estate ask about brochure/pricing, for gym ask about membership rates, for restaurant ask about table reservation/menu).
- PART 2 (Gentle Observation + Soft Value Pitch): In the next paragraph, naturally mention that while searching online, you noticed:
  ${
    !hasWebsite || targetService === 'website_design'
      ? '"By the way, while searching online I noticed your direct booking website link isn\'t listed on Google and package/pricing details aren\'t easily visible. We put together a clean 1-page modern booking preview concept for your business—would you be open to a quick 30-sec preview?"'
      : targetService === 'whatsapp_ai_agent' || targetService === 'ai_automation'
      ? '"By the way, I noticed your direct 24/7 instant booking assistant isn\'t active for peak hour inquiries. We drafted a smart AI booking assistant concept—would you be open to checking out a quick demo preview?"'
      : targetService === 'content_creation_reels'
      ? '"By the way, I noticed your short-form video reels showcase isn\'t active online. We drafted 2 sample viral reel concepts tailored for your brand—would you like to see a quick preview?"'
      : '"By the way, while searching online I noticed your direct booking details aren\'t easily accessible. We put together a clean concept preview—open to taking a quick look?"'
  }

CRITICAL RULES:
1. ABSOLUTELY DO NOT MENTION RATINGS, STARS, OR REVIEWS (e.g. NEVER say "4.8 rating", "5 stars", "Google reviews").
2. ABSOLUTELY DO NOT start with "I am calling from X company" or "I hope this email finds you well" or robotic openers.
3. TONE: 100% natural, polite native English.
4. LENGTH: 3 to 4 short lines total. Feels completely natural and human!
5. FORMAT: Clean text with single blank line between paragraphs (no subject line unless email).

${customInstructions ? `Special guidance: ${customInstructions}` : ''}

Output ONLY the raw message text.`;
  }

  // Indian Hinglish Prompt
  return `You are a real, friendly human writing a short, conversational WhatsApp message to an Indian business owner or content creator.

BUSINESS DETAILS:
${leadContext}

LANGUAGE REQUIREMENT: Polite Indian Hinglish with "Aap".

EXACT 2-PART CONVERSATION FORMULA TO FOLLOW:
- PART 1 (Natural Niche Inquiry): Start directly with a genuine, niche-specific question (e.g., for travel ask about holiday package pricing/itinerary, for dental ask about consultation/timings, for real estate ask about brochure/2BHK prices, for gym ask about membership, for restaurant ask about table reservation/menu).
- PART 2 (Gentle Observation + Soft Pitch): In the next paragraph, naturally mention that while searching on Google, you noticed:
  ${
    !hasWebsite || targetService === 'website_design'
      ? '"Waise Google pe search karte time dekha ki aapka direct official website / booking link add nahi hai aur details online easily nahi dikh rahi hain. Humne aapke business ke liye ek clean 1-page modern booking website ka concept prepare kiya hai—kya main ek 30-sec preview share karun dekhne ke liye?"'
      : targetService === 'whatsapp_ai_agent' || targetService === 'ai_automation'
      ? '"Waise notice kiya ki WhatsApp pe instant 24/7 automated booking assistant active nahi hai jisse peak hours me inquiries miss ho sakti hain. Humne ek smart AI booking bot concept draft kiya hai—kya main ek quick demo preview share karun?"'
      : targetService === 'content_creation_reels'
      ? '"Waise online dekha aapka visual short-form reels showcase active nahi hai. Humne aapke brand ke liye 2 sample reel concepts prepare kiye hain—kya preview share karun?"'
      : '"Waise online search karte time dekha direct booking aur details properly visible nahi hain. Humne ek tailored growth concept ready kiya hai—kya ek short preview share karun?"'
  }

CRITICAL RULES:
1. ABSOLUTELY DO NOT MENTION RATINGS, STARS, OR REVIEWS (e.g. NEVER say "4.8 rating", "5 stars", "Google reviews dekhe"). Real humans NEVER mention stars.
2. ABSOLUTELY DO NOT start with "Main X company se bol raha hoon" or "I hope this finds you well" or any robotic opener.
3. TONE: 100% natural, polite Indian Hinglish with "Aap".
4. LENGTH: 3 to 4 short lines total. Feels completely natural and human!
5. FORMAT: Clean WhatsApp message with single blank line between paragraphs (no subject line).

${customInstructions ? `Special guidance: ${customInstructions}` : ''}

Output ONLY the raw message text.`;
}

function cleanPitchText(text: string): string {
  return text.replace(/^["']|["']$/g, '').trim();
}

/**
 * Native International English Fallback Engine (USA, UK, Canada, Australia, Global)
 */
function generateInternationalEnglishFallback(
  lead: LeadForPitch,
  service: OfferedService,
  format: 'whatsapp' | 'email'
): string {
  const cat = (lead.category || '').toLowerCase();
  const name = lead.name;
  const hasWebsite = lead.has_website !== false && Boolean(lead.website);
  const variant = Math.floor(Math.random() * 3);

  // TRAVEL & TOURISM
  if (/travel|tour|holiday|trip|flight|visa|resort|vacation/i.test(cat)) {
    return `Hi ${name} team! Quick inquiry—do you have availability and package details for customized 4-day vacation getaways for next month? Could you share a quick itinerary?\n\nBy the way, while searching online I noticed your direct booking website link isn't listed on Google and package details aren't easily visible. We put together a clean 1-page modern booking preview concept for your business—would you be open to a quick 30-sec preview?`;
  }

  // DENTAL & HEALTHCARE
  if (/dental|dentist|clinic|doctor|hospital|ortho|skin|physio|eye/i.test(cat)) {
    return `Hello Dr. ${name} / team! Just checking on availability for routine consultations and cleanings—do you accept walk-ins or require advance booking?\n\nBy the way, I noticed your direct appointment booking link isn't active on your Google listing. We designed a clean 1-page instant booking concept for local practices—would you be open to taking a quick look at a preview?`;
  }

  // REAL ESTATE
  if (/real estate|builder|property|realtor|developer|housing|flat|apartment/i.test(cat)) {
    return `Hi ${name} team! Could you share the current brochure and pricing sheets for your upcoming residential listings?\n\nBy the way, I noticed your floor plans and virtual walkthroughs aren't easily accessible online. We drafted a sleek digital property showcase concept—would you like to check out a quick preview?`;
  }

  // RESTAURANTS & CAFES
  if (/restaurant|cafe|bakery|food|hotel|bar|pizza|dining|lounge/i.test(cat)) {
    return `Hi ${name} team! Do you take table reservations or private party bookings for this coming weekend? Could you share your menu details?\n\nBy the way, I noticed your direct online reservation link isn't set up on Google. We put together a clean digital menu & reservation concept—would you like to see a quick preview?`;
  }

  // GYMS & FITNESS
  if (/gym|fitness|crossfit|yoga|trainer|workout|sports/i.test(cat)) {
    return `Hi ${name} team! What are your current monthly membership rates and personal trainer availability?\n\nBy the way, I noticed your trial passes and class schedules aren't easily bookable online. We put together a modern 1-page membership booking preview—open to a quick look?`;
  }

  // SALONS & SPAS
  if (/salon|spa|beauty|parlour|makeup|hair|barber|bridal/i.test(cat)) {
    return `Hi ${name} team! Could you share your service menu and pricing list for hair and skincare treatments?\n\nBy the way, I noticed your direct appointment booking link isn't listed on Google. We designed an aesthetic 1-page booking concept for salons—would you be open to a quick preview?`;
  }

  // INTERIOR DESIGN
  if (/interior|architect|decor|furniture|renovation|designer/i.test(cat)) {
    return `Hi ${name} team! Do you have pricing estimates and digital portfolio photos for residential interior design projects?\n\nBy the way, I noticed your online project portfolio link isn't visible on Google. We put together a sleek digital showcase mockup—would you like to see a quick preview?`;
  }

  // YOUTUBE CREATOR
  if (lead.source === 'youtube') {
    return `Hi ${name}! Really enjoy your consistent video content on YouTube.\n\nReaching out regarding a potential brand collaboration / sponsorship opportunity and short-form video repurposing concept—would you be open to discussing details over email or WhatsApp?`;
  }

  // UNIVERSAL INTERNATIONAL BUSINESS FALLBACK
  return `Hi ${name} team! Reaching out to check on your current service packages and pricing details.\n\nBy the way, while searching online I noticed your direct booking website link isn't listed on Google. We put together a clean 1-page modern preview concept for your business—would you be open to taking a quick look?`;
}

/**
 * Indian Hinglish Hybrid Fallback Engine
 */
function generateInquiryPlusPitchFallback(
  lead: LeadForPitch,
  service: OfferedService,
  format: 'whatsapp' | 'email'
): string {
  const cat = (lead.category || '').toLowerCase();
  const name = lead.name;
  const loc = lead.address ? lead.address.split(',')[0].trim() : 'aapke yahan';
  const hasWebsite = lead.has_website !== false && Boolean(lead.website);
  const variant = Math.floor(Math.random() * 4);

  // 1. TRAVEL & TOURS
  if (/travel|tour|holiday|trip|flight|visa|resort|vacation|trek/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      const options = [
        `Hi ${name} team! Next month customized holiday package ke baare mein poochna tha—Manali / Goa ke 4-day tour packages aur itinerary ki details WhatsApp pe mil sakti hain kya?\n\nWaise Google pe search karte time dekha ki aapka direct official website link add nahi hai aur package details online easily nahi dikh rahi hain. Humne aapke liye ek clean 1-page modern booking website ka mockup prepare kiya hai—kya main ek 30-sec preview share karun dekhne ke liye?`,
        `Hello ${name} team! Family holiday trip plan kar rahe the—kya aapke upcoming tour packages aur pricing WhatsApp pe share kar sakte hain?\n\nWaise notice kiya Google pe direct booking catalogue website link missing hai jisse naye clients miss ho sakte hain. Humne aapke business ke liye ek fast 1-page booking concept ready kiya hai—kya preview dekhna chahenge?`,
      ];
      return options[variant % options.length];
    } else {
      return `Hi ${name} team! Goa aur Himachal ke customized 3-4 days tour package ka rate card WhatsApp pe bhej sakte hain kya?\n\nWaise notice kiya peak hours me WhatsApp inquiries manually handle karne me time lagta hai. Humne ek 24/7 WhatsApp AI booking assistant ka concept prepare kiya hai—kya main ek quick 30-sec demo share karun?`;
    }
  }

  // 2. DENTAL & CLINICS / DOCTORS
  if (/dental|dentist|clinic|doctor|hospital|ortho|skin|physio|eye|medical/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      const options = [
        `Hello doctor / ${name} team! Consultation aur checkup ke liye timings kya rehti hain? Pre-booking zaroori hai ya direct walk-in kar sakte hain?\n\nWaise Google pe check kiya aapka direct appointment booking website link add nahi hai aur details online nahi dikh rahi hain. Humne clinic ke liye ek clean 1-page modern appointment booking page ka mockup draft kiya hai—kya main ek short preview share karun?`,
        `Hi team! Consultation fees aur available appointment slots check karne the—WhatsApp pe process share kar sakte hain?\n\nWaise Google search pe website link missing hone ki wajah se new patients ko timings nahi mil pa rahi hain. Humne ek simple 1-page booking concept prepare kiya hai—kya preview share karun?`,
      ];
      return options[variant % options.length];
    } else {
      return `Hello doctor / ${name} team! Specialist consultation timings aur available slots check karne the—details WhatsApp pe mil sakti hain?\n\nWaise notice kiya WhatsApp pe automatic instant appointment confirmation bot active nahi hai. Humne ek 24/7 AI booking assistant ka concept design kiya hai—kya ek 30-sec demo preview share karun?`;
    }
  }

  // 3. RESTAURANTS, CAFES, BAKERIES
  if (/restaurant|cafe|bakery|food|hotel|bar|pizza|dining|lounge|cater|sweet/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      return `Hi ${name} team! Weekend pe family dinner / party celebration ke liye table reservation available hai kya? Menu aur timings share kar sakte hain?\n\nWaise Google pe search karte waqt dekha aapka digital menu aur direct table booking link add nahi hai. Humne aapke brand ke liye ek modern 1-page digital menu & booking landing page ka concept prepare kiya hai—kya main ek quick preview share karun?`;
    } else {
      return `Hi ${name} team! Weekend dining ke liye pre-booking aur party packages ki details WhatsApp pe bhej sakte hain kya?\n\nWaise notice kiya customer messages handle karne me delay hone se direct bookings miss ho jaati hain. Humne ek 24/7 WhatsApp AI menu & reservation bot ready kiya hai—kya ek short demo share karun?`;
    }
  }

  // 4. REAL ESTATE & BUILDERS
  if (/real estate|builder|property|realtor|developer|housing|flat|apartment|plot/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      return `Hello ${name} team! ${loc} mein ongoing residential projects ke brochure aur starting price range WhatsApp pe share kar sakte hain kya?\n\nWaise Google pe dekha project details aur floor plans online properly visible nahi hain. Humne aapke properties ke liye ek modern digital brochure & lead capture page ka concept ready kiya hai—kya main ek short preview share karun?`;
    } else {
      return `Hello ${name} team! Ongoing residential projects ke brochure aur payment plan details WhatsApp pe share kar dijiye please.\n\nWaise property inquiries ko 5 second me auto-qualify karne ke liye humne ek smart WhatsApp AI bot draft kiya hai—kya ek quick demo share karun?`;
    }
  }

  // 5. GYMS & FITNESS
  if (/gym|fitness|crossfit|yoga|trainer|workout|sports|zumba/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      return `Hi ${name} team! Monthly aur quarterly membership ke charges aur timings kya hain? Personal trainer options available hain kya?\n\nWaise Google pe dekha aapka official website link add nahi hai aur packages online nahi dikh rahe hain. Humne gym ke liye ek clean 1-page trial booking page ka mockup design kiya hai—kya main ek preview share karun?`;
    } else {
      return `Hi ${name} team! Membership charges aur workout batch timings ki list WhatsApp pe share kar sakte hain?\n\nWaise trial sessions aur inquiries automate karne ke liye ek smart 24/7 WhatsApp bot concept layout kiya hai—kya main ek 30-sec demo preview share karun?`;
    }
  }

  // 6. SALONS, SPAS & BEAUTY
  if (/salon|spa|beauty|parlour|makeup|hair|barber|bridal/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      return `Hi ${name} team! Hair treatments aur facial packages ki price list WhatsApp pe mil sakti hai kya? Weekend appointment book karni thi.\n\nWaise Google pe search karte time dekha aapka service price card aur booking link add nahi hai. Humne salon ke liye ek aesthetic 1-page booking concept prepare kiya hai—kya main ek preview share karun?`;
    } else {
      return `Hi ${name} team! Available service menu aur weekend slots ke baare mein poochna tha—details share kar dijiye.\n\nWaise WhatsApp pe instant slot booking aur price card auto-reply ke liye humne ek smart AI assistant concept ready kiya hai—kya ek short demo share karun?`;
    }
  }

  // 7. INTERIOR DESIGN & ARCHITECTS
  if (/interior|architect|decor|furniture|renovation|designer/i.test(cat)) {
    if (!hasWebsite || service === 'website_design') {
      return `Hi ${name} team! Flat interior design ke basic packages aur portfolio check karna tha—kya details WhatsApp pe share kar sakte hain?\n\nWaise online dekha aapka official website portfolio link missing hai jisse clients designs nahi dekh pa rahe hain. Humne aapke brand ke liye ek modern digital portfolio concept ready kiya hai—kya share karun dekhne ke liye?`;
    } else {
      return `Hi ${name} team! 2BHK/3BHK interior design estimate aur recent project pictures WhatsApp pe share kar sakte hain?\n\nWaise customer inquiries ko 5 second me handle karke portfolio deliver karne ke liye humne ek smart WhatsApp bot concept draft kiya hai—kya preview dekhna chahenge?`;
    }
  }

  // 8. COACHING & EDUCATION
  if (/coaching|tuition|class|school|academy|institute|ielts|spoken/i.test(cat)) {
    return `Hello ${name} team! Upcoming batch admission, schedule aur fee structure ki details WhatsApp pe mil sakti hain kya?\n\nWaise Google pe dekha course syllabus aur demo booking details online properly visible nahi hain. Humne institute ke liye ek clean 1-page admission landing page ka concept prepare kiya hai—kya main ek short preview share karun?`;
  }

  // 9. YOUTUBE CREATOR
  if (lead.source === 'youtube') {
    return `Hi ${name}! Aapke YouTube channel pe videos kaafi regular aur engaging lagte hain.\n\nQuick brand collaboration / sponsorship aur short-form video repurposing ke baare mein poochna tha—kya aapse yahan WhatsApp ya email pe discuss kar sakte hain? Ek short concept proposal ready kiya hai.`;
  }

  // 10. GENERAL / UNIVERSAL BUSINESS HYBRID
  if (!hasWebsite || service === 'website_design') {
    return `Hi ${name} team! ${loc} mein aapka business dekha—aapke current services/packages aur pricing ki details WhatsApp pe share kar sakte hain kya?\n\nWaise Google pe search karte time dekha aapka official website link add nahi hai aur details online easily nahi mil rahi hain. Humne aapke business ke liye ek clean 1-page booking concept prepare kiya hai—kya main ek 30-sec preview share karun dekhne ke liye?`;
  }

  return `Hi ${name} team! Aapke latest packages aur service booking process ki details WhatsApp pe share kar sakte hain kya?\n\nWaise customer inquiries ko 24/7 instant answer karne aur direct bookings lene ke liye humne ek smart WhatsApp AI bot concept layout kiya hai—kya main ek short 30-sec demo preview share karun?`;
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
      recommendedStyle: 'Match their energy with warm, high-energy language and clear scheduling steps.',
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
      recommendedStyle: 'Be ultra-concise (<35 words), give the direct next step or preview immediately.',
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

  const prompt = `You are a real, friendly human conversational specialist responding to a business client's message.

CLIENT NAME: ${leadName || 'Client'}
CLIENT INCOMING MESSAGE: "${incomingMessage}"
${originalPitch ? `ORIGINAL OUTREACH INQUIRY: "${originalPitch}"` : ''}

DETECTED SENTIMENT & GOAL:
Sentiment: ${sentiment.sentiment} (${sentiment.toneLabel})
Recommended Approach: ${sentiment.recommendedStyle}

CRITICAL RULES:
1. NEVER USE THE WORD "FREE" OR "FREE SAMPLE/MOCKUP".
2. NO ROBOTIC JARGON. Keep replies natural, respectful, and short (2 to 3 sentences).
3. If incoming message is in English, reply in English. If in Hindi/Hinglish, reply in polite Hinglish.
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
      replyText = `Awesome! Here is the concept preview for your business: [Demo Link]. Let me know what you think!`;
    } else if (sentiment.sentiment === 'skeptical') {
      replyText = `Pricing depends on your exact scope and requirements. We prepare a tailored preview upfront so you can review quality first. Would you like me to send the preview?`;
    } else if (sentiment.sentiment === 'direct_busy') {
      replyText = `Sure! Here is the quick concept link: [Demo Link]. Feel free to review whenever you're free.`;
    } else {
      replyText = `Certainly! I've prepared a tailored preview concept for your business. Would you like me to share it directly?`;
    }
  }

  const sanitized = validateAndSanitizePitch(replyText);

  return {
    reply: sanitized.sanitizedText,
    sentiment,
    warnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };
}
