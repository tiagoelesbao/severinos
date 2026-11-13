import { dezenaDoNumero, grupoDoNumero } from "./bicho";

const FONTE = "https://portalbrasil.net/jogodobicho/resultado-do-jogo-do-bicho/";

export type LinhaSorteio = {
  banca: string;
  extracao: string;
  data_sorteio: string;
  premio: number;
  numero: string;
  dezena: string;
  grupo: number;
};

const HORARIOS_DIVULGACAO: Record<string, [number, number]> = {
  PPT: [9, 20],
  PTM: [11, 20],
  PT: [14, 20],
  PTV: [16, 20],
  PTN: [18, 20],
  CORUJA: [21, 30],
};

export function dataDeHojeBR(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function atualizacaoDaFonte(html: string): { data: string; minutos: number } {
  const m = html.match(
    /Atualizado em\s*<strong>(\d{2})\/(\d{2})\/(\d{4})\s+às\s+(\d{1,2}):(\d{2})/i,
  );
  if (!m) throw new Error("A fonte não informou a data/horário da atualização");
  return {
    data: `${m[3]}-${m[2]}-${m[1]}`,
    minutos: Number(m[4]) * 60 + Number(m[5]),
  };
}

function extracaoJaAconteceu(extracao: string, agoraEmMinutos: number): boolean {
  const sigla = extracao.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  const horario = HORARIOS_DIVULGACAO[sigla];
  if (!horario) return false;
  return agoraEmMinutos >= horario[0] * 60 + horario[1];
}

function limparTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsearResultados(html: string, data: string): LinhaSorteio[] {
  const semScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const linhas: LinhaSorteio[] = [];
  const banca = "Rio de Janeiro";

  const trs = semScripts.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trs) {
    const tds = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(limparTexto);
    if (tds.length < 6) continue;
    const extracao = (tds[0] ?? "").replace(/\s*Somente.*$/i, "").trim();
    if (!extracao || /^extra/i.test(extracao)) continue;

    for (let premio = 1; premio <= 5; premio += 1) {
      const bruto = (tds[premio] ?? "").replace(/\D/g, "");
      if (bruto.length < 4) continue;
      const numero = bruto.slice(-4);
      linhas.push({
        banca,
        extracao,
        data_sorteio: data,
        premio,
        numero,
        dezena: dezenaDoNumero(numero),
        grupo: grupoDoNumero(numero),
      });
    }
  }
  return linhas;
}

export async function buscarResultadosDoSite(): Promise<LinhaSorteio[]> {
  const resposta = await fetch(FONTE, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!resposta.ok) {
    throw new Error(`Fonte respondeu ${resposta.status}`);
  }
  const html = await resposta.text();
  const { data: dataDaFonte, minutos } = atualizacaoDaFonte(html);
  // A página só é confiável quando está falando do dia de hoje (fuso de Brasília).
  if (dataDaFonte !== dataDeHojeBR()) return [];
  return parsearResultados(html, dataDaFonte).filter((linha) =>
    extracaoJaAconteceu(linha.extracao, minutos),
  );
}

export async function sincronizar(): Promise<{ total: number; data: string }> {
  const linhas = await buscarResultadosDoSite();
  const data = dataDeHojeBR();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: erroLimpeza } = await supabaseAdmin
    .from("sorteios")
    .delete()
    .eq("data_sorteio", data)
    .eq("banca", "Rio de Janeiro");
  if (erroLimpeza) throw new Error(erroLimpeza.message);

  if (linhas.length === 0) return { total: 0, data };

  const { error } = await supabaseAdmin
    .from("sorteios")
    .upsert(linhas, { onConflict: "banca,extracao,data_sorteio,premio" });
  if (error) throw new Error(error.message);

  return { total: linhas.length, data };
}
