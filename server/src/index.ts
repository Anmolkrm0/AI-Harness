import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { settingsRouter } from './routes/settings.js';
import { conversationsRouter } from './routes/conversations.js';
import { documentsRouter } from './routes/documents.js';
import { chatRouter } from './routes/chat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/settings', settingsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

// Serve frontend static build if it exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`🚀 AI Harness backend server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => console.log('Process terminated'));
});
