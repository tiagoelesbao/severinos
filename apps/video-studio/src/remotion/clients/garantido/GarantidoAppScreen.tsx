import React from "react";
import { FONT_SANS } from "../../fonts";
import { lerp, mulberry32, windowProgress } from "../easing";
import {
  BANNER_BG_DEEP,
  BANNER_BG_MID,
  CELL_LIVRE_A,
  CELL_LIVRE_B,
  CELL_PAGO,
  CELL_RESERVADO,
  DK,
  GOLD_DEEP,
  GOLD_LIGHT,
  GRAY_BAR,
  GREEN_DEEP,
  GREEN_MID,
  INK,
  INK_3,
  NEON_PINK,
  YELLOW_PILL,
} from "./palette";

/**
 * Recriação da tela do app Garantido Prêmios — 2ª passada (2026-10-09),
 * conferida CÉLULA A CÉLULA contra o print real
 * `apps/garantido-premios-lp/v2/tela-app-garantido.png` depois que o founder
 * rejeitou a 1ª versão por não ser "idêntica ao print". Ordem das seções
 * (de cima pra baixo) é a mesma do print, não inventada:
 * header → banner do prêmio → título/subtítulo → barra "Meus títulos" →
 * linha de preço → barra "Prêmios" → pílulas de status → linha de
 * quantidade → grade de dezenas. O "Escolha seu número" da 1ª versão não
 * existe no print real — removido.
 *
 * `mgFrame` é o frame local ao bloco do celular (0 = início do bloco, já
 * depois da transição de entrada) — toda a animação da tela é função pura
 * dele.
 */

const COLS = 7;
const CELL_GAP = 3;
const CELL_H = 30;
const VISIBLE_ROWS = 8; // recorte (56 células) — o resto esfuma no rodapé

// Padrão determinístico de dezenas já "pagas" — mulberry32 (mesmo PRNG do
// `easing.ts`), restrito à faixa visível (0-55) pra nunca escolher uma
// célula que não existe na tela (bug real da 1ª versão: duas das 4 picks
// caíam fora do recorte visível e nunca apareciam).
const PAGO_SEED = mulberry32(11);
const PAGO: Set<number> = (() => {
  const s = new Set<number>();
  while (s.size < 13) s.add(Math.floor(PAGO_SEED() * (COLS * VISIBLE_ROWS)));
  return s;
})();

// As 4 dezenas que a ANIMAÇÃO escolhe, em sequência — todas dentro do
// recorte visível (0-55).
const PICKS = [9, 23, 38, 51];
const PICK_START = 46;
const PICK_STAGGER = 22;
const PICK_DUR = 18;

function cellNumbersGrid(): number[] {
  return Array.from({ length: COLS * VISIBLE_ROWS }, (_, i) => i);
}

/**
 * Fundo do banner: luzes de palco/cassino desfocadas (dourado quente sobre
 * roxo-escuro), não um gradiente plano — é o que o print real mostra atrás
 * do numeral. Puro CSS (camadas de radial-gradient), estático de propósito:
 * é o retrato de uma cena, não um elemento que deveria "respirar".
 */
const BANNER_LIGHTS: React.CSSProperties["background"] = [
  "radial-gradient(circle at 16% 18%, rgba(246,217,152,.55), rgba(246,217,152,0) 34%)",
  "radial-gradient(circle at 86% 12%, rgba(227,167,62,.48), rgba(227,167,62,0) 30%)",
  "radial-gradient(circle at 74% 64%, rgba(255,255,255,.14), rgba(255,255,255,0) 24%)",
  "radial-gradient(circle at 28% 86%, rgba(154,106,22,.55), rgba(154,106,22,0) 42%)",
  `radial-gradient(ellipse 100% 70% at 50% 4%, ${BANNER_BG_MID}, rgba(13,6,32,0) 60%)`,
  `linear-gradient(175deg, #140a08 0%, ${BANNER_BG_DEEP} 55%, #05030a 100%)`,
].join(", ");

