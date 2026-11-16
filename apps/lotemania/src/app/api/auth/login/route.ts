import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { username, password, deviceId } = parsed.data;

  // Single-field login like the original: no "empresa" selector needed
  // while there's one operator per login identity. Once multiple tenants
  // share overlapping usernames this resolves by subdomain instead.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  // Same generic message whether the username doesn't exist or the
  // password is wrong — avoids leaking which accounts are registered.
  if (!user || user.status !== "active" || !user.passwordHash) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos." },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos." },
      { status: 401 },
    );
  }

  await createSession(
    { id: user.id, role: user.role, tenantId: user.tenantId },
    { deviceId, userAgent: req.headers.get("user-agent") ?? undefined },
  );

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  });
}
