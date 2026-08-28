import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import placesRoutes from './routes/places';
import youtubeRoutes from './routes/youtube';
import leadsRoutes from './routes/leads';
import aiRoutes from './routes/ai';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import whatsappRoutes from './routes/whatsapp';
import repliesRoutes from './routes/replies';
import emailRoutes from './routes/email';
import { initDatabase } from './db/database';
import { initializeWhatsApp } from './services/whatsappService';

dotenv.config();

// Prevent server exit on puppeteer/wwebjs async errors on Windows
process.on('uncaughtException', (err) => {
  console.error('[Process Warning] Uncaught Exception (handled safely):', err.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Process Warning] Unhandled Rejection (handled safely):', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/places', placesRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/replies', repliesRoutes);
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built React frontend (client/dist) — no separate Vite dev server needed
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html so React Router works
app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize DB, auto-restore WhatsApp session and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 Outreach Engine running on port ${PORT}`);
    console.log(`🌐 Open in browser: http://localhost:${PORT}`);
    console.log(`🔗 API Base:        http://localhost:${PORT}/api`);
    console.log(`===========================================`);

    // Auto-restore saved WhatsApp connection on server start
    initializeWhatsApp(false).catch((err) => {
      console.log('[WhatsApp Startup] Auto-connect notice:', err.message || err);
    });
  });
});