const PrizeBanner: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const p = windowProgress(mgFrame, 0, 18);
  const glow = 0.55 + 0.25 * Math.sin(mgFrame / 22);

  return (
    <div style={{ position: "relative", flex: "0 0 auto", overflow: "hidden", background: BANNER_LIGHTS }}>
      {/* raios de luz sutis cruzando o banner — eco do "palco" do print */}
      <div
        style={{
          position: "absolute",
          inset: "-20% -10%",
          background:
            "repeating-linear-gradient(100deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 2px, transparent 2px, transparent 18px)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* tag "Adquira já" */}
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          top: 8,
          left: 8,
          background: GREEN_MID,
          color: "#fff",
          fontFamily: FONT_SANS,
          fontWeight: 800,
          fontSize: 6.5,
          letterSpacing: 0.3,
          borderRadius: 4,
          padding: "3px 7px",
          transform: "rotate(-2deg)",
          textTransform: "uppercase",
        }}
      >
        Adquira já
      </div>

      <div style={{ position: "relative", padding: "16px 10px 12px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 800,
            fontSize: 9,
            letterSpacing: 4,
            color: NEON_PINK,
            opacity: 0.92,
            textTransform: "uppercase",
            textShadow: `0 0 10px rgba(255,63,196,.7)`,
          }}
        >
          » Valendo «
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 900,
            fontSize: 36,
            lineHeight: 1,
            marginTop: 3,
            color: GOLD_LIGHT,
            letterSpacing: -0.5,
            opacity: p,
            transform: `scale(${lerp(0.92, 1, p)})`,
            textShadow: `0 0 ${18 + glow * 10}px rgba(227,167,62,${0.55 + glow * 0.2}), 0 2px 0 ${GOLD_DEEP}`,
          }}
        >
          R$800,00
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
          <div
            style={{
              background: YELLOW_PILL,
              color: "#3a2d02",
              fontFamily: FONT_SANS,
              fontWeight: 800,
              fontSize: 7,
              borderRadius: 999,
              padding: "3px 9px",
              boxShadow: "0 2px 6px rgba(0,0,0,.35)",
            }}
          >
            1º LUGAR R$250,00
          </div>
          <div
            style={{
              background: "rgba(255,255,255,.16)",
              border: "1px solid rgba(255,255,255,.3)",
              color: "#fff",
              fontFamily: FONT_SANS,
              fontWeight: 800,
              fontSize: 7,
              borderRadius: 999,
              padding: "3px 9px",
            }}
          >
            2º LUGAR R$150,00
          </div>
        </div>
      </div>
    </div>
  );
};

const TitleBlock: React.FC = () => (
  <div style={{ flex: "0 0 auto", background: "#fff", padding: "8px 10px 7px" }}>
    <div style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 10, lineHeight: 1.22, color: INK }}>
      01° - RAPIDINHA VALENDO R$800,00 EM 6 PRÊMIOS!!!
    </div>
    <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 6.5, letterSpacing: 0.6, color: INK_3, marginTop: 2, textTransform: "uppercase" }}>
      Resultado pelo jogo do bicho
    </div>
  </div>
);

const TituloBar: React.FC = () => (
  <div style={{ flex: "0 0 auto", background: DK, padding: "6px 10px", textAlign: "center" }}>
    <span style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 8, color: "#fff", letterSpacing: 0.3 }}>
      🛒 Meus títulos
    </span>
  </div>
);

const PriceRow: React.FC = () => (
  <div style={{ flex: "0 0 auto", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px" }}>
    <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 8, color: INK_3 }}>Por apenas</span>
    <span
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 800,
        fontSize: 9,
        color: "#fff",
        background: INK,
        borderRadius: 5,
        padding: "3px 10px",
      }}
    >
      R$ 11,00
    </span>
  </div>
);

const PrizesBar: React.FC = () => (
  <div style={{ flex: "0 0 auto", background: GRAY_BAR, padding: "6px 10px" }}>
    <span style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 8, color: INK }}>🏆 Prêmios</span>
  </div>
);

const StatusPills: React.FC<{ picked: number }> = ({ picked }) => {
  const livres = 100 - PAGO.size - picked;
  return (
    <div style={{ flex: "0 0 auto", display: "flex", gap: 4, padding: "7px 9px 0" }}>
      <div style={pillStyle("#eef2ef", INK)}>{livres} Livres</div>
      <div style={pillStyle(YELLOW_PILL, "#3a2d02")}>{picked} Reservados</div>
      <div style={pillStyle(GREEN_MID, "#fff")}>{PAGO.size} Pagos</div>
    </div>
  );
};

function pillStyle(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    background: bg,
    color,
    fontFamily: FONT_SANS,
    fontWeight: 800,
    fontSize: 6.5,
    letterSpacing: 0.2,
    borderRadius: 5,
    padding: "4px 2px",
    textAlign: "center",
  };
}

