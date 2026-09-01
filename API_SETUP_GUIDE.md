# ?? API Setup & Configuration Guide (Buyer Quick Start)

Welcome! This tool comes with built-in Simulation Mode out of the box so you can start testing immediately.
To connect live data and AI pitch generation, simply configure your own free API keys.

---

## ? Option 1: Configure Directly from Web App (Recommended — 1 Minute)

1. Open the Web App (Run `start.bat` or `start-online.bat`).
2. Click on the **?? Settings** tab in the sidebar.
3. Paste your API keys into the respective fields.
4. Click **Test Key** to verify connection instantly.
5. Click **Save Settings** at the bottom.

---

## ??? Option 2: Configure via `.env` File

Open `server/.env` in Notepad and paste your API keys:
```env
PORT=3001
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## ?? How to Get Free API Keys (Step-by-Step)

### 1. ?? Google Gemini AI API Key (100% Free)
- **Used for**: AI Pitch generation, personalized outreach messages, and smart replies.
- **Cost**: 100% Free (No credit card required).
- **Steps**:
  1. Visit: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  2. Sign in with your Google account.
  3. Click **"Create API key"**.
  4. Copy the key and paste it into the **Gemini API Key** field in Settings.

---

### 2. ?? Google Places API Key ($200 Monthly Free Credit)
- **Used for**: Live Google Maps business searches, addresses, phone numbers, and ratings.
- **Cost**: Google Cloud gives **\$200 free credit every month** (~10,000+ searches free).
- **Steps**:
  1. Visit: [https://console.cloud.google.com/](https://console.cloud.google.com/)
  2. Create a Project (e.g., `My Lead Generator`).
  3. Go to **APIs & Services** ? **Library**.
  4. Search and click **"Places API (New)"** ? Click **Enable**.
  5. Go to **APIs & Services** ? **Credentials** ? Click **"Create Credentials"** ? **"API Key"**.
  6. Copy and paste into **Google Places API Key** in Settings.

---

### 3. ?? YouTube Data API v3 Key (Free Quota)
- **Used for**: Creator channel search, subscribers, video counts, and view metrics.
- **Cost**: Free (10,000 units/day free quota from Google).
- **Steps**:
  1. In the same Google Cloud Console project ([https://console.cloud.google.com/](https://console.cloud.google.com/)).
  2. Go to **APIs & Services** ? **Library**.
  3. Search and click **"YouTube Data API v3"** ? Click **Enable**.
  4. Use the same Google API key from Step 2 (or create a new API Key in Credentials).
  5. Paste into **YouTube Data API Key** in Settings.

---

### 4. ?? Resend Email API Key (3,000 Free Emails/Month)
- **Used for**: Direct background email sending with 0 browser tabs needed.
- **Cost**: Free tier includes 3,000 emails/month.
- **Steps**:
  1. Sign up for free at: [https://resend.com](https://resend.com)
  2. Go to **API Keys** ? Click **"Create API Key"**.
  3. Copy key (starts with `re_...`) and paste into **Resend API Key** in Settings.
  4. *(Optional)*: Add your custom domain at `resend.com/domains` to send cold emails to any prospect domain.

---

### 5. ?? WhatsApp Automation Pairing
- **Used for**: 1-Click WhatsApp background message dispatching.
- **Cost**: 100% Free.
- **Steps**:
  1. Go to **Settings** ? **WhatsApp Web Automation**.
  2. Click **Scan QR Code (Pair)**.
  3. Open WhatsApp on your phone ? **Settings** / **Linked Devices** ? Scan the QR Code.
  4. Your phone is connected!

---

## ? Need Help?
- You can test any feature with **Simulation Mode** even without adding keys.
- Every API input in the Settings tab has a **"Get Free Key"** direct link and a **"Test Key"** verification button.
