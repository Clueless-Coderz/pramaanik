// ─── Sidebar Generator ──────────────────────────────────────────────────
window.PRAMAANIK = window.PRAMAANIK || {};

window.PRAMAANIK.sidebar = function(role, activePage) {
  var flagCount = (window.PRAMAANIK.flags && window.PRAMAANIK.flags.length) || 0;
  var frozenCount = (window.PRAMAANIK.frozen && window.PRAMAANIK.frozen.length) || 0;
  const configs = {
    admin: {
      title: "Admin Console",
      color: "var(--accent-primary)",
      gradient: "linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))",
      icon: `<svg class="icon" viewBox="0 0 24 24" style="color:#fff"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      items: [
        { label:"Dashboard", href:"index.html", page:"dashboard", icon:`<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` },
        { label:"Schemes", href:"schemes.html", page:"schemes", icon:`<svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
        { label:"Disbursements", href:"disbursements.html", page:"disbursements", icon:`<svg class="icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>` },
        { label:"Anomaly Flags", href:"flags.html", page:"flags", badge:flagCount, icon:`<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
        { label:"Anchor Status", href:"anchors.html", page:"anchors", icon:`<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>` },
      ]
    },
    auditor: {
      title: "Auditor Console",
      color: "var(--accent-secondary)",
      gradient: "linear-gradient(135deg,var(--accent-secondary),#2563eb)",
      icon: `<svg class="icon" viewBox="0 0 24 24" style="color:#fff"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      items: [
        { label:"Dashboard", href:"index.html", page:"dashboard", icon:`<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` },
        { label:"Anomaly Flags", href:"flags.html", page:"flags", badge:flagCount, icon:`<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
        { label:"Frozen Assets", href:"frozen.html", page:"frozen", badge:frozenCount, icon:`<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M20 16l-4-4 4-4"/><path d="M4 8l4 4-4 4"/></svg>` },
        { label:"zkML Proofs", href:"proofs.html", page:"proofs", icon:`<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>` },
      ]
    },
    citizen: {
      title: "Citizen Portal",
      color: "var(--accent-success)",
      gradient: "linear-gradient(135deg,var(--accent-success),#14b8a6)",
      icon: `<svg class="icon" viewBox="0 0 24 24" style="color:#fff"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      items: [
        { label:"Dashboard", href:"index.html", page:"dashboard", icon:`<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` },
        { label:"Trace Funds", href:"trace.html", page:"trace", icon:`<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` },
        { label:"Grievances", href:"grievances.html", page:"grievances", icon:`<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
        { label:"Verify Proof", href:"verify.html", page:"verify", icon:`<svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
      ]
    }
  };

  const c = configs[role];
  const navHtml = c.items.map(item => {
    const isActive = item.page === activePage;
    const badgeHtml = item.badge ? `<span style="margin-left:auto;min-width:18px;height:18px;padding:0 4px;background:var(--accent-danger);color:#fff;border-radius:9px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${item.badge}</span>` : '';
    return `<a href="${item.href}" class="sidebar-link${isActive?' active':''}">${item.icon}<span>${item.label}</span>${badgeHtml}</a>`;
  }).join('');

  return `
    <div class="flex items-center gap-3 mb-8 px-2">
      <div style="width:36px;height:36px;border-radius:8px;background:${c.gradient};display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.icon}</div>
      <div>
        <div class="font-bold text-sm">PRAMAANIK</div>
        <div class="text-xs" style="color:var(--text-muted)">${c.title}</div>
      </div>
    </div>
    <div class="text-xs font-semibold uppercase tracking-widest px-4 mb-3" style="color:var(--text-muted)">Main Menu</div>
    <nav class="flex-1" style="display:flex;flex-direction:column;gap:2px">${navHtml}</nav>
    <div class="mt-auto border-t" style="padding-top:16px">
      ${window.PRAMAANIK.auth ? window.PRAMAANIK.auth.sessionInfoHtml() : ''}
      <a href="#" onclick="PRAMAANIK.auth.logout();return false" class="sidebar-link" style="color:var(--text-muted)">
        <svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Logout</span>
      </a>
    </div>
  `;
};

// ─── Mobile header + sidebar toggle ─────────────────────────────────────
window.PRAMAANIK.mobileHeader = function() {
  return `
  <header class="mobile-header fixed z-50 flex items-center justify-between px-4" style="top:0;left:0;right:0;height:56px;background:var(--bg-primary);border-bottom:1px solid var(--border-subtle)">
    <div class="flex items-center gap-2">
      <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));display:flex;align-items:center;justify-content:center">
        <svg class="icon icon-sm" viewBox="0 0 24 24" style="color:#fff"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <span class="font-bold text-sm">PRAMAANIK</span>
    </div>
    <button onclick="toggleSidebar()" style="padding:8px;color:var(--text-secondary);background:none;border:none;cursor:pointer">
      <svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </header>`;
};

window.toggleSidebar = function() {
  var sb = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  // Create/show overlay backdrop
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:39;display:none;cursor:pointer';
    overlay.onclick = function() { window.toggleSidebar(); };
    document.body.appendChild(overlay);
  }
  overlay.style.display = sb.classList.contains('open') ? 'block' : 'none';
};

// ─── Page shell helper (with route guard) ───────────────────────────────
window.PRAMAANIK.initPage = function(role, page) {
  // Route guard: check session and role
  if (window.PRAMAANIK.auth && !window.PRAMAANIK.auth.guard(role)) {
    return false; // guard will redirect
  }

  // Inject mobile header
  const mh = document.getElementById('mobileHeader');
  if (mh) mh.innerHTML = window.PRAMAANIK.mobileHeader();
  // Inject sidebar
  const sb = document.getElementById('sidebar');
  if (sb) sb.innerHTML = window.PRAMAANIK.sidebar(role, page);
  return true;
};
