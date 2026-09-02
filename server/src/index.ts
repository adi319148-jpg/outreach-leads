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
import authRoutes from './routes/auth';
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

import { apiAuthGuard } from './middleware/authGuard';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.originalUrl}`);
  next();
});

// Global API Security Guard (Checks active passkey, device lock, & subscription expiry)
app.use('/api', apiAuthGuard);

// API Routes
app.use('/api/auth', authRoutes);
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
const clientDist = process.env.CLIENT_DIST_PATH || path.resolve(__dirname, '../../client/dist');
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

// Export startBackendServer for direct in-process Electron execution
export function startBackendServer(port: number = Number(PORT)): Promise<any> {
  return initDatabase().then(() => {
    return new Promise((resolve, reject) => {
      try {
        const server = app.listen(port, () => {
          console.log(`===========================================`);
          console.log(`🚀 Outreach Engine running on port ${port}`);
          console.log(`🌐 Open in browser: http://localhost:${port}`);
          console.log(`🔗 API Base:        http://localhost:${port}/api`);
          console.log(`===========================================`);

          initializeWhatsApp(false).catch((err) => {
            console.log('[WhatsApp Startup] Auto-connect notice:', err.message || err);
          });
          resolve(server);
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`[Server] Port ${port} is already in use, assuming server is active.`);
            resolve(server);
          } else {
            console.error('[Server Error]', err);
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Auto-start if run directly from terminal `node dist/index.js`
if (require.main === module) {
  startBackendServer();
}
