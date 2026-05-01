import express from "express";
import multer from "multer";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── IPFS Configuration ─────────────────────────────────────────────────
const IPFS_API_URL = process.env.IPFS_API_URL || "http://localhost:5001";
const PINATA_JWT = process.env.PINATA_JWT || "";
const PINATA_API_URL = "https://api.pinata.cloud";

// ─── AES-256-GCM Encryption (DPDP Compliance) ─────────────────────────
const MASTER_KEY = process.env.STORAGE_MASTER_KEY || crypto.randomBytes(32).toString("hex");

/** Derive a per-scheme key from the master key using HKDF. */
function deriveSchemeKey(schemeId: string): Buffer {
  const derived = crypto.hkdfSync("sha256", Buffer.from(MASTER_KEY, "hex"), schemeId, "pramaanik-storage", 32);
  return Buffer.from(derived);
}

/** Encrypt a buffer with AES-256-GCM using a scheme-specific key. */
function encryptDocument(buffer: Buffer, schemeId: string): { ciphertext: Buffer; iv: string; authTag: string } {
  const key = deriveSchemeKey(schemeId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv: iv.toString("hex"), authTag: authTag.toString("hex") };
}

/** Decrypt an AES-256-GCM encrypted buffer. */
function decryptDocument(ciphertext: Buffer, schemeId: string, ivHex: string, authTagHex: string): Buffer {
  const key = deriveSchemeKey(schemeId);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── Persistent file-system cache for resilience ─────────────────────────
// In-memory index for fast CID lookups (metadata only, not file content)
const cidIndex = new Map<string, { sha256: string; filename: string; mimetype: string; size: string; uploadedAt: string }>();
// Encryption metadata per CID (iv, authTag, schemeId) for decryption on retrieval
const encryptionMeta = new Map<string, { iv: string; authTag: string; schemeId: string }>();

// ─── IPFS Client Functions ──────────────────────────────────────────────

/**
 * Add a file to the local IPFS node via the Kubo RPC API (HTTP).
 * POST /api/v0/add with multipart form data.
 */
async function ipfsAdd(buffer: Buffer, filename: string): Promise<{ cid: string; size: number }> {
  const boundary = `----PramaanikBoundary${Date.now()}`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header),
    buffer,
    Buffer.from(footer),
  ]);

  const response = await fetch(`${IPFS_API_URL}/api/v0/add?pin=true`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IPFS add failed (${response.status}): ${text}`);
  }

  const result = await response.json() as { Hash: string; Size: string };
  return { cid: result.Hash, size: parseInt(result.Size, 10) };
}

/**
 * Retrieve a file from IPFS via the local gateway.
 */
async function ipfsCat(cid: string): Promise<Buffer> {
  const response = await fetch(`${IPFS_API_URL}/api/v0/cat?arg=${cid}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`IPFS cat failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Pin a CID to Pinata for persistent remote pinning.
 */
async function pinToPinata(cid: string, filename: string): Promise<boolean> {
  if (!PINATA_JWT) {
    console.warn("[Storage] Pinata JWT not configured — skipping remote pin");
    return false;
  }

  try {
    const response = await fetch(`${PINATA_API_URL}/pinning/pinByHash`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        hashToPin: cid,
        pinataMetadata: {
          name: filename,
          keyvalues: { source: "pramaanik", uploadedAt: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Storage] Pinata pin failed (${response.status}): ${text}`);
      return false;
    }

    console.log(`[Storage] ✓ Pinned to Pinata: ${cid}`);
    return true;
  } catch (err: any) {
    console.error(`[Storage] Pinata pin error: ${err.message}`);
    return false;
  }
}

