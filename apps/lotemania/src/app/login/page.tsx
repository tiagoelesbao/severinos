"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Não foi possível entrar.");
      return;
    }

    // Lido aqui, no handler, e nao via useSearchParams(): o hook obriga /login
    // a ter uma fronteira de Suspense acima dele, e o que a fronteira prerendera
    // e o fallback — o formulario inteiro sairia do HTML estatico e so apareceria
    // depois do JS carregar. O valor so e necessario neste instante, no submit.
    const from =
      new URLSearchParams(window.location.search).get("from") ?? "/dashboard/app";
    router.push(from);
    router.refresh();
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#0d1117] p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0d1117] shadow-2xl">
        <div className="hidden w-[360px] flex-col justify-center gap-6 rounded-2xl bg-[#171e2b] p-10 md:flex">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Olá, bem-vindo
            <br />
            de volta ao{" "}
            <span className="text-emerald-400">Lotemania</span>
          </h1>
          <div className="flex items-center justify-center py-8">
            <Crown className="size-24 text-amber-400/80" strokeWidth={1} />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-6 p-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Entrar</h2>
            <p className="text-sm text-slate-400">Insira seus dados abaixo.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-slate-300">
                Usuário
              </Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border-slate-700 bg-[#1b2435] text-white"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-slate-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-700 bg-[#1b2435] text-white"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              Lembrar
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {loading ? "Entrando..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
