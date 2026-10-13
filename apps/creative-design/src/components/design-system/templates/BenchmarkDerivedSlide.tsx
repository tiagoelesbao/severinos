import React from 'react';
import { BrandingLogo } from '../atoms/BrandingLogo';
import { PremiumBackground } from '../molecules/PremiumBackground';

/**
 * TemplateSpec — DNA visual extraído de um benchmark pelo gerador
 * `generate_template_from_benchmark.py` (Frente A). É nível-template (constante
 * entre os slides); o conteúdo de cada slide continua vindo dos props per-slide.
 *
 * O componente é deliberadamente AGNÓSTICO de marca: cores/tipografia derivam
 * dos brand tokens do cliente (resolvidos no gerador e passados via spec.layout),
 * nunca das cores literais do benchmark de origem.
 */
export interface TemplateSpec {
  id?: string;
  /** Arquétipo de layout inferido do benchmark. */
  archetype?: 'dialog-box' | 'quote-card' | 'generic';
  source_benchmark?: string;
  layout?: {
    /** Estilo do card no arquétipo dialog-box. */
    cardStyle?: 'tweet' | 'note' | 'imessage';
    /** Fundo do card (resolvido para um tom claro on-brand). */
    cardBg?: string;
    /** Cor do texto dentro do card. */
    cardText?: string;
    cardRadius?: number;
    align?: 'left' | 'center';
    showAvatar?: boolean;
    showHandleRow?: boolean;
    verified?: boolean;
  };
  typography?: {
    /** Escala do corpo dentro do card. */
    bodyScale?: 'sm' | 'md' | 'lg' | 'xl';
  };
  decor?: {
    glow?: boolean;
    grain?: boolean;
  };
}

interface BenchmarkDerivedSlideProps {
  /** Spec do template gerado. Ausente → fallback genérico seguro. */
  templateSpec?: TemplateSpec;

  slideNumber?: number;
  totalSlides?: number;
  variant?: 'HOOK' | 'CONTENT' | 'IMAGE_FOCUS' | 'CTA';
  headline: string;
  subHeadline?: string;
  bodyText?: string;
  mainObjectImage?: string;
  accentColor?: string;

  /** Identidade do autor para o card dialog-box (tweet). */
  authorName?: string;
  authorHandle?: string;

  /** Overrides do Editor (px) — opcionais. */
  headlineFontSize?: number;
  bodyFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;

  /** Aceito por compat de props com os demais templates. */
  textMetrics?: Record<string, unknown>;

  /** Brand-agnostic signature + footer (MKT-MC4-04). */
  signatureHandle?: string;
  footerText?: string;

  /** Brand-agnostic palette (MKT-MC4-05). */
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

const BODY_SCALE_PX: Record<NonNullable<TemplateSpec['typography']>['bodyScale'] & string, number> = {
  sm: 36,
  md: 46,
  lg: 56,
  xl: 68,
};

/** Heurística de tamanho do corpo quando não há override nem escala explícita. */
const autoBodySize = (text: string) => {
  const len = (text || '').length;
  if (len < 60) return 64;
  if (len < 120) return 52;
  if (len < 200) return 42;
  return 34;
};

/** Avatar circular — usa imagem se houver, senão inicial sobre disco de acento. */
function Avatar({ image, accent, name }: { image?: string; accent: string; name: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="w-[88px] h-[88px] rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="w-[88px] h-[88px] rounded-full shrink-0 flex items-center justify-center text-[40px] font-black text-white"
      style={{ backgroundColor: accent }}
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </div>
  );
}

function VerifiedBadge({ color }: { color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill={color} aria-hidden className="shrink-0">
      <path d="M12 1l2.4 2.1 3.2-.3 1.3 2.9 2.9 1.3-.3 3.2L23.6 14 21.5 16.4l.3 3.2-2.9 1.3-1.3 2.9-3.2-.3L12 25.6 9.6 23.5l-3.2.3-1.3-2.9L2.2 19.6l.3-3.2L.4 14l2.1-2.4-.3-3.2 2.9-1.3L6.4 4.2l3.2.3L12 1z" />
      <path d="M10.6 15.6l-2.7-2.7 1.4-1.4 1.3 1.3 3.8-3.8 1.4 1.4-5.2 5.2z" fill="#fff" />
    </svg>
  );
}

/**
 * BenchmarkDerivedSlide — template genérico dirigido por `templateSpec`,
 * gerado a partir de um benchmark (Frente A). Suporta o arquétipo
 * `dialog-box` (card estilo tweet — exigido pela bench Hormozi "Value Carousel")
 * e um fallback genérico (headline + body centrados sobre fundo de marca).
 */
export const BenchmarkDerivedSlide: React.FC<BenchmarkDerivedSlideProps> = ({
  templateSpec,
  slideNumber = 1,
  totalSlides = 1,
  headline,
  subHeadline,
  bodyText,
  mainObjectImage,
  accentColor = '#FFB800',
  authorName,
  authorHandle,
  headlineFontSize,
  bodyFontSize,
  imageZoom,
  imagePosX,
  imagePosY,
  signatureHandle,
  footerText = '',
  primaryColor,
  secondaryColor,
  accentAlt,
  accentAurora,
}) => {
  const spec = templateSpec ?? {};
  const archetype = spec.archetype ?? 'generic';
  const layout = spec.layout ?? {};
  const decor = spec.decor ?? {};

  const handle = authorHandle || signatureHandle || '';
  const name = authorName || (handle ? handle.replace(/^@/, '') : 'Autor');

  const cardBg = layout.cardBg || '#F4F4F5';
  const cardText = layout.cardText || '#0B0B0F';
  const cardRadius = layout.cardRadius ?? 36;
  const showAvatar = layout.showAvatar ?? true;
  const showHandleRow = layout.showHandleRow ?? true;
  const verified = layout.verified ?? true;

  const bodyContent = bodyText || headline;
  const bodyPx = bodyFontSize
    ?? (spec.typography?.bodyScale ? BODY_SCALE_PX[spec.typography.bodyScale] : autoBodySize(bodyContent));

  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
  };

