import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type AccessTokenPayload = {
  sub: string;
  role: "admin" | "operator" | "affiliate" | "subscriber";
  tenantId: string;
};

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Opaque refresh tokens: the raw value goes to the client cookie, only
// its SHA-256 hash is stored server-side (DB leak doesn't expose usable
// tokens). Rotated on every use via rotateRefreshToken in session.ts.
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
