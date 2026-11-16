import { cookies } from "next/headers";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  type AccessTokenPayload,
} from "./jwt";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

// Issues a fresh access+refresh pair, persists the refresh token's hash,
// and sets both as httpOnly cookies. The refresh cookie is scoped to
// /api/auth so it is never sent on ordinary page/API requests.
export async function createSession(
  user: { id: string; role: AccessTokenPayload["role"]; tenantId: string },
  context: { deviceId?: string; userAgent?: string },
) {
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });
  const refreshToken = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    deviceId: context.deviceId,
    userAgent: context.userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

// Validates the refresh cookie against the DB, rotates it (old row
// revoked, new row inserted), and issues a new access token. Returns
// null if the refresh token is missing, expired, or already revoked —
// which also catches reuse of a stolen/rotated-out token.
export async function rotateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const tokenHash = hashRefreshToken(refreshToken);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)),
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) return false;

  const [user] = await db
    .select({ id: users.id, role: users.role, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user) return false;

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, row.id));

  await createSession(user, {
    deviceId: row.deviceId ?? undefined,
    userAgent: row.userAgent ?? undefined,
  });
  return true;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)));
  }
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete({ name: REFRESH_COOKIE, path: "/api/auth" });
}

export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  return verifyAccessToken(accessToken);
}
