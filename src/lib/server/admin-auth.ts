import crypto from "node:crypto";

const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] || "support.support49";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] || "support.support49";
const SESSION_SECRET =
  process.env["ADMIN_SESSION_SECRET"] ||
  "flowpaste_admin_sec_70eb9bf8_1bfc_4874_bd6a_4c6993e47b97";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSession {
  username: string;
  authenticatedAt: number;
  expiresAt: number;
}

/**
 * Validates admin credentials STRICTLY server-side.
 * Password is NEVER exposed, never returned, never saved to client.
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  if (!username || !password) return false;
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  const userBuf = crypto.createHash("sha256").update(cleanUser).digest();
  const expectedUserBuf = crypto.createHash("sha256").update(ADMIN_USERNAME).digest();

  const passBuf = crypto.createHash("sha256").update(cleanPass).digest();
  const expectedPassBuf = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();

  return (
    crypto.timingSafeEqual(userBuf, expectedUserBuf) &&
    crypto.timingSafeEqual(passBuf, expectedPassBuf)
  );
}

/**
 * Signs a tamper-proof session token: <base64Payload>.<hmacSignature>
 */
export function createSessionToken(username: string): string {
  const now = Date.now();
  const payload: AdminSession = {
    username,
    authenticatedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

/**
 * Validates a session token signature and expiration.
 */
export function verifySessionToken(token: string | null | undefined): AdminSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const encoded = parts[0];
  const signature = parts[1];

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload: AdminSession = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    );
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
