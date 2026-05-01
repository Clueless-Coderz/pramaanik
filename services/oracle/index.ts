import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════
// GAP #1 FIX: Circuit-breaker pattern for all oracle connectors
// ═══════════════════════════════════════════════════════════════════════

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
}

class CircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();
  private readonly threshold: number;
  private readonly resetTimeout: number; // ms

  constructor(threshold = 5, resetTimeoutMs = 30000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeoutMs;
  }

  private getState(service: string): CircuitBreakerState {
    if (!this.states.has(service)) {
      this.states.set(service, { failures: 0, lastFailure: 0, state: "CLOSED" });
    }
    return this.states.get(service)!;
  }

  canExecute(service: string): boolean {
    const s = this.getState(service);
    if (s.state === "CLOSED") return true;
    if (s.state === "OPEN") {
      if (Date.now() - s.lastFailure > this.resetTimeout) {
        s.state = "HALF_OPEN";
        return true; // allow one probe
      }
      return false;
    }
    return true; // HALF_OPEN — allow probe
  }

  recordSuccess(service: string): void {
    const s = this.getState(service);
    s.failures = 0;
    s.state = "CLOSED";
  }

  recordFailure(service: string): void {
    const s = this.getState(service);
    s.failures++;
    s.lastFailure = Date.now();
    if (s.failures >= this.threshold) {
      s.state = "OPEN";
      console.error(`[CircuitBreaker] ${service} OPEN after ${s.failures} failures`);
      metrics.circuitBreakerTrips.inc(service);
    }
  }

  getStatus(service: string): CircuitBreakerState {
    return this.getState(service);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GAP #6 FIX: Prometheus-compatible metrics
// ═══════════════════════════════════════════════════════════════════════

class SimpleMetrics {
  private counters: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, number[]> = new Map();

  inc(metric: string, label: string = "default"): void {
    if (!this.counters.has(metric)) this.counters.set(metric, new Map());
    const m = this.counters.get(metric)!;
    m.set(label, (m.get(label) || 0) + 1);
  }

  observe(metric: string, value: number): void {
    if (!this.histograms.has(metric)) this.histograms.set(metric, []);
    this.histograms.get(metric)!.push(value);
  }

  circuitBreakerTrips = { inc: (svc: string) => this.inc("circuit_breaker_trips", svc) };
  oracleRequests = { inc: (svc: string) => this.inc("oracle_requests_total", svc) };
  oracleErrors = { inc: (svc: string) => this.inc("oracle_errors_total", svc) };
  oracleLatency = { observe: (svc: string, ms: number) => this.observe(`oracle_latency_${svc}`, ms) };

  toPrometheus(): string {
    let out = "";
    for (const [metric, labels] of this.counters) {
      for (const [label, val] of labels) {
        out += `${metric}{service="${label}"} ${val}\n`;
      }
    }
    for (const [metric, vals] of this.histograms) {
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const p99 = vals.sort((a, b) => a - b)[Math.floor(vals.length * 0.99)] || 0;
        out += `${metric}_avg ${avg.toFixed(2)}\n`;
        out += `${metric}_p99 ${p99.toFixed(2)}\n`;
        out += `${metric}_count ${vals.length}\n`;
      }
    }
    return out;
  }
}

const breaker = new CircuitBreaker(5, 30000);
const metrics = new SimpleMetrics();

// ═══════════════════════════════════════════════════════════════════════
// Retry wrapper with exponential backoff
// ═══════════════════════════════════════════════════════════════════════

async function withRetry<T>(
  service: string,
  fn: () => Promise<T>,
  fallback: T,
  maxRetries = 3
): Promise<{ result: T; fromFallback: boolean }> {
  if (!breaker.canExecute(service)) {
    console.warn(`[Oracle] ${service} circuit OPEN — using fallback`);
    metrics.oracleErrors.inc(service);
    return { result: fallback, fromFallback: true };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const result = await fn();
      breaker.recordSuccess(service);
      metrics.oracleRequests.inc(service);
      metrics.oracleLatency.observe(service, Date.now() - start);
      return { result, fromFallback: false };
    } catch (err) {
      console.error(`[Oracle] ${service} attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt === maxRetries) {
        breaker.recordFailure(service);
        metrics.oracleErrors.inc(service);
        return { result: fallback, fromFallback: true };
      }
      // Exponential backoff: 200ms, 400ms, 800ms
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
    }
  }
  return { result: fallback, fromFallback: true };
}

// ═══════════════════════════════════════════════════════════════════════
// Real API Connectors (production-ready stubs with sandbox URLs)
// ═══════════════════════════════════════════════════════════════════════

// GSTN Sandbox API connector
async function queryGSTN(gstin: string): Promise<{ valid: boolean; status: string }> {
  const sandboxUrl = process.env.GSTN_SANDBOX_URL || "https://apisandbox.gst.gov.in";
  const apiKey = process.env.GSTN_API_KEY;

  if (!apiKey) {
    // Local mock mode — deterministic responses for demo
    const isValid = !gstin.startsWith("FAKE") && gstin.length === 15;
    return { valid: isValid, status: isValid ? "Active" : "Cancelled" };
  }

  // Production: real GSTN sandbox call
  const resp = await fetch(`${sandboxUrl}/commonapi/v1.0/search?gstin=${gstin}`, {
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(5000), // 5s hard timeout
  });
  if (!resp.ok) throw new Error(`GSTN API ${resp.status}: ${resp.statusText}`);
  const data = await resp.json();
  return { valid: data.sts === "Active", status: data.sts || "Unknown" };
}

// NPCI NACH status connector
async function queryNPCI(accountNumber: string): Promise<{ isUnique: boolean; linkedCount: number }> {
  const apiUrl = process.env.NPCI_API_URL;
  const apiKey = process.env.NPCI_API_KEY;

  if (!apiKey) {
    // Local mock: "11111111" and "123456" are PMKVY-pattern duplicates
    const isDuplicate = accountNumber === "11111111" || accountNumber === "123456";
    return { isUnique: !isDuplicate, linkedCount: isDuplicate ? 23 : 1 };
  }

  const resp = await fetch(`${apiUrl}/nach/v1/account-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ account_number: accountNumber }),
    signal: AbortSignal.timeout(5000),
  });
  if (!resp.ok) throw new Error(`NPCI API ${resp.status}`);
  const data = await resp.json();
  return { isUnique: data.linked_beneficiaries <= 1, linkedCount: data.linked_beneficiaries };
}

