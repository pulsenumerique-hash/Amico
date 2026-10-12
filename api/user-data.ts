/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Vercel Serverless Function: /api/user-data
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ data: null });
    return;
  }

  if (req.method === 'POST') {
    res.status(200).json({ success: true, timestamp: Date.now() });
    return;
  }

  if (req.method === 'DELETE') {
    res.status(200).json({ success: true, message: 'Dati resettati con successo.' });
    return;
  }

  res.status(405).json({ error: 'Metodo non consentito.' });
}
