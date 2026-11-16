import { list } from '@vercel/blob';
import { TYPES } from './_types.js';

export default async function handler(req, res) {
  const f = String(req.query.f || '');
  if (!/^[a-z0-9]+\.[a-z]+$/.test(f)) return res.status(404).send('Not found');

  const { blobs } = await list({ prefix: `sites/${f}`, limit: 1 });
  if (!blobs[0]) return res.status(404).send('Not found');

  const r = await fetch(blobs[0].url);
  res.setHeader('Content-Type', TYPES[f.split('.').pop()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');
  res.send(Buffer.from(await r.arrayBuffer()));
}