// NIC Geotag verification connector
async function queryGeotagVerification(
  photoHash: string,
  lat: number,
  lng: number
): Promise<{ verified: boolean; duplicatesFound: number }> {
  const apiUrl = process.env.NIC_GEOTAG_API_URL;

  if (!apiUrl) {
    // Local mock: hashes starting with "DUP" are duplicates
    const isDup = photoHash.startsWith("DUP");
    return { verified: !isDup, duplicatesFound: isDup ? 3 : 0 };
  }

  const resp = await fetch(`${apiUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo_hash: photoHash, latitude: lat, longitude: lng }),
    signal: AbortSignal.timeout(10000), // geotag checks can be slow
  });
  if (!resp.ok) throw new Error(`NIC Geotag API ${resp.status}`);
  const data = await resp.json();
  return { verified: data.is_original, duplicatesFound: data.duplicate_count };
}

// ═══════════════════════════════════════════════════════════════════════
// Oracle API Endpoints (with circuit breaker + retry + fallback)
// ═══════════════════════════════════════════════════════════════════════

app.post("/oracle/gst", async (req, res) => {
  const { gstin } = req.body;
  if (!gstin) return res.status(400).json({ error: "gstin required" });

  const fallback = { valid: false, status: "CIRCUIT_OPEN_FALLBACK" };
  const { result, fromFallback } = await withRetry("gstn", () => queryGSTN(gstin), fallback);

  // Deterministic attestation hash — no Date.now() so on-chain re-verification is possible
  const attestationHash = ethers.keccak256(
    ethers.toUtf8Bytes(`gst:${gstin}:${result.valid}`)
  );

  res.json({
    gstin,
    valid: result.valid,
    status: result.status,
    fromFallback,
    circuitState: breaker.getStatus("gstn").state,
    timestamp: Date.now(),
    attestationHash,
  });
});

app.post("/oracle/bank-dedup", async (req, res) => {
  const { accountNumber, beneficiaryDid } = req.body;
  if (!accountNumber) return res.status(400).json({ error: "accountNumber required" });

  const fallback = { isUnique: false, linkedCount: -1 }; // safe default: flag as non-unique
  const { result, fromFallback } = await withRetry("npci", () => queryNPCI(accountNumber), fallback);

  // Deterministic attestation hash — no Date.now()
  const attestationHash = ethers.keccak256(
    ethers.toUtf8Bytes(`bank:${accountNumber}:${result.isUnique}`)
  );

  res.json({
    accountNumber: accountNumber.slice(0, 4) + "****",
    isUnique: result.isUnique,
    linkedDids: result.linkedCount,
    fromFallback,
    circuitState: breaker.getStatus("npci").state,
    timestamp: Date.now(),
    attestationHash,
  });
});

app.post("/oracle/geotag", async (req, res) => {
  const { photoHash, lat, lng } = req.body;
  if (!photoHash) return res.status(400).json({ error: "photoHash required" });

  const fallback = { verified: false, duplicatesFound: -1 };
  const { result, fromFallback } = await withRetry(
    "nic_geotag",
    () => queryGeotagVerification(photoHash, lat || 0, lng || 0),
    fallback
  );

  // Deterministic attestation hash — no Date.now()
  const attestationHash = ethers.keccak256(
    ethers.toUtf8Bytes(`geo:${photoHash}:${result.verified}`)
  );

  res.json({
    photoHash,
    isVerified: result.verified,
    duplicatesFound: result.duplicatesFound,
    fromFallback,
    circuitState: breaker.getStatus("nic_geotag").state,
    timestamp: Date.now(),
    attestationHash,
  });
});

// ═══════════════════════════════════════════════════════════════════════
// GAP #6: Prometheus metrics endpoint
// ═══════════════════════════════════════════════════════════════════════

app.get("/metrics", (_req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(metrics.toPrometheus());
});

// Health check with circuit breaker status
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "oracle-relayer",
    uptime: process.uptime(),
    circuits: {
      gstn: breaker.getStatus("gstn").state,
      npci: breaker.getStatus("npci").state,
      nic_geotag: breaker.getStatus("nic_geotag").state,
    },
  });
});

const PORT = process.env.ORACLE_PORT || 8082;
app.listen(PORT, () => {
  console.log(`Oracle Relayer listening on port ${PORT}`);
  console.log(`  GSTN: ${process.env.GSTN_API_KEY ? "LIVE" : "MOCK"}`);
  console.log(`  NPCI: ${process.env.NPCI_API_KEY ? "LIVE" : "MOCK"}`);
  console.log(`  Geotag: ${process.env.NIC_GEOTAG_API_URL ? "LIVE" : "MOCK"}`);
});
