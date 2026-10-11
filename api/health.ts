/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: GET /api/health
 */

import { getApiKey } from '../src/server/geminiBackend.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = getApiKey();
  res.status(200).json({
    status: 'ok',
    hasApiKey: !!apiKey,
    runtime: 'vercel_serverless',
    timestamp: Date.now(),
  });
}
