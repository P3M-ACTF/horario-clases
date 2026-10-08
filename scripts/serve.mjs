/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './validate.mjs';
const base = path.join(root, 'dist'), port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/horario-clases') { res.writeHead(302, { Location: '/horario-clases/' }); return res.end(); }
    let rel = decodeURIComponent(url.pathname).replace(/^\/horario-clases\//, '/').replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const target = path.resolve(base, rel);
    if (!target.startsWith(base + path.sep)) throw new Error();
    const data = await fs.readFile(target); res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(port, '127.0.0.1', () => console.log(`Vista previa: http://127.0.0.1:${port}/horario-clases/`));
