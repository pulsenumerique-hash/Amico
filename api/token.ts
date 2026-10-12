/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: GET /api/token & POST /api/token
 * Generates an ephemeral auth token for direct browser-to-Gemini Live API WebSocket sessions.
 */

import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS support for web and mobile clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY manquante sur Vercel.',
      hint: 'Configurez la variable GEMINI_API_KEY dans Vercel (Project Settings > Environment Variables).',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    res.status(200).json({ token: token.name });
  } catch (err: any) {
    console.error('[Amico /api/token] Erreur création token:', err);
    res.status(500).json({
      error: 'Impossible de générer le jeton éphémère.',
      message: err?.message || String(err),
    });
  }
}
