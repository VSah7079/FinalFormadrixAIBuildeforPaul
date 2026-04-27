import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey(): string {
  return process.env.VITE_AI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
}

function parseRequestBody(req: VercelRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ error: 'Missing API key: set VITE_AI_API_KEY (or ANTHROPIC_API_KEY)' });
    return;
  }

  const body = parseRequestBody(req);
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(responseText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    res.status(502).json({ error: `Anthropic proxy request failed: ${message}` });
  }
}
