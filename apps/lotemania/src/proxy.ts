import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const PROTECTED_PREFIX = "/dashboard";
const ACCESS_COOKIE = "access_token";

export async function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = accessToken ? await verifyAccessToken(accessToken) : null;

  if (payload) {
    return NextResponse.next();
  }

  // Token de acesso presente mas inválido = sessão venceu (o JWT dura 15 min,
  // o cookie dura o mesmo que o refresh). Tenta renovar antes de expulsar.
  //
  // A renovação tem que ser por redirecionamento, não aqui dentro: o cookie
  // de refresh é escopado em `/api/auth` e nunca chega ao proxy. A rota de
  // lá renova e devolve o operador para o destino original.
  //
  // Só para navegação (GET). Num POST — Server Action — redirecionar
  // cancelaria a ação em vez de executá-la; nesses casos a requisição segue e
  // o requireUser() da própria action recusa, que é o comportamento de hoje.
  // A janela que sobra é estreita: aba parada por mais de 15 minutos e um
  // clique que não navega antes. Qualquer navegação renova por 15 min.
  if (accessToken && req.method === "GET") {
    const refreshUrl = new URL("/api/auth/refresh", req.url);
    refreshUrl.searchParams.set(
      "from",
      req.nextUrl.pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(refreshUrl);
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
