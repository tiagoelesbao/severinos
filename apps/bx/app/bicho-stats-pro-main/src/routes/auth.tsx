import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Bicho Stats" },
      {
        name: "description",
        content: "Acesse sua conta para ver estatísticas completas do jogo do bicho.",
      },
      { property: "og:title", content: "Entrar — Bicho Stats" },
      {
        property: "og:description",
        content: "Acesse sua conta para ver estatísticas completas do jogo do bicho.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (sessao) navigate({ to: "/estatisticas", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/estatisticas", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: "/estatisticas", replace: true });
  }

  async function entrarComGoogle() {
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (resultado.error) {
      toast.error("Falha no login com Google");
    }
  }


  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <Card className="cartao-sombra">
          <CardHeader>
            <CardTitle className="text-2xl">Acesso de assinantes</CardTitle>
            <CardDescription>
              Entre com o e-mail e a senha que você recebeu para ver as estatísticas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={entrar}>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={carregando}>
                Entrar
              </Button>
            </form>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
              Continuar com Google
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              O acesso é liberado manualmente. Fale com o suporte para assinar.
            </p>
          </CardContent>

        </Card>
      </main>
    </div>
  );
}
