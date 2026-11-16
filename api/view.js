import { list } from '@vercel/blob';

const TYPES = {
  html: 'text/html; charset=utf-8',
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
};

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
