/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: POST /api/tts
 */

import { synthesizeItalianSpeech } from '../src/server/geminiBackend.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo non consentito. Utilizzare POST.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { text, voiceGender = 'male' } = body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Testo da pronunciare mancante o non valido.' });
      return;
    }

    const result = await synthesizeItalianSpeech(text, voiceGender);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(200).json({
      fallback: true,
      message: err?.message || 'Passaggio alla sintesi vocale del browser.',
    });
  }
}
