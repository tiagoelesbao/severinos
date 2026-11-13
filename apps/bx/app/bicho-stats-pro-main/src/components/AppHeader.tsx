import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function AppHeader() {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border/70 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🐅</span>
          <span className="font-display text-xl tracking-wide">Bicho Stats</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/estatisticas">
                  <BarChart3 className="size-4" />
                  Estatísticas
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/estrategias">
                  <GraduationCap className="size-4" />
                  Estratégias
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={sair}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
