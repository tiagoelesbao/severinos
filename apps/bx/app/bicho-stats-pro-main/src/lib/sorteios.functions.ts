import { createServerFn } from "@tanstack/react-start";

export const sincronizarResultados = createServerFn({ method: "POST" }).handler(async () => {
  const { sincronizar } = await import("./sorteios.server");
  try {
    const resultado = await sincronizar();
    return { ok: true as const, ...resultado };
  } catch (erro) {
    console.error("Falha ao sincronizar resultados", erro);
    return { ok: false as const, total: 0, data: "", erro: "Não foi possível ler a fonte agora." };
  }
});
