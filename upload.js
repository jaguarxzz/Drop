 import { put, list } from '@vercel/blob';
import { unzipSync } from 'fflate';

const TYPES = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  json: 'application/json', xml: 'application/xml', ico: 'image/x-icon',
  webmanifest: 'application/manifest+json',
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8',
  woff: 'font/woff', woff2: 'font/woff2',
};
const RESERVED = ['s', 'index', 'admin', 'favicon'];
const extOf = (n) => (n.includes('.') ? n.split('.').pop().toLowerCase() : '');

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method salah' });

    const name = String(req.query.name || '').toLowerCase();
    const ext = extOf(name);
    if (ext !== 'zip' && !TYPES[ext]) return res.status(400).json({ error: 'Format belum didukung' });

    let slug = String(req.query.slug || '').toLowerCase().trim();
    if (slug) {
      if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug) || RESERVED.includes(slug) || slug.startsWith('api'))
        return res.status(400).json({ error: 'Nama link: 3–30 karakter, huruf kecil, angka, atau strip' });
    } else {
      slug = Math.random().toString(36).slice(2, 9);
    }

    const taken = await list({ prefix: `sites/${slug}/`, limit: 1 });
    if (taken.blobs.length) return res.status(409).json({ error: 'Nama link sudah dipakai, coba nama lain' });

    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 4 * 1024 * 1024) return res.status(413).json({ error: 'Maksimal 4 MB' });
      chunks.push(c);
    }
    const buf = Buffer.concat(chunks);

    const files = [];
    if (ext === 'zip') {
      let entries;
      try { entries = unzipSync(new Uint8Array(buf)); }
      catch { return res.status(400).json({ error: 'File ZIP rusak' }); }

      let paths = Object.keys(entries).filter(
        (p) => !p.endsWith('/') && !p.startsWith('__MACOSX') && !p.split('/').some((s) => s === '..' || s.startsWith('.'))
      );
      let strip = 0;
      if (paths.length && paths.every((p) => p.includes('/'))) {
        const top = paths[0].split('/')[0];
        if (paths.every((p) => p.startsWith(top + '/'))) strip = top.length + 1;
      }
      for (const p of paths) {
        const path = p.slice(strip);
        const type = TYPES[extOf(path)];
        if (type) files.push({ path, data: entries[p], type });
      }
      if (files.length > 300) return res.status(400).json({ error: 'Maksimal 300 file di dalam ZIP' });
      if (!files.some((f) => f.path === 'index.html'))
        return res.status(400).json({ error: 'ZIP harus berisi index.html' });
    } else {
      files.push({ path: `index.${ext === 'htm' ? 'html' : ext}`, data: buf, type: TYPES[ext] });
    }

    await Promise.all(
      files.map((f) =>
        put(`sites/${slug}/${f.path}`, Buffer.from(f.data), {
          access: 'public',
          contentType: f.type,
          addRandomSuffix: false,
        })
      )
    );
    res.status(200).json({ url: `/${slug}`, files: files.length });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
    }
