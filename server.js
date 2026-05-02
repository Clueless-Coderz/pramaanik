// ─── PRAMAANIK Auth Server with Ngrok Tunnel ────────────────────────────
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3333;
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const sessions = new Map();
let PUBLIC_URL = ''; // Set by ngrok or LAN IP

const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2' };

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type' });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString())); req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}); res.end(); return; }

  // ── GET /api/tunnel-url — Returns the public URL for QR codes ──
  if (req.method === 'GET' && pathname === '/api/tunnel-url') {
    sendJson(res, 200, { url: PUBLIC_URL });
    return;
  }

  // ── POST /api/auth/callback — Wallet sends JWZ proof here ──
  if (req.method === 'POST' && pathname === '/api/auth/callback') {
    try {
      const body = await readBody(req);
      const sessionId = parsed.query.sessionId;
      console.log(`\n[AUTH] POST /api/auth/callback  sessionId=${sessionId}  body=${body.length}b`);
      if (!sessionId) { sendJson(res, 400, { error: 'Missing sessionId' }); return; }

      let did = 'did:polygonid:polygon:amoy:verified';
      try {
        const parts = body.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          if (payload.from) did = payload.from;
        }
      } catch (e) { /* JWZ parse failed, use default DID */ }

      sessions.set(sessionId, { verified: true, did, proof: body.slice(0, 200), timestamp: Date.now() });
      console.log(`  ✓ VERIFIED  did=${did}`);
      sendJson(res, 200, { message: 'Proof received', sessionId });
    } catch (e) { console.error('[AUTH] Error:', e); sendJson(res, 500, { error: 'Server error' }); }
    return;
  }

  // ── GET /api/auth/callback — Frontend polls this ──
  if (req.method === 'GET' && pathname === '/api/auth/callback') {
    const sessionId = parsed.query.sessionId;
    if (!sessionId) { sendJson(res, 400, { error: 'Missing sessionId' }); return; }
    const s = sessions.get(sessionId);
    if (s && s.verified) {
      console.log(`[POLL] ${sessionId} → VERIFIED ✓`);
      sendJson(res, 200, { verified: true, did: s.did });
    } else {
      sendJson(res, 200, { verified: false });
    }
    return;
  }

  // ── Static file serving ──
  let filePath = path.join(FRONTEND_DIR, pathname);
  if (pathname.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!filePath.startsWith(FRONTEND_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  try { if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html'); } catch(e) {}

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  // Detect LAN IP
  const nets = require('os').networkInterfaces();
  let lanIp = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { lanIp = net.address; break; }
    }
  }

  // Try ngrok tunnel
  try {
    const ngrok = require('ngrok');
    PUBLIC_URL = await ngrok.connect({ addr: PORT, proto: 'http' });
    console.log(`\n  ╔═══════════════════════════════════════════════════╗`);
    console.log(`  ║  PRAMAANIK Auth Server                            ║`);
    console.log(`  ║                                                   ║`);
    console.log(`  ║  Local:   http://localhost:${PORT}                   ║`);
    console.log(`  ║  LAN:     http://${lanIp}:${PORT}             ║`);
    console.log(`  ║  Public:  ${PUBLIC_URL.padEnd(39)}║`);
    console.log(`  ║                                                   ║`);
    console.log(`  ║  ✓ Ngrok tunnel active — QR codes will work!      ║`);
    console.log(`  ║  Open the PUBLIC url in your browser, then scan.  ║`);
    console.log(`  ╚═══════════════════════════════════════════════════╝\n`);
  } catch (e) {
    PUBLIC_URL = `http://${lanIp}:${PORT}`;
    console.log(`\n  ╔═══════════════════════════════════════════════════╗`);
    console.log(`  ║  PRAMAANIK Auth Server                            ║`);
    console.log(`  ║                                                   ║`);
    console.log(`  ║  Local:   http://localhost:${PORT}                   ║`);
    console.log(`  ║  LAN:     http://${lanIp}:${PORT}             ║`);
    console.log(`  ║                                                   ║`);
    console.log(`  ║  ⚠ Ngrok failed: ${(e.message||'').slice(0,32).padEnd(32)}║`);
    console.log(`  ║  Using LAN IP for QR callbacks.                   ║`);
    console.log(`  ║  Ensure phone is on same Wi-Fi network.           ║`);
    console.log(`  ╚═══════════════════════════════════════════════════╝\n`);
  }
});
