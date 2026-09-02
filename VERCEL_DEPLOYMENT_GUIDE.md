# 🚀 Deploying Outreach AI to Vercel

Follow these simple steps to deploy your Outreach AI platform on Vercel:

---

### 1. Sign In to Vercel
- Go to [vercel.com](https://vercel.com) and log in with your GitHub account (`adi319148-jpg`).

### 2. Import Your GitHub Repository
1. Click **"Add New..."** ➔ **"Project"**.
2. Find your repository: **`adi319148-jpg/outreach-leads`**.
3. Click **"Import"**.

### 3. Project Configuration (Auto-Configured)
Vercel will automatically read `vercel.json`:
- **Framework Preset**: Vite
- **Root Directory**: `./` (or leave default)
- **Build Command**: `cd client && npm install && npm run build`
- **Output Directory**: `client/dist`

### 4. Click Deploy!
- Click the blue **"Deploy"** button.
- In ~60 seconds, your site will be live with a free SSL domain (e.g. `outreach-leads.vercel.app`)!

---

> [!TIP]
> **Important Note regarding WhatsApp Baileys Automation**:
> Vercel is a **Serverless CDN** (built for web frontends & landing pages). It sleeps background functions after 10-15 seconds.
> Since WhatsApp Baileys requires a permanent continuous WebSocket connection running 24/7, you can run the Express backend on **Render.com** (using the included `render.yaml`) or a VPS, or locally on port 3001!