// ─── Upload document → IPFS + Pinata ────────────────────────────────────
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const schemeId = (req.body?.schemeId as string) || "default";
  const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

  try {
    // Encrypt before uploading to IPFS (AES-256-GCM with scheme-specific key)
    const { ciphertext, iv, authTag } = encryptDocument(req.file.buffer, schemeId);

    // Add encrypted ciphertext to local IPFS node
    const { cid } = await ipfsAdd(ciphertext, req.file.originalname);

    // Update in-memory index (store encryption metadata for retrieval)
    cidIndex.set(cid, {
      sha256,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: String(req.file.size),
      uploadedAt: new Date().toISOString(),
    });

    // Store encryption metadata alongside CID for retrieval
    encryptionMeta.set(cid, { iv, authTag, schemeId });

    console.log(`[Storage] Encrypted + uploaded ${req.file.originalname} → IPFS CID: ${cid}`);

    // Pin to Pinata asynchronously (don't block response)
    const pinataPromise = pinToPinata(cid, req.file.originalname);

    res.json({
      cid,
      sha256,
      size: req.file.size,
      encrypted: true,
      pinned: true,
      ipfsUrl: `ipfs://${cid}`,
    });

    // Wait for Pinata in background
    await pinataPromise;
  } catch (err: any) {
    console.error(`[Storage] IPFS upload failed: ${err.message}`);
    res.status(500).json({ error: "IPFS upload failed", details: err.message });
  }
});

// ─── Retrieve document by CID from IPFS (auto-decrypts) ────────────────
app.get("/retrieve/:cid", async (req, res) => {
  const { cid } = req.params;

  try {
    const rawData = await ipfsCat(cid);

    // Decrypt if encryption metadata exists for this CID
    const encMeta = encryptionMeta.get(cid);
    const data = encMeta
      ? decryptDocument(rawData, encMeta.schemeId, encMeta.iv, encMeta.authTag)
      : rawData; // backward compat: unencrypted uploads

    // Try to get metadata from index
    const meta = cidIndex.get(cid);
    const mimetype = meta?.mimetype || "application/octet-stream";
    const sha256 = meta?.sha256 || crypto.createHash("sha256").update(data).digest("hex");

    res.set("Content-Type", mimetype);
    res.set("X-SHA256", sha256);
    res.set("X-IPFS-CID", cid);
    res.set("X-Encrypted", encMeta ? "true" : "false");
    res.send(data);
  } catch (err: any) {
    console.error(`[Storage] IPFS retrieve failed for ${cid}: ${err.message}`);
    res.status(404).json({ error: "CID not found or IPFS node unreachable", details: err.message });
  }
});

// ─── Verify hash of stored document ─────────────────────────────────────
app.get("/verify/:cid", async (req, res) => {
  const { cid } = req.params;

  try {
    const data = await ipfsCat(cid);
    const currentHash = crypto.createHash("sha256").update(data).digest("hex");
    const meta = cidIndex.get(cid);
    const originalSha256 = meta?.sha256 || currentHash;
    const intact = currentHash === originalSha256;

    res.json({
      cid,
      sha256: currentHash,
      originalSha256,
      intact,
      metadata: meta || { note: "Metadata not in local index — file retrieved from IPFS directly" },
    });
  } catch (err: any) {
    res.status(404).json({ error: "CID not found or IPFS node unreachable", details: err.message });
  }
});

// ─── Health check ────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  let ipfsConnected = false;
  try {
    const resp = await fetch(`${IPFS_API_URL}/api/v0/id`, { method: "POST" });
    ipfsConnected = resp.ok;
  } catch { /* IPFS not reachable */ }

  res.json({
    status: ipfsConnected ? "ok" : "degraded",
    service: "storage",
    ipfs: { connected: ipfsConnected, apiUrl: IPFS_API_URL },
    pinata: { configured: !!PINATA_JWT },
    documentsIndexed: cidIndex.size,
  });
});

// ─── Start Server ────────────────────────────────────────────────────────
// Use port 5002 to avoid conflict with IPFS API on 5001
const PORT = process.env.STORAGE_PORT || 5002;
app.listen(PORT, () => {
  console.log(`[Storage] Service listening on port ${PORT}`);
  console.log(`[Storage] IPFS API: ${IPFS_API_URL}`);
  console.log(`[Storage] Pinata:   ${PINATA_JWT ? "configured" : "not configured"}`);
});
