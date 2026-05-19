import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import calculateRouter from './routes/calculate.js';
import { uploadsDir } from './middleware/upload.js';
import './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3002);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-bingjian' });
});

app.use('/api', calculateRouter);

app.use((err, _req, res, _next) => {
  const message = err?.message || '服务器内部错误';
  const status =
    message.includes('Only image files are allowed') ||
    message.includes('File too large') ||
    message.includes('请') ||
    message.includes('格式不正确')
      ? 400
      : 500;

  res.status(status).json({
    success: false,
    message
  });
});

app.listen(PORT, () => {
  console.log(`AI Bingjian API listening on http://localhost:${PORT}`);
});
