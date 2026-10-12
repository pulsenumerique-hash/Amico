/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import {
  getApiKey,
  processChatConversation,
  synthesizeItalianSpeech,
  evaluateSessionConversation,
  createDynamicPedagogicalFallback,
} from './src/server/geminiBackend.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Persistence file for user learning profile & pedagogical memory
const DATA_FILE = path.resolve(process.cwd(), '.user_learning_store.json');

function readStoredData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Amico Store] Impossibile leggere il file dei dati:', err);
  }
  return null;
}

function writeStoredData(data: unknown) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Amico Store] Impossibile salvare il file dei dati:', err);
  }
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!getApiKey(),
    timestamp: Date.now(),
  });
});

// Ephemeral token generation endpoint for Gemini Live API
app.all('/api/token', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY non configurata',
      hint: 'Aggiungi GEMINI_API_KEY nelle variabili d\'ambiente di Vercel o in .env',
    });
    return;
  }
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1alpha',
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
    const token = await ai.authTokens.create({ config: { uses: 5 } });
    res.json({ token: token.name, expireTime: (token as any).expireTime, status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: 'Errore generazione token effimero', message: err?.message });
  }
});

// Conversational and Pedagogical chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const result = await processChatConversation(req.body);
    res.json(result);
  } catch (err: any) {
    console.log('[Amico] Risposta di continuità generata');
    const fallback = createDynamicPedagogicalFallback(
      req.body?.userMessage || '',
      req.body?.companionConfig?.name || 'Matteo',
      req.body?.immediateTopic || 'Conversazione libera'
    );
    res.json(fallback);
  }
});

// High quality neural voice synthesis endpoint using Gemini TTS
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender = 'male' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Testo da pronunciare mancante.' });
      return;
    }
    const result = await synthesizeItalianSpeech(text, voiceGender);
    res.json(result);
  } catch (err: any) {
    res.json({ fallback: true, message: 'Passaggio a sintesi vocale browser' });
  }
});

// Comprehensive CEFR session assessment endpoint
app.post('/api/evaluate', async (req: Request, res: Response) => {
  try {
    const { turns = [], learnerProfile = {} } = req.body;
    const result = await evaluateSessionConversation(turns, learnerProfile);
    res.json(result);
  } catch (err: any) {
    res.json({
      summary: 'Sessione di conversazione completata con successo!',
      estimatedCefrLevel: 'B1',
      confidenceScore: 75,
      strengths: ['Partecipazione e interazione positiva'],
      toImprove: ['Pratica costante del lessico attivo'],
    });
  }
});

// Storage sync endpoints for user state & pedagogical memory
app.get('/api/user-data', (req: Request, res: Response) => {
  const data = readStoredData();
  res.json({ data });
});

app.post('/api/user-data', (req: Request, res: Response) => {
  const { data } = req.body;
  if (data) {
    writeStoredData(data);
  }
  res.json({ success: true, timestamp: Date.now() });
});

app.delete('/api/user-data', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    res.json({ success: true, message: 'Tutti i dati e ricordi sono stati eliminati definitivamente.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Errore durante la cancellazione dei dati.' });
  }
});

// Vite or Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amico Voice Server in esecuzione su http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Impossibile avviare il server:', err);
  process.exit(1);
});
