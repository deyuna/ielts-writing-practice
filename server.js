/* ── IELTS Practice — proxy server ────────────────────
   Serves static files + proxies /api/evaluate to Anthropic.
   Usage:
     export ANTHROPIC_API_KEY=sk-ant-...
     node server.js
   ──────────────────────────────────────────────────── */
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

/* ── Static file serving ── */
function serveFile(res, filePath) {
  const ext         = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/* ── /api/evaluate proxy ── */
function proxyEvaluate(req, res) {
  if (!API_KEY) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY is not configured on the server.' } }));
    return;
  }

  let body = '';
  req.on('data', function (chunk) { body += chunk; });
  req.on('end', function () {
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (_) { res.writeHead(400); res.end('Bad request'); return; }

    const postData = JSON.stringify(parsed);
    const options  = {
      hostname : 'api.anthropic.com',
      port     : 443,
      path     : '/v1/messages',
      method   : 'POST',
      headers  : {
        'x-api-key'          : API_KEY,
        'anthropic-version'  : '2023-06-01',
        'content-type'       : 'application/json',
        'content-length'     : Buffer.byteLength(postData),
      },
    };

    const apiReq = https.request(options, function (apiRes) {
      let out = '';
      apiRes.on('data', function (c) { out += c; });
      apiRes.on('end', function () {
        res.writeHead(apiRes.statusCode, {
          'Content-Type'                : 'application/json',
          'Access-Control-Allow-Origin' : '*',
        });
        res.end(out);
      });
    });
    apiReq.on('error', function (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: e.message } }));
    });
    apiReq.write(postData);
    apiReq.end();
  });
}

/* ── Main server ── */
const server = http.createServer(function (req, res) {
  const pathname = url.parse(req.url).pathname;

  /* CORS preflight */
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin'  : '*',
      'Access-Control-Allow-Methods' : 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers' : 'Content-Type',
    });
    res.end();
    return;
  }

  /* API proxy */
  if (req.method === 'POST' && pathname === '/api/evaluate') {
    proxyEvaluate(req, res);
    return;
  }

  /* Static files */
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  serveFile(res, filePath);
});

server.listen(PORT, function () {
  if (!API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY is not set — AI evaluation will not work.');
    console.warn('   export ANTHROPIC_API_KEY=sk-ant-...');
  } else {
    console.log('✓  Anthropic API key loaded.');
  }
  console.log('✓  Server → http://localhost:' + PORT);
});
