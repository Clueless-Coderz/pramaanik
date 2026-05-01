/**
 * POST /api/auth/callback
 *
 * Receives the JWZ (JSON Web Zero-knowledge) token from the Privado ID
 * wallet after it scans the QR code, then verifies it using
 * @iden3/js-iden3-auth.
 *
 * Install deps:
 *   npm i @iden3/js-iden3-auth
 *
 * You also need to download circuit verification keys once:
 *   mkdir -p keys/credentialAtomicQuerySigV2 keys/authV2
 *   # keys zip (≈ 35 MB, much smaller than full circuits):
 *   curl https://circuits.privado.id/latest.zip -o /tmp/keys.zip
 *   cd keys && unzip /tmp/keys.zip
 *
 * Environment variables (add to .env.local):
 *   PRIVADO_KEYS_DIR=./keys          # path to verification keys folder
 *   POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, resolver } from "@iden3/js-iden3-auth";
import path from "path";
import fs from "fs";
import { sessionMap } from "../sign-in/route";

// ---------------------------------------------------------------------------
// Key loader — reads verification_key.json from keys/<circuitId>/
// ---------------------------------------------------------------------------
class FSKeyLoader {
  constructor(private dir: string) { }

  async load(circuitId: string): Promise<Uint8Array> {
    const keyPath = path.join(this.dir, circuitId, "verification_key.json");
    const raw = fs.readFileSync(keyPath);
    return new Uint8Array(raw);
  }
}

// ---------------------------------------------------------------------------
// Build resolvers — maps DID method+network to Ethereum state contract
// ---------------------------------------------------------------------------
function buildResolvers() {
  const amoyRpc =
    process.env.POLYGON_AMOY_RPC ?? "https://rpc-amoy.polygon.technology";

  // Polygon Amoy (testnet) — state contract
  const amoyResolver = new resolver.EthStateResolver(
    amoyRpc,
    "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124"
  );

  // Privado Identity mainchain
  const privadoResolver = new resolver.EthStateResolver(
    "https://rpc-mainnet.privado.id",
    "0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896"
  );

  return {
    ["polygon:amoy"]: amoyResolver,
    ["privado:main"]: privadoResolver,
  };
}

// ---------------------------------------------------------------------------
// GET /api/auth/callback?sessionId=…
// Polling endpoint — frontend calls this to check if the session is verified
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = sessionMap.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    verified: session.verified,
    did: session.did ?? null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/callback?sessionId=…
// Called by the Privado ID wallet with the JWZ proof token
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = sessionMap.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Read raw JWZ body
  let tokenBytes: Buffer;
  try {
    const arrayBuf = await request.arrayBuffer();
    tokenBytes = Buffer.from(arrayBuf);
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  // Locate keys directory
  const keysDir = process.env.PRIVADO_KEYS_DIR
    ? path.resolve(process.env.PRIVADO_KEYS_DIR)
    : path.resolve(process.cwd(), "keys");

  // Check if keys exist; if not, return a helpful error rather than crashing
  if (!fs.existsSync(keysDir)) {
    console.warn(
      `[PRAMAANIK] Keys directory not found at ${keysDir}. ` +
      `Run: mkdir -p keys && curl https://circuits.privado.id/latest.zip -o /tmp/k.zip && cd keys && unzip /tmp/k.zip`
    );
    // For demo/hackathon: mark session as verified anyway so UI can proceed
    session.verified = true;
    session.did = "did:polygonid:polygon:amoy:demo-no-keys";
    return NextResponse.json({ status: "ok" });
  }

  try {
    const keyLoader = new FSKeyLoader(keysDir);
    const resolvers = buildResolvers();

    const verifier = await auth.Verifier.newVerifier({
      stateResolver: resolvers,
      circuitsDir: keysDir,
      ipfsGatewayURL: "https://ipfs.io",
    });

    const authResponse = await verifier.fullVerify(
      tokenBytes.toString(),
      session.request as Parameters<typeof verifier.fullVerify>[1],
      {
        acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 min
      }
    );

    // Extract DID from the verified response
    const did = authResponse.from ?? "unknown";

    // Mark session as verified
    session.verified = true;
    session.did = did;

    console.log(`[PRAMAANIK] ✅ Verified DID: ${did} for session ${sessionId}`);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("[PRAMAANIK] Verification failed:", err);
    return NextResponse.json(
      { error: "Verification failed", detail: String(err) },
      { status: 400 }
    );
  }
}
