/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: POST /api/chat
 */

import { processChatConversation, createDynamicPedagogicalFallback } from '../src/server/geminiBackend.ts';

export default async function handler(req: any, res: any) {
  // Set CORS headers for preflight or cross-origin requests
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
    const result = await processChatConversation(body);
    res.status(200).json(result);
  } catch (err: any) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const fallback = createDynamicPedagogicalFallback(
      body?.userMessage || '',
      body?.companionConfig?.name || 'Matteo',
      body?.immediateTopic || 'Conversazione libera'
    );
    res.status(200).json(fallback);
  }
}
