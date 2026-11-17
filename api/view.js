import { list } from '@vercel/blob';

const TYPES = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8', json: 'application/json', xml: 'application/xml',
  ico: 'image/x-icon', webmanifest: 'application/manifest+json',
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8',
  woff: 'font/woff', woff2: 'font/woff2',
};

async function exact(path) {
  const { blobs } = await list({ prefix: path, limit: 10 });
  return blobs.find((b) => b.pathname === path);
}

async function findIndex(dir) {
  const pre = `${dir}index.`;
  const { blobs } = await list({ prefix: pre, limit: 10 });
  return blobs.find((b) => !b.pathname.slice(pre.length).includes('/'));
}

export default async function handler(req, res) {
  try {
    const { slug, p, f } = req.query;
    let blob;

    if (f) {
      if (!/^[a-z0-9]+\.[a-z]+$/.test(String(f))) return res.status(404).send('Not found');
      blob = await exact(`sites/${f}`);
    } else {
      if (!/^[a-z0-9-]+$/.test(String(slug || ''))) return res.status(404).send('Not found');
      const target = String(p || '').replace(/^\/+/, '');
      if (target.split('/').some((s) => s === '..')) return res.status(404).send('Not found');
      const base = `sites/${slug}/`;

      if (!target || target.endsWith('/')) {
        blob = await findIndex(base + target);
      } else {
        blob = await exact(base + target);
        if (!blob && !target.includes('.')) blob = await exact(`${base}${target}/index.html`);
      }
    }

    if (!blob) return res.status(404).send('Not found');

    const r = await fetch(blob.url);
    const ext = blob.pathname.split('.').pop().toLowerCase();
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(500).send(String(e.message || e));
  }
     }
