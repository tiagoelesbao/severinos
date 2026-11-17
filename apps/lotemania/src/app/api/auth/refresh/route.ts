import { NextRequest, NextResponse } from "next/server";
import { rotateSession } from "@/lib/auth/session";

const ACCESS_COOKIE = "access_token";

// Único lugar do app que enxerga o cookie de refresh: ele é escopado em
// `path: "/api/auth"` de propósito, para não trafegar em requisição comum.
// É por isso que a renovação precisa passar por aqui e não pode acontecer
// dentro do proxy, que nunca recebe esse cookie.

export async function POST() {
  const ok = await rotateSession();
  if (!ok) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

// Variante de navegação: o proxy redireciona para cá quando o token de
// acesso venceu, renova, e devolve o operador para onde ele estava indo.
// Sem isto, toda sessão morria 15 minutos depois do login com um refresh
// token de 30 dias intacto no cookie ao lado, que nada usava.
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("from");

  // Guarda de redirecionamento aberto: só aceita caminho interno do painel.
  // `from` vem da URL, então é entrada não confiável mesmo tendo sido posta
  // ali pelo nosso próprio proxy.
  const destination =
    requested && requested.startsWith("/dashboard/") ? requested : "/dashboard/app";

  const ok = await rotateSession();

  if (!ok) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", destination);
    const response = NextResponse.redirect(loginUrl);
    // Apaga o cookie de acesso vencido. Sem isto o proxy continuaria vendo um
    // cookie, mandando para cá de novo e só então para o login — um salto
    // inútil em toda visita até a pessoa entrar outra vez.
    response.cookies.delete(ACCESS_COOKIE);
    return response;
  }

  return NextResponse.redirect(new URL(destination, req.url));
}