const QtyRow: React.FC = () => (
  <div style={{ flex: "0 0 auto", display: "flex", gap: 5, alignItems: "center", padding: "7px 9px" }}>
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        border: "1px solid #d6dfd8",
        borderRadius: 6,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <span style={{ width: 16, height: 18, display: "grid", placeItems: "center", fontSize: 10, color: INK_3 }}>−</span>
      <span style={{ width: 22, height: 18, display: "grid", placeItems: "center", fontFamily: FONT_SANS, fontWeight: 800, fontSize: 9, color: INK, background: "#f3f6f3" }}>1</span>
      <span style={{ width: 16, height: 18, display: "grid", placeItems: "center", fontSize: 10, color: INK_3 }}>+</span>
    </div>
    <div
      style={{
        flex: "1 1 auto",
        height: 20,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DEEP})`,
        fontFamily: FONT_SANS,
        fontWeight: 800,
        fontSize: 7.5,
        letterSpacing: 0.5,
        color: "#fff",
        textTransform: "uppercase",
      }}
    >
      ⤭ +1 Aleatório
    </div>
  </div>
);

const NumberGrid: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const cells = cellNumbersGrid();

  return (
    <div
      style={{
        position: "relative",
        flex: "1 1 auto",
        minHeight: 0,
        background: "#fff",
        padding: "6px 9px 0",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: CELL_GAP,
        }}
      >
        {cells.map((n) => {
          const pickIndex = PICKS.indexOf(n);
          const isPago = PAGO.has(n);
          let bg = `linear-gradient(170deg, ${CELL_LIVRE_A}, ${CELL_LIVRE_B})`;
          let color = "#fff";
          let scale = 1;
          let ring = 0;

          if (isPago && pickIndex < 0) {
            bg = CELL_PAGO;
            color = "rgba(255,255,255,.65)";
          }

          if (pickIndex >= 0) {
            const start = PICK_START + pickIndex * PICK_STAGGER;
            if (mgFrame >= start) {
              const p = windowProgress(mgFrame, start, PICK_DUR);
              const bump = Math.sin(Math.PI * Math.min(p, 1));
              scale = 1 + 0.32 * bump;
              bg = CELL_RESERVADO;
              color = "#3a2d02";
              ring = Math.max(bump, p >= 1 ? 0.3 : 0);
            }
          }

          return (
            <div
              key={n}
              style={{
                position: "relative",
                height: CELL_H,
                borderRadius: 5,
                display: "grid",
                placeItems: "center",
                fontFamily: FONT_SANS,
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: -0.2,
                color,
                background: bg,
                transform: `scale(${scale})`,
                boxShadow:
                  ring > 0
                    ? `0 0 0 ${2 + ring * 4}px rgba(243,217,60,${0.2 + ring * 0.4}), inset 0 -1px 0 rgba(0,0,0,.14)`
                    : "inset 0 -1px 0 rgba(0,0,0,.14)",
              }}
            >
              {String(n).padStart(2, "0")}
            </div>
          );
        })}
      </div>

      {/* esfumaçado no pé — sinaliza "tem mais pra rolar" sem mais células */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          background: "linear-gradient(180deg, rgba(255,255,255,0), #fff 78%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

const AppHeader: React.FC = () => (
  <div
    style={{
      flex: "0 0 auto",
      background: DK,
      padding: "14px 10px 7px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(55,227,50,.2)",
    }}
  >
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontFamily: FONT_SANS, fontWeight: 900, fontSize: 10, color: "#fff", letterSpacing: 0.5 }}>GARANTIDO</div>
      <div style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 7, color: "#37e332", letterSpacing: 1.5, marginTop: 1 }}>PRÊMIOS</div>
    </div>
    <div style={{ display: "grid", gap: 2.5 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ display: "block", width: 11, height: 1.5, borderRadius: 1, background: "#5d7266" }} />
      ))}
    </div>
  </div>
);

export const GarantidoAppScreen: React.FC<{ mgFrame: number }> = ({ mgFrame }) => {
  const picked = PICKS.filter((_, i) => mgFrame >= PICK_START + i * PICK_STAGGER + 2).length;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <AppHeader />
      <PrizeBanner mgFrame={mgFrame} />
      <TitleBlock />
      <TituloBar />
      <PriceRow />
      <PrizesBar />
      <StatusPills picked={picked} />
      <QtyRow />
      <NumberGrid mgFrame={mgFrame} />
    </div>
  );
};
