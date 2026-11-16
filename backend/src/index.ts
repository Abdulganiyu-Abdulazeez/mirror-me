import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import linkRoutes from './routes/links.routes.js';
import publicRoutes from './routes/public.routes.js';
import messageRoutes from './routes/messages.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MirrorMe Backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MirrorMe Backend API',
    supabaseConnected: Boolean(process.env.SUPABASE_URL)
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/links', linkRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/reviews', messageRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err?.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MirrorMe Backend running on http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api/v1`);
  console.log(`🌐 Connected Supabase: ${process.env.SUPABASE_URL || 'Not Configured'}`);
});
