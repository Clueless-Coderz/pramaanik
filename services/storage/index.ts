import express from "express";
import multer from "multer";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── In-Memory Store (IPFS mock for local dev) ──────────────────────
const store = new Map<string, { data: Buffer; metadata: Record<string, string> }>();

// Upload document → returns CID (SHA-256 based content address)
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const cid = `Qm${hash.slice(0, 44)}`; // Mock CID format

  store.set(cid, {
    data: req.file.buffer,
    metadata: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: String(req.file.size),
      uploadedAt: new Date().toISOString(),
      sha256: hash,
    },
  });

  console.log(`[Storage] Uploaded ${req.file.originalname} → CID: ${cid}`);

  res.json({
    cid,
    sha256: hash,
    size: req.file.size,
    pinned: true,
  });
});

// Retrieve document by CID
app.get("/retrieve/:cid", (req, res) => {
  const { cid } = req.params;
  const entry = store.get(cid);

  if (!entry) return res.status(404).json({ error: "CID not found" });

  res.set("Content-Type", entry.metadata.mimetype || "application/octet-stream");
  res.set("X-SHA256", entry.metadata.sha256);
  res.send(entry.data);
});

// Verify hash of stored document
app.get("/verify/:cid", (req, res) => {
  const { cid } = req.params;
  const entry = store.get(cid);

  if (!entry) return res.status(404).json({ error: "CID not found" });

  const currentHash = crypto.createHash("sha256").update(entry.data).digest("hex");
  const intact = currentHash === entry.metadata.sha256;

  res.json({
    cid,
    sha256: currentHash,
    originalSha256: entry.metadata.sha256,
    intact,
    metadata: entry.metadata,
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "storage", documentsStored: store.size });
});

const PORT = process.env.STORAGE_PORT || 5001;
app.listen(PORT, () => {
  console.log(`Storage service listening on port ${PORT}`);
});
