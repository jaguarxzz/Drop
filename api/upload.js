import { put } from '@vercel/blob';

const TYPES = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8',
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const name = String(req.query.name || '').toLowerCase();
  let ext = name.split('.').pop();
  if (!TYPES[ext]) return res.status(400).json({ error: 'Format belum didukung' });

  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 4 * 1024 * 1024) return res.status(413).json({ error: 'Maksimal 4 MB' });
    chunks.push(c);
  }

  if (ext === 'htm') ext = 'html';
  const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const key = `${id}.${ext}`;
  await put(`sites/${key}`, Buffer.concat(chunks), {
    access: 'public',
    contentType: TYPES[ext],
    addRandomSuffix: false,
  });
  res.json({ url: `/s/${key}` });
}
