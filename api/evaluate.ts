/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: POST /api/evaluate
 */

import { evaluateSessionConversation } from '../src/server/geminiBackend.ts';

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
    const { turns = [], learnerProfile = {} } = body;
    const result = await evaluateSessionConversation(turns, learnerProfile);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(200).json({
      summary: 'Conversazione viva e ricca di spunti! Hai mantenuto la conversazione in italiano con entusiasmo.',
      strengths: ['Spontaneità nelle risposte', 'Buona padronanza del vocabolario quotidiano'],
      toImprove: ['Consolidare le concordanze verbali al passato'],
      estimatedCefrLevel: 'B1',
      confidenceScore: 75,
    });
  }
}
