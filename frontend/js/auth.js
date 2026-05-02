// ─── PRAMAANIK Auth Module ──────────────────────────────────────────────
// Handles session management, route guards, and role-based access control.
// Works with both real Privado ID backend and demo simulation.

(function() {
  'use strict';

  const SESSION_KEY = 'pramaanik-session';
  const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // ── Session CRUD ──────────────────────────────────────────────────────

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Check expiry
      if (Date.now() - session.iat > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function setSession(did, role, verified) {
    const session = {
      did: did,
      role: role,
      verified: verified === true,
      iat: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAuthenticated() {
    const s = getSession();
    return s !== null && s.verified === true;
  }

  function getRole() {
    const s = getSession();
    return s ? s.role : null;
  }

  function getDid() {
    const s = getSession();
    return s ? s.did : null;
  }

  // ── Route Guard ───────────────────────────────────────────────────────
  // Call this at the top of every protected page.
  // requiredRole: 'admin' | 'auditor' | 'citizen' | null (any authenticated)

  function guard(requiredRole) {
    const session = getSession();

    if (!session || !session.verified) {
      // Not authenticated — redirect to landing with return URL
      const returnPath = window.location.pathname;
      window.location.href = '../index.html?redirect=' + encodeURIComponent(returnPath);
      return false;
    }

    if (requiredRole && session.role !== requiredRole) {
      // Wrong role — redirect to their correct dashboard
      const roleRoutes = { admin: '../admin/', auditor: '../auditor/', citizen: '../citizen/' };
      const correctRoute = roleRoutes[session.role] || '../index.html';
      window.location.href = correctRoute;
      return false;
    }

    return true;
  }

  // ── Auth Request Builder ──────────────────────────────────────────────
  // Builds a valid iden3comm authorization request that Privado ID wallet
  // can scan and process.

  function buildAuthRequest(sessionId, role, callbackUrl) {
    const verifierDid = 'did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR';
    
    const ROLE_REASONS = {
      admin: 'PRAMAANIK – Treasury Admin portal access',
      auditor: 'PRAMAANIK – CAG Auditor portal access',
      citizen: 'PRAMAANIK – Public Audit portal access',
    };

    return {
      id: sessionId,
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/authorization/1.0/request',
      thid: sessionId,
      body: {
        callbackUrl: callbackUrl,
        reason: ROLE_REASONS[role] || 'PRAMAANIK – Identity verification',
        scope: []
      },
      from: verifierDid
    };
  }

  // ── Universal Link Builder ────────────────────────────────────────────
  // Encodes auth request into iden3comm:// deep link for mobile wallet

  function buildUniversalLink(authRequest) {
    const jsonStr = JSON.stringify(authRequest);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return 'iden3comm://?i_m=' + encoded;
  }

  // ── QR Code Generator ────────────────────────────────────────────────
  // Uses locally-bundled qrcode-generator library

  function generateQrDataUrl(content) {
    if (typeof qrcode === 'undefined') {
      console.warn('[PRAMAANIK] qrcode-generator library not loaded');
      return '';
    }
    try {
      const qr = qrcode(0, 'M');
      qr.addData(content);
      qr.make();
      return qr.createDataURL(6, 4);
    } catch(e) {
      console.warn('[PRAMAANIK] QR generation failed:', e);
      return '';
    }
  }

  // ── Callback Poller ───────────────────────────────────────────────────
  // Polls the backend callback endpoint for proof verification status.
  // Falls back to demo simulation if backend is unreachable.

  function createPoller(sessionId, role, options) {
    const {
      onPoll = () => {},
      onVerified = () => {},
      onTimeout = () => {},
      onError = () => {},
      intervalMs = 2000,
      maxSteps = 60,
      apiBase = ''
    } = options;

    let step = 0;
    let timer = null;
    let backendReachable = null; // null = unknown, true/false after first attempt

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
      stop();
      step = 0;

      timer = setInterval(async () => {
        step++;
        onPoll(step);

        if (step >= maxSteps) {
          stop();
          onTimeout();
          return;
        }

        // Try real backend
        if (apiBase) {
          try {
            const res = await fetch(apiBase + '/api/auth/callback?sessionId=' + sessionId);
            if (res.ok) {
              backendReachable = true;
              const data = await res.json();
              if (data.verified) {
                stop();
                // Store session
                setSession(data.did || 'did:polygonid:verified', role, true);
                onVerified(data.did || '');
                return;
              }
            }
          } catch {
            if (backendReachable === null) backendReachable = false;
          }
        }

        // Demo fallback: auto-verify after 16 steps (32 seconds)
        if (!backendReachable && step >= 16) {
          stop();
          const demoDid = 'did:polygonid:polygon:amoy:2qDemo' + sessionId.slice(0, 8);
          setSession(demoDid, role, true);
          onVerified(demoDid);
        }
      }, intervalMs);
    }

    return { start, stop, getStep: () => step };
  }

  // ── Logout ────────────────────────────────────────────────────────────

  function logout() {
    clearSession();
    window.location.href = '../index.html';
  }

  // ── Session Info Bar ──────────────────────────────────────────────────
  // Returns HTML for a small session indicator (used in sidebar footer)

  function sessionInfoHtml() {
    const s = getSession();
    if (!s) return '';
    return `
      <div style="padding:8px 14px;border-radius:8px;background:rgba(99,102,241,0.04);border:1px solid var(--border-subtle);margin-bottom:8px">
        <div class="text-xs" style="color:var(--text-muted)">Authenticated as</div>
        <div class="text-xs font-mono truncate" style="color:var(--text-secondary);max-width:180px" title="${s.did}">${s.did ? s.did.slice(0, 24) + '…' : 'Unknown'}</div>
        <div class="text-xs mt-1"><span class="badge badge-active" style="font-size:9px;padding:2px 8px">${s.role}</span></div>
      </div>
    `;
  }

  // ── Export ─────────────────────────────────────────────────────────────

  window.PRAMAANIK = window.PRAMAANIK || {};
  window.PRAMAANIK.auth = {
    getSession,
    setSession,
    clearSession,
    isAuthenticated,
    getRole,
    getDid,
    guard,
    buildAuthRequest,
    buildUniversalLink,
    generateQrDataUrl,
    createPoller,
    logout,
    sessionInfoHtml
  };
})();
