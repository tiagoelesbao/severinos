import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sync-bicho")({
  server: {
    handlers: {
      POST: async () => {
        const { sincronizar } = await import("@/lib/sorteios.server");
        try {
          const resultado = await sincronizar();
          return new Response(JSON.stringify({ ok: true, ...resultado }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (erro) {
          console.error("Falha na sincronização agendada", erro);
          return new Response(JSON.stringify({ ok: false }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