  // ── Arquétipo dialog-box: card estilo tweet sobre fundo de marca ──
  const renderDialogBox = () => (
    <div
      className="relative z-20 mx-[90px] shadow-2xl"
      style={{ backgroundColor: cardBg, color: cardText, borderRadius: cardRadius }}
    >
      <div className="px-[64px] py-[60px] flex flex-col">
        {showHandleRow && (
          <div className="flex items-center gap-5 mb-10">
            {showAvatar && <Avatar image={mainObjectImage} accent={accentColor} name={name} />}
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-[34px] font-black tracking-tight">{name}</span>
                {verified && <VerifiedBadge color="#1D9BF0" />}
              </div>
              {handle && <span className="text-[26px] opacity-50 font-medium">{handle}</span>}
            </div>
          </div>
        )}

        {subHeadline && (
          <span
            className="text-[20px] font-black tracking-[0.28em] uppercase mb-6"
            style={{ color: accentColor }}
          >
            {subHeadline}
          </span>
        )}

        <p
          className="font-bold leading-[1.25] tracking-tight"
          style={{ fontSize: `${headlineFontSize ?? bodyPx}px` }}
        >
          {bodyContent}
        </p>
      </div>
    </div>
  );

  // ── Fallback genérico: headline + body centrados ──
  const renderGeneric = () => (
    <div className="relative z-20 flex flex-col items-center text-center px-24">
      {handle ? (
        <span
          className="text-[22px] font-black tracking-[0.18em] uppercase"
          style={{ color: accentColor, opacity: 0.95 }}
        >
          {handle}
        </span>
      ) : (
        <BrandingLogo variant="v-star" color="white" size="md" />
      )}
      {subHeadline && (
        <span
          className="text-[14px] font-black tracking-[0.5em] uppercase mt-12"
          style={{ color: accentColor }}
        >
          {subHeadline}
        </span>
      )}
      <h1
        className="font-black uppercase leading-[1.05] tracking-tight max-w-[920px] mt-8"
        style={{ fontSize: `${headlineFontSize ?? 72}px` }}
      >
        {headline}
      </h1>
      <div className="h-[5px] w-28 rounded-full mt-14" style={{ backgroundColor: accentColor }} />
      {bodyText && (
        <p
          className="text-white/65 font-medium leading-snug max-w-[680px] mt-10"
          style={{ fontSize: `${bodyPx}px` }}
        >
          {bodyText}
        </p>
      )}
    </div>
  );

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col items-center justify-center font-sans bg-black text-white">
      {/* Fundo: foto full-bleed (genérico) ou gradiente de marca */}
      {mainObjectImage && archetype === 'generic' ? (
        <div className="absolute inset-0 z-0">
          <img src={mainObjectImage} alt="" className="w-full h-full object-cover" style={imgStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/90" />
        </div>
      ) : (
        <PremiumBackground
          theme="dark"
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
          accentAlt={accentAlt}
          accentAurora={accentAurora}
        />
      )}

      {decor.glow !== false && (
        <div
          className="absolute -bottom-[16%] -right-[12%] w-[540px] h-[540px] rounded-full blur-[170px] opacity-25 z-0"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {archetype === 'dialog-box' ? renderDialogBox() : renderGeneric()}

      {/* Chrome do carrossel: número do slide */}
      {totalSlides > 1 && (
        <div className="absolute top-12 right-14 z-20">
          <span className="text-[22px] font-black tracking-widest opacity-50">
            {slideNumber}/{totalSlides}
          </span>
        </div>
      )}

      {/* Rodapé brand-agnostic */}
      {footerText && (
        <div className="absolute bottom-12 z-20">
          <span className="text-xs tracking-[0.5em] uppercase opacity-30 font-black">
            {footerText}
          </span>
        </div>
      )}
    </div>
  );
};
