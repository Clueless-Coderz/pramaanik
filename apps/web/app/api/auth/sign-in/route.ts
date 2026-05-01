/**
 * GET /api/auth/sign-in
 *
 * Generates a real Privado ID / iden3 Authorization Request using
 * @iden3/js-iden3-auth.  The returned JSON is exactly what the
 * Privado ID mobile wallet expects to scan as a QR code.
 *
 * Install deps:
 *   npm i @iden3/js-iden3-auth uuid
 *
 * Environment variables (add to .env.local):
 *   NEXT_PUBLIC_APP_URL=https://<your-ngrok-or-domain>
 *   PRIVADO_VERIFIER_DID=did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR
 *
 * The verifier DID above is Privado's own public demo DID — safe to use
 * for hackathon demos without running your own issuer node.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@iden3/js-iden3-auth";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// In-memory session store (replace with Redis / KV in production)
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __privadoSessionMap:
    | Map<string, { request: object; did?: string; verified: boolean }>
    | undefined;
}
if (!global.__privadoSessionMap) {
  global.__privadoSessionMap = new Map();
}
export const sessionMap = global.__privadoSessionMap;

// ---------------------------------------------------------------------------
// Role → human-readable reason shown in the wallet UI
// ---------------------------------------------------------------------------
const ROLE_REASONS: Record<string, string> = {
  admin: "PRAMAANIK – Treasury Admin portal access",
  auditor: "PRAMAANIK – CAG Auditor portal access",
  citizen: "PRAMAANIK – Public Audit portal access",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? uuidv4();
  const role = (searchParams.get("role") ?? "citizen") as string;

  // Base URL: use NEXT_PUBLIC_APP_URL in production, fallback to request host
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const callbackUrl = `${appUrl}/api/auth/callback?sessionId=${sessionId}`;

  // Verifier DID — use env var or fall back to Privado's public demo DID
  const verifierDid =
    process.env.PRIVADO_VERIFIER_DID ??
    "did:polygonid:polygon:amoy:2qQ68JkRcf3xrHPQPWZei3YeVzHPP58wYNxx2mEouR";

  const reason = ROLE_REASONS[role] ?? "PRAMAANIK – Identity verification";

  // ---------------------------------------------------------------------------
  // Build a BASIC auth request (no credential query needed — works without
  // an issuer node and without pre-issued credentials in the wallet)
  // ---------------------------------------------------------------------------
  const authRequest = auth.createAuthorizationRequest(reason, verifierDid, callbackUrl);

  // Attach a stable request ID so the wallet can correlate
  authRequest.id = sessionId;
  authRequest.thid = sessionId;

  // Store in session map so /callback can retrieve and verify against it
  sessionMap.set(sessionId, { request: authRequest, verified: false });

  return NextResponse.json(authRequest, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
