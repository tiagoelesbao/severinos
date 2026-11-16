import { getCurrentUser } from "./session";
import type { AccessTokenPayload } from "./jwt";

// Defense-in-depth check inside Server Actions/Route Handlers, on top of
// the middleware's cookie check — never trust the client-side route alone.
export async function requireUser(): Promise<AccessTokenPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }
  return user;
}

export async function requireAdmin(): Promise<AccessTokenPayload> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Permissão negada.");
  }
  return user;
}
