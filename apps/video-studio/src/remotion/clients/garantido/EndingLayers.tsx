import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { ensureFonts, FONT_SANS } from "../../fonts";
import { PhoneMockup, type PhoneTag } from "./PhoneMockup";
import { Headline, CtaButtonPill, CtaSubtitle, PhoneBlockBg, PHONE_FRAMES, type HeadlineCopy } from "./GarantidoAds";

const DEFAULT_PHONE_SCREEN_FILE = "garantido/tela-app-garantido.png";

/**
 * Decomposição do "motion final de celular" do Garantido em CAMADAS
 * separadas e exportáveis — pedido do founder 2026-10-18: "sobre o motion
 * do celular quero cada camada editável... remover o celular manualmente,
 * criar elementos como notificação, editar copy, remover, mudar fundo".
 *
 * Técnica: reaproveita o MESMO container flex (paddingTop:410, gap:36,
 * coluna, centro) de `PhoneBlock` em GarantidoAds.tsx — mas em vez de
 * renderizar os 3 elementos juntos, cada composição aqui deixa 2 deles com
 * `opacity:0` (NUNCA `display:none`, que mudaria o layout) e só o alvo
 * visível. Isso garante que headline/telefone/CTA saem na MESMA posição
 * exata da peça original, sem precisar recalcular layout manualmente — o
 * telefone e o CTA viram PNG de quadro cheio (1080×1920, fundo
 * transparente) prontos pra entrar como elemento de imagem no editor, já
 * na posição certa (x:50%, y:50%, escala 100% = cobre o quadro, zero
 * crop/matemática extra).
 *
 * `GarantidoEndingBg` é a exceção: é o FUNDO (opaco, com movimento próprio
 * — glow derivando, grão, vinheta), vira o clipe 2 da timeline no editor
 * (não uma camada extra), porque ele é quem dá a duração/backbone do
 * encerramento.
 */

// Frame "assentado": depois do tremor de entrada do telefone (24), das 2
// FloatingTag (entram em 62 e 128, levam +20f pra assentar = 148) e do
// bounce do CTA (118+12=130) — todo mundo já parado, nenhuma entrada
// pela metade.
export const STILL_FRAME = 150;

const DEFAULT_HEADLINE: HeadlineCopy = {
  line1: "A ESPERA ACABA RÁPIDO.",
  line2Words: ["O PAGAMENTO", "TAMBÉM."],
  highlightWord: "TAMBÉM.",
};

const HiddenSlot: React.FC<{ visible: boolean; children: React.ReactNode }> = ({ visible, children }) => (
  <div style={{ opacity: visible ? 1 : 0 }}>{children}</div>
);

const LayerContainer: React.FC<{
  headlineCopy: HeadlineCopy;
  mgFrame: number;
  show: "headline" | "phone" | "ctaButton" | "ctaSubtitle";
  phoneScreenFile?: string;
  tags?: PhoneTag[];
}> = ({ headlineCopy, mgFrame, show, phoneScreenFile, tags }) => (
  <AbsoluteFill
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 410,
      gap: 36,
    }}
  >
    <HiddenSlot visible={show === "headline"}>
      <Headline mgFrame={mgFrame} copy={headlineCopy} />
    </HiddenSlot>
    <HiddenSlot visible={show === "phone"}>
      <PhoneMockup mgFrame={mgFrame} width={332} tags={tags}>
        <Img
          src={staticFile(phoneScreenFile || DEFAULT_PHONE_SCREEN_FILE)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
        />
      </PhoneMockup>
    </HiddenSlot>
    {/* Botão e subtítulo ficam no MESMO flex column gap:10 da peça original
        (CtaButton composto) mesmo isolados — senão o subtítulo "flutua" sem
        o espaçamento de 10px que tinha quando estava junto do botão. */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <HiddenSlot visible={show === "ctaButton"}>
        <CtaButtonPill mgFrame={mgFrame} />
      </HiddenSlot>
      <HiddenSlot visible={show === "ctaSubtitle"}>
        <CtaSubtitle mgFrame={mgFrame} />
      </HiddenSlot>
    </div>
  </AbsoluteFill>
);

export interface EndingLayerProps {
  headlineCopy?: HeadlineCopy;
  /** Tela do celular e copy das pílulas — só lidas por GarantidoEndingPhone
   * (as demais ignoram, mas aceitam o mesmo shape de props por uniformidade
   * já que render-server.mjs manda o mesmo inputProps pras 4 composições). */
  phoneScreenFile?: string;
  tags?: PhoneTag[];
}

const PhoneBlockBgFrame: React.FC = () => {
  const frame = useCurrentFrame();
  return <PhoneBlockBg mgFrame={frame} />;
};

/** Fundo isolado — opaco, É o clipe 2 da timeline (backbone + duração). */
export const GarantidoEndingBg: React.FC = () => (
  <AbsoluteFill>
    <PhoneBlockBgFrame />
  </AbsoluteFill>
);

/** Telefone isolado — still (frame fixo, pós-entrada+pós-2ª tag), fundo transparente. */
export const GarantidoEndingPhone: React.FC<EndingLayerProps> = ({ headlineCopy, phoneScreenFile, tags }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <LayerContainer
        headlineCopy={headlineCopy ?? DEFAULT_HEADLINE}
        mgFrame={STILL_FRAME}
        show="phone"
        phoneScreenFile={phoneScreenFile}
        tags={tags}
      />
    </AbsoluteFill>
  );
};

/** Headline (copy superior, com palavra-chave destacada) isolada — still, fundo transparente. */
export const GarantidoEndingHeadline: React.FC<EndingLayerProps> = ({ headlineCopy }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <LayerContainer headlineCopy={headlineCopy ?? DEFAULT_HEADLINE} mgFrame={STILL_FRAME} show="headline" />
    </AbsoluteFill>
  );
};

/** Botão do CTA isolado (sem o subtítulo — ver GarantidoEndingCtaSubtitle) — still, fundo transparente. */
export const GarantidoEndingCta: React.FC<EndingLayerProps> = ({ headlineCopy }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <LayerContainer headlineCopy={headlineCopy ?? DEFAULT_HEADLINE} mgFrame={STILL_FRAME} show="ctaButton" />
    </AbsoluteFill>
  );
};

/** Subtítulo "Garantido Prêmios" isolado — elemento próprio, removível/editável
 * sem mexer no botão (pedido do founder 2026-10-18). Still, fundo transparente. */
export const GarantidoEndingCtaSubtitle: React.FC<EndingLayerProps> = ({ headlineCopy }) => {
  ensureFonts([FONT_SANS]);
  return (
    <AbsoluteFill>
      <LayerContainer headlineCopy={headlineCopy ?? DEFAULT_HEADLINE} mgFrame={STILL_FRAME} show="ctaSubtitle" />
    </AbsoluteFill>
  );
};

export { PHONE_FRAMES };
