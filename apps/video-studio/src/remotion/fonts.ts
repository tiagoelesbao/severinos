/**
 * Registro das fontes (auto-hospedadas, subset latin em base64) via FontFace
 * API. Zero fetch externo → funcionam no Player do navegador (mesmo com adblock)
 * E no render offline, sem CDN nem dependência de publicDir. delayRender faz o
 * render esperar as fontes antes do 1º frame.
 *
 * Metadados (id/label/family) vivem em fontChoices.ts (puro, usado pela UI).
 * Regenerar os base64: `node scripts/regen-fonts.mjs`.
 */
import { continueRender, delayRender } from "remotion";
import { FONT_CHOICES } from "./fontChoices";
import {
  MONTSERRAT_WOFF2,
  PLAYFAIR_WOFF2,
  ANTON_WOFF2,
  BEBASNEUE_WOFF2,
  INTER_WOFF2,
  POPPINS_WOFF2,
} from "./fontData";

export { fontFamilyById } from "./fontChoices";
export const FONT_SANS = "Montserrat";
export const FONT_SERIF = "Playfair Display";

// binário por id (fora dos metadados puros pra não pesar a UI).
const DATA: Record<string, string> = {
  montserrat: MONTSERRAT_WOFF2,
  playfair: PLAYFAIR_WOFF2,
  anton: ANTON_WOFF2,
  bebasneue: BEBASNEUE_WOFF2,
  inter: INTER_WOFF2,
  poppins: POPPINS_WOFF2,
};

/**
 * A aba do RENDER se distingue da do usuário por este global, que o renderer da
 * Remotion injeta antes de avaliar o bundle (é dele que sai o prazo do delayRender).
 */
const ABA_DE_RENDER =
  typeof window !== "undefined" &&
  typeof (window as unknown as { remotion_puppeteerTimeout?: number }).remotion_puppeteerTimeout === "number";

const registradas = new Set<string>();

/**
 * Registra as faces pedidas (idempotente; seguro em SSR — sai sem document).
 *
 * POR QUE NÃO REGISTRAR TUDO NO RENDER: a Remotion recarrega a aba dezenas de vezes
 * num export longo, e cada recarga repetia as SEIS faces (~190KB em base64 cada),
 * com um `delayRender` por face. Bastava UMA dessas centenas de promessas não fechar
 * para o job inteiro morrer aos 180s — e era o que acontecia com todo export acima de
 * ~3 minutos. Na aba do usuário continua valendo o registro completo: o seletor de
 * fontes desenha cada opção na própria família.
 */
function registerFonts(families?: string[]): void {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;

  const alvo = families
    ? FONT_CHOICES.filter((f) => families.includes(f.family))
    : FONT_CHOICES;

  for (const { id, family } of alvo) {
    const data = DATA[id];
    if (!data) continue;
    if (registradas.has(family)) continue;
    registradas.add(family);
    let exists = false;
    document.fonts.forEach((f) => {
      if (f.family === family) exists = true;
    });
    if (exists) continue;

    // ORDEM IMPORTA. O guarda-chuva (timer) é armado ANTES de qualquer coisa que possa
    // lançar: se `new FontFace(...)` estourasse — data: URI grande, memória apertada —,
    // o handle ficaria aberto sem nenhum caminho de liberação, e o job inteiro morreria
    // 180s depois com "delayRender was called but not cleared". Foi o que derrubou dois
    // exports longos; os curtos só não notavam porque terminavam antes do timeout.
    //
    // O segundo caso que o `catch` não cobre: `face.load()` sobre um data: URI de ~188KB
    // pode ficar PENDENTE no Chrome headless — não resolve nem rejeita. Daí o timer.
    // Perder a fonte customizada (cai no fallback do CSS) é infinitamente melhor que
    // perder o export.
    const handle = delayRender(`fonte-${family}`);
    let liberado = false;
    const liberar = (via: string) => {
      if (liberado) return;
      liberado = true;
      // Fica no log do job (`onBrowserLog` em render-export.ts): quando um export
      // morre por fonte, a via de liberação é a primeira pergunta.
      console.log(`[fonte] ${family} liberada via ${via}`);
      try { continueRender(handle); } catch { /* handle já encerrado */ }
    };
    const limite = setTimeout(() => liberar("timer 10s"), 10000);

    try {
      const face = new FontFace(family, `url(data:font/woff2;base64,${data}) format("woff2")`, {
        weight: "100 900",
        style: "normal",
        display: "block",
      });
      face
        .load()
        .then((loaded) => {
          document.fonts.add(loaded);
          clearTimeout(limite);
          liberar("load()");
        })
        .catch(() => {
          clearTimeout(limite);
          liberar("load() rejeitou");
        });
      // Terceiro caminho de liberação: `document.fonts.ready` fecha quando o navegador
      // termina o ciclo de carregamento de fontes, mesmo que a promessa da face
      // individual não fale mais. Três saídas independentes para o mesmo handle.
      document.fonts.ready.then(() => liberar("fonts.ready")).catch(() => liberar("fonts.ready rejeitou"));
    } catch {
      clearTimeout(limite);
      liberar("FontFace lançou");
    }
  }
}

/**
 * Garante que as famílias pedidas estejam registradas NESTA aba. Chamar no corpo da
 * composição (não em efeito): o `delayRender` de dentro precisa existir antes do
 * primeiro frame ser capturado.
 */
export function ensureFonts(families: (string | undefined | null)[]): void {
  const lista = [...new Set(families.filter(Boolean) as string[])];
  if (lista.length) registerFonts(lista);
}

// Aba do usuário: tudo de uma vez (o seletor de fontes precisa das faces).
// Aba do render: nada aqui — cada composição pede as suas com `ensureFonts`.
if (!ABA_DE_RENDER) registerFonts();
