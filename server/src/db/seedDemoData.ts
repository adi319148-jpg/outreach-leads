import { run, all } from './database';

export async function seedRealisticDemoData() {
  console.log('[Seeder] Seeding realistic sample leads across all sections...');

  // Clear existing
  await run('DELETE FROM leads');
  await run('DELETE FROM inbound_replies');

  // 1. Business Lead (No Website - High Web Dev Opportunity) in Business CRM & Outreach
  const business1 = await run(
    `INSERT INTO leads (
      source, external_id, name, category, contact_email, phone, website,
      has_website, instagram_handle, offered_service, in_campaign_queue,
      address, rating, user_ratings_total, description, status, pitch, pitch_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'google_places',
      'demo_place_1',
      'Apex Dental & Implant Studio',
      'Dental Clinic',
      'contact@apexdentalstudio.com',
      '+1 (555) 234-8901',
      null, // NO WEBSITE!
      0,
      '@apexdental.austin',
      'website_design',
      1, // in Bulk Campaign
      '142 Metro Blvd, Suite 300, Austin, TX',
      4.9,
      184,
      'Top rated cosmetic dental clinic with stellar reviews but no active direct booking website.',
      'replied',
      "Hi Apex Dental team, congrats on those 4.9★ reviews—your patients clearly love you! Noticed you don't have an active booking site right now. I put together a clean 1-page modern booking mockup for you—mind if I send over a quick preview?",
      'ready',
      'Doctor called back regarding modern booking engine mockup. Follow up on Tuesday.',
    ]
  );

  // 2. Business Lead (Has Website - Video Editing / Reels Offer) in Business CRM & Campaign
  const business2 = await run(
    `INSERT INTO leads (
      source, external_id, name, category, contact_email, phone, website,
      has_website, instagram_handle, offered_service, in_campaign_queue,
      address, rating, user_ratings_total, description, status, pitch, pitch_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'google_places',
      'demo_place_2',
      'Heritage Italian Bistro & Wine Bar',
      'Italian Restaurant',
      'info@heritagebistro.com',
      '+1 (555) 456-1122',
      'https://www.heritageitalianbistro.com',
      1,
      '@heritage.bistro.official',
      'video_editing',
      1, // in Bulk Campaign
      '88 Grand Avenue, Austin, TX',
      4.8,
      310,
      'Award winning local culinary bistro. Great candidate for high-retention food reels & chef promos.',
      'contacted',
      "Hi Heritage Bistro team, your 4.8★ reputation in Austin is amazing! Local restaurants are seeing huge weekend rushes with 30-sec food Reels. We edit high-impact short videos—mind if I send over 2 sample clips?",
      'ready',
      'Outreach email sent on Monday.',
    ]
  );

  // 3. YouTube Creator Lead (Sponsorship / Shorts Repurposing) in YouTube CRM & Outreach
  const yt1 = await run(
    `INSERT INTO leads (
      source, external_id, name, category, contact_email, phone, website,
      has_website, instagram_handle, offered_service, in_campaign_queue,
      subscriber_count, video_count, view_count, channel_handle, description,
      status, pitch, pitch_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'youtube',
      'demo_yt_1',
      'Alex Rivera | AI & Automation Growth',
      'AI & Productivity',
      'alex@riveramedia.co',
      '+1 (555) 789-3344',
      'https://youtube.com/@alexriveratech',
      1,
      '@alexrivera.tech',
      'video_editing',
      1, // in Bulk Campaign
      84500,
      142,
      4210000,
      '@alexriveratech',
      'Weekly practical tutorials on AI tools, workflow automation, and SaaS scaling.',
      'replied',
      "Hey Alex, love the value in your AI workflow uploads! We help creators turn full videos into high-retention Shorts that generate 2-3x more subscribers. Happy to edit your next 2 clips completely free as a test—would you be open to that?",
      'ready',
      'Alex wants to test 2 Shorts for his next upload.',
    ]
  );

  // 4. Inbound Replies (Live WhatsApp & Email responses)
  // Reply 1: From Apex Dental (WhatsApp)
  await run(
    `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, is_read, received_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      business1.id,
      'whatsapp',
      '15552348901',
      'Apex Dental & Implant Studio',
      'Hey! Yes, we actually lost our previous web developer last month. Would love to see the booking mockup you mentioned!',
      0, // Unread
    ]
  );

  // Reply 2: From Alex Rivera (Email)
  await run(
    `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, is_read, received_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-25 minutes'))`,
    [
      yt1.id,
      'email',
      'alex@riveramedia.co',
      'Alex Rivera | AI Growth',
      'Sounds great. Can you share a link to your portfolio or sample shorts you have edited for other tech channels?',
      1, // Read
    ]
  );

  console.log('[Seeder] Successfully seeded demo data across Business CRM, YouTube CRM, Bulk Campaign, and Inbound Replies Inbox!');
}
