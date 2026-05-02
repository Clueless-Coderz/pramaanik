// ─── PRAMAANIK Data Layer ───────────────────────────────────────────────
// Mirrors useChainData.ts seeded data exactly. Supports optional RPC fetch.
(function() {
'use strict';
window.PRAMAANIK = window.PRAMAANIK || {};

// ─── Config ─────────────────────────────────────────────────────────────
const CONFIG = {
  rpcUrl: 'http://localhost:8545',
  fundFlowAddr: '',
  schemeRegistryAddr: '',
  anchorAddr: '',
  privadoVerifierDid: 'did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR',
};
window.PRAMAANIK.config = CONFIG;

// ─── SVG Icons ──────────────────────────────────────────────────────────
const I={shield:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',eye:'<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',users:'<svg class="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',dashboard:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',fileText:'<svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',send:'<svg class="icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',alertTriangle:'<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',anchor:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',activity:'<svg class="icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',trendingUp:'<svg class="icon" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',rupee:'<svg class="icon" viewBox="0 0 24 24"><line x1="6" y1="3" x2="18" y2="3"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="3" x2="6" y2="8"/><path d="M14 8c0 5.5-8 5.5-8 5.5"/><path d="M6 13.5L14 21"/></svg>',checkCircle:'<svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',xCircle:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',search:'<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',snowflake:'<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M20 16l-4-4 4-4"/><path d="M4 8l4 4-4 4"/><path d="M16 4l-4 4-4-4"/><path d="M8 20l4-4 4 4"/></svg>',lock:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',unlock:'<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',clock:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',messageSquare:'<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'};
window.PRAMAANIK.icon = function(n,c){const s=I[n]||'';return c?s.replace('class="icon"','class="icon '+c+'"'):s;};

// ─── Seeded Data (exact mirror of useChainData.ts SEEDED_* constants) ───
window.PRAMAANIK.stats = { totalSanctioned:"₹5,555.0 Cr", activeSchemes:4, disbursementCount:21, flaggedCount:7 };

window.PRAMAANIK.schemes = [
  {name:"PM-KISAN FY2025-26 Installment-19",ministry:"Ministry of Agriculture & Farmers Welfare",budget:"₹714.0 Cr",beneficiaries:"5",disbursed:"100%",disbursedPct:100},
  {name:"MGNREGA FY2025-26 Bihar-Q1",ministry:"Ministry of Rural Development",budget:"₹2,408.0 Cr",beneficiaries:"3",disbursed:"4%",disbursedPct:4},
  {name:"Ayushman Bharat PMJAY FY2025-26 MP",ministry:"Ministry of Health & Family Welfare",budget:"₹307.5 Cr",beneficiaries:"3",disbursed:"6%",disbursedPct:6},
  {name:"PMAY-G FY2025-26 Odisha Phase-3",ministry:"Ministry of Rural Development",budget:"₹2,125.5 Cr",beneficiaries:"2",disbursed:"1%",disbursedPct:1},
];

window.PRAMAANIK.disbursements = [
  {id:"0xa1b2...c3d4",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"ReleasedToBeneficiary",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ01AA",time:"2 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xe5f6...g7h8",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"ReleasedToBeneficiary",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ02BB",time:"3 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xi9j0...k1l2",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"ReleasedToBeneficiary",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ03CC",time:"4 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xm3n4...o5p6",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"ReleasedToBeneficiary",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ04DD",time:"5 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xq7r8...s9t0",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"ReleasedToBeneficiary",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ05EE",time:"6 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xb12e...f843",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"ReleasedToBeneficiary",amount:"₹3,192",recipient:"did:polygonid:worker:BR01NW",time:"8 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xc23f...d456",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"ReleasedToBeneficiary",amount:"₹2,964",recipient:"did:polygonid:worker:BR02NW",time:"9 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xd34a...e567",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"ReleasedToBeneficiary",amount:"₹3,420",recipient:"did:polygonid:worker:BR03NW",time:"10 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xe45b...f678",scheme:"Ayushman Bharat PMJAY FY2025-26 MP",stage:"ReleasedToBeneficiary",amount:"₹1.7 L",recipient:"did:polygonid:hospital:MP:HAAB0001",time:"12 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xf56c...a789",scheme:"Ayushman Bharat PMJAY FY2025-26 MP",stage:"ReleasedToBeneficiary",amount:"₹15,000",recipient:"did:polygonid:hospital:MP:HAAB0005",time:"13 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0xa67d...b890",scheme:"Ayushman Bharat PMJAY FY2025-26 MP",stage:"ReleasedToBeneficiary",amount:"₹9,000",recipient:"did:polygonid:hospital:MP:HAAB0009",time:"14 min ago",status:"active",gst:true,bank:true,geo:true},
  {id:"0x7c2f...a3d1",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"Sanctioned",amount:"₹49.8 L",recipient:"did:polygonid:vendor:GST:09AABCS1234",time:"18 min ago",status:"flagged",gst:true,bank:true,geo:true},
  {id:"0x8d3a...b4e2",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"Sanctioned",amount:"₹49.8 L",recipient:"did:polygonid:vendor:GST:20AADCF5678",time:"19 min ago",status:"flagged",gst:true,bank:true,geo:true},
  {id:"0x9e4b...c5f3",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"Sanctioned",amount:"₹49.8 L",recipient:"did:polygonid:vendor:GST:09AABCS9999",time:"20 min ago",status:"flagged",gst:true,bank:true,geo:true},
  {id:"0xaf5c...d6a4",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"Sanctioned",amount:"₹49.8 L",recipient:"did:polygonid:vendor:GST:09AABCS1234",time:"21 min ago",status:"flagged",gst:true,bank:true,geo:true},
  {id:"0xba6d...e7b5",scheme:"MGNREGA FY2025-26 Bihar-Q1",stage:"Sanctioned",amount:"₹49.8 L",recipient:"did:polygonid:vendor:GST:20AADCF5678",time:"22 min ago",status:"flagged",gst:true,bank:true,geo:true},
  {id:"0xcb7e...f8c6",scheme:"PM-KISAN FY2025-26 Installment-19",stage:"Sanctioned",amount:"₹2,000",recipient:"did:polygonid:farmer:RJ:deceased",time:"25 min ago",status:"flagged",gst:true,bank:false,geo:true},
  {id:"0xdc8f...a9d7",scheme:"Ayushman Bharat PMJAY FY2025-26 MP",stage:"Sanctioned",amount:"₹50.0 Cr",recipient:"did:polygonid:government:MP:SHA",time:"30 min ago",status:"pending",gst:true,bank:true,geo:true},
];

window.PRAMAANIK.flags = [
  {id:"FLAG-001",type:"Split Contract Pattern",scheme:"MGNREGA FY2025-26 Bihar-Q1",risk:8500,severity:"high",amountRaw:24900000,amount:"₹2.49 Cr",txId:"0x7c2f...a3d1",proofVerified:true,timeMs:Date.now()-18*60000,time:"18 min ago",proof:"0x7c2f...a3d1",explanation:"5 transactions of ₹49.8L to 3 linked vendors within 24h — CAG Report No.14 threshold-avoidance motif. Vendors share PAN prefix AABCS.",motif:"Temporal burst: Agency → Vendor (×5 in 24h, amount clustering at ₹49.8L)",model:"RGCN v2.3",disbursementId:"0x7c2f...a3d1"},
  {id:"FLAG-002",type:"Ghost Beneficiary",scheme:"PM-KISAN FY2025-26 Installment-19",risk:9800,severity:"critical",amountRaw:2000,amount:"₹2,000",txId:"0xcb7e...f8c6",proofVerified:true,timeMs:Date.now()-25*60000,time:"25 min ago",proof:"0xcb7e...f8c6",explanation:"Deceased farmer RJ09ZZ999999999 — Aadhaar status INACTIVE, death registry match confirmed. e-KYC lapsed. ₹2,000 routing to operator-controlled account.",motif:"Deceased-beneficiary subgraph: Treasury → Agency → [DECEASED_DID]",model:"RGCN v2.3",disbursementId:"0xcb7e...f8c6"},
  {id:"FLAG-003",type:"Multi-sig Pending",scheme:"Ayushman Bharat PMJAY FY2025-26 MP",risk:5400,severity:"medium",amountRaw:5000000000,amount:"₹50.0 Cr",txId:"0xdc8f...a9d7",proofVerified:false,timeMs:Date.now()-30*60000,time:"30 min ago",proof:"0xdc8f...a9d7",explanation:"₹50 Cr quarterly pool release to MP State Health Agency requires dual NHA+SHA co-approval. Awaiting 2nd admin signature.",motif:"Multi-sig threshold: High-value release pending co-approval",model:"RGCN v2.3",disbursementId:"0xdc8f...a9d7"},
];

window.PRAMAANIK.anchors = [
  {chain:"Polygon Amoy",root:"0x7f4c5e...2b9d1a4c",seq:482901,time:"just now",status:"confirmed"},
  {chain:"Ethereum Sepolia",root:"0xa1c9e2...8b7c6d5e",seq:241450,time:"3 min ago",status:"confirmed"},
];

window.PRAMAANIK.frozen = [
  {id:"FRZ-001",txId:"0xcb7e...f8c6",scheme:"PM-KISAN FY2025-26 Installment-19",amountRaw:2000,amount:"₹2,000",reason:"Deceased beneficiary detected by zkML oracle — Aadhaar status INACTIVE, death registry match confirmed.",flag:"FLAG-002",frozenAt:"2026-04-30 18:42 IST",frozenBy:"Auditor 0xcag…01",status:"Frozen",daysLocked:1},
  {id:"FRZ-002",txId:"0x7c2f...a3d1",scheme:"MGNREGA FY2025-26 Bihar-Q1",amountRaw:24900000,amount:"₹2.49 Cr",reason:"Split-contract pattern — five transactions of ₹49.8L to linked vendors within 24 hours, threshold-avoidance motif.",flag:"FLAG-001",frozenAt:"2026-04-29 09:32 IST",frozenBy:"Auditor 0xcag…02",status:"Under Review",daysLocked:2},
];

window.PRAMAANIK.grievances = [
  {id:"GRV-001",scheme:"PM-KISAN FY2025-26 Installment-19",title:"Installment-19 not credited",filer:"did:polygonid:farmer:RJ03CC",description:"Installment-19 not credited. Aadhaar-bank seeding done on 12-Mar-2025 at CSC Sikar. PFMS shows 'Pending at State'. Reference: CPGRAMS/2025/DAKL/100234.",status:"open",filedAt:"2026-04-30",lastUpdated:"2026-04-30",txHash:"0x9d4ae7f1c3b2a1d0e9f8c7b6a5d4e3f2",responseCount:0},
  {id:"GRV-002",scheme:"MGNREGA FY2025-26 Bihar-Q1",title:"Wages delayed beyond 15 days",filer:"did:polygonid:worker:BR01NW",description:"Job Card No. BR-02-005-001-000/1234. Work completed 01-Apr-2025 to 14-Apr-2025 (Muster Roll MR/BR/AUR/2025/04/0087). Wages not credited as of 02-May-2025. Section 3(3) delay: 18 days.",status:"investigating",filedAt:"2026-05-01",lastUpdated:"2026-05-01",txHash:"0x7c2fa3d1b4e5c6d7e8f9a0b1c2d3e4f5",responseCount:2},
  {id:"GRV-003",scheme:"PMAY-G FY2025-26 Odisha Phase-3",title:"Poor construction quality",filer:"did:polygonid:beneficiary:OD:PMAYG:OD16KRP001",description:"House ID OD-16-KRP-2025-001. Foundation work completed but wall cracks visible within 15 days. Junior Engineer certified completion without site visit per AwaasSoft upload. Request geo-tagged re-verification.",status:"open",filedAt:"2026-05-01",lastUpdated:"2026-05-01",txHash:"0x4b3c5e2f1a8d9c7b6e5f4d3c2b1a0987",responseCount:1},
];

window.PRAMAANIK.trail = [
  {seq:1,title:"Scheme Sanctioned",actor:"Ministry of Rural Development",actorId:"did:polygonid:ministry:rural",txId:"0x0a1b2c3d4e5f6a7b8c9d0e1f",when:"2025-04-01 09:14 IST",description:"Scheme `MGNREGA FY2025-26 Bihar-Q1` registered with sanctioned budget ₹2,408.0 Cr. SchemeRegistry event emitted.",verified:true},
  {seq:2,title:"Disbursement Initiated",actor:"Agency 0x1c9e",actorId:"did:polygonid:agency:1c9e",txId:"0x7c2fa3d1b4e5c6d7e8f9a0b1c2d3e4f5",when:"2025-04-30 11:23 IST",description:"Disbursement of ₹49.8 L created targeting vendor 0xv1. GST/Bank/Geo oracles invoked.",verified:true},
  {seq:3,title:"Oracle Attestation",actor:"Chainlink Functions",actorId:"fn:chainlink:gst+npci+geo",txId:"0xa1c9e29f8b7c6d5e4a3b2c1d",when:"2025-04-30 11:24 IST",description:"GST: VALID · Bank: UNIQUE · Geo: WITHIN-POLYGON. Attestation hash anchored in AnomalyOracle.",verified:true},
  {seq:4,title:"zkML Anomaly Flag",actor:"RGCN v2.3",actorId:"model:RGCN-v2.3",txId:"0x4b3c5e2f1a8d9c7b6e5f4d3c",when:"2025-04-30 11:25 IST",description:"Pattern matched: 5 consecutive ₹49.8L disbursements to linked vendors in 24h. Risk = 8500 / 10000.",verified:true},
  {seq:5,title:"Frozen by Auditor",actor:"Auditor 0xcag…02",actorId:"did:polygonid:auditor:cag02",txId:"0x9d4ae7f1c3b2a1d0e9f8c7b6",when:"2025-04-30 11:32 IST",description:"Auditor invoked `freezeDisbursement(0x7c2f…)`. Funds locked pending CAG review.",verified:true},
  {seq:6,title:"Anchored to Polygon Amoy",actor:"Anchor Service",actorId:"service:anchor",txId:"0x7f4c5e2b9d1a4c8e7f1a3b5c",when:"2025-04-30 11:35 IST",description:"Merkle root containing this trail anchored to Polygon Amoy at sequence #482,901.",verified:true},
];

// ─── Derived helpers ────────────────────────────────────────────────────
window.PRAMAANIK.getSchemeByName = function(name) {
  return window.PRAMAANIK.schemes.find(s => s.name === name) || null;
};
window.PRAMAANIK.getDisbById = function(id) {
  return window.PRAMAANIK.disbursements.find(d => d.id === id) || null;
};
window.PRAMAANIK.getFlagById = function(id) {
  return window.PRAMAANIK.flags.find(f => f.id === id) || null;
};
window.PRAMAANIK.getFlagByTx = function(txId) {
  return window.PRAMAANIK.flags.find(f => f.txId === txId) || null;
};

// ─── Connection status ──────────────────────────────────────────────────
window.PRAMAANIK.connected = false;
window.PRAMAANIK.loading = false;

// ─── Optional: Try RPC fetch (ethers.js loaded via CDN if needed) ───────
window.PRAMAANIK.tryRpcFetch = async function() {
  if (!CONFIG.fundFlowAddr || typeof ethers === 'undefined') return false;
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    await provider.getBlockNumber();
    window.PRAMAANIK.connected = true;
    return true;
  } catch(e) {
    console.warn('[PRAMAANIK] RPC unreachable, using seeded data:', e.message);
    return false;
  }
};
})();
