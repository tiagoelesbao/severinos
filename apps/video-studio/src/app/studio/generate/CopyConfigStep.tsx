"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FONT_CHOICES } from "@/remotion/fontChoices";

/**
 * Passo "Configurar copy" (pedido do founder 2026-10-18, depois de notar que
 * as 3 variações de um teste saíram com a MESMA headline): campos pra copy
 * por variação + assets compartilhados (tela do celular, pílulas) ANTES de
 * gerar — em vez de depender de defaults cravados no template. Pular mantém
 * os defaults (ver generate.ts) — nada aqui é obrigatório.
 *
 * Seleção de hooks (2026-10-18, founder: "travado em 3, quero escolher menos
 * ou mais"): checkbox por hook_pack — desmarcar reduz a geração, o pool do
 * template (video-templates.yaml) decide o teto de quantas dá pra escolher.
 *
 * Legenda automática + posição do ranking (2026-10-19, founder: "o motor de
 * legendar vídeo automático pronto... o ranking tem que ir pra cima ou
 * abaixo da legenda... devo ter a opção de aplicar parâmetros em todas as
 * variações ou configurar cada uma"): bloco GLOBAL (vale pra todas) +
 * checkbox "personalizar" por variação que abre o MESMO bloco escopado só
 * pra ela — desmarcar (ou o botão "aplicar a todas") volta a herdar o
 * global. `perVariantOverrides` só carrega as variações que o usuário
 * efetivamente customizou; as demais seguem usando os campos globais.
 */

export type HeadlineShape =
  | { kind: "simple"; defaultText: string; defaultHighlight: string }
  | { kind: "two-line"; defaultLine1: string; defaultLine2Words: string[]; defaultHighlightWord: string };

export interface ConfigurableAssets {
  phoneScreen?: { label: string; defaultFile: string };
  tags?: { label: string; defaults: { title: string; sub: string }[] };
  rankingItems?: { label: string; defaults: { position: string; value: string }[] };
  rankingHeadline?: { label: string; defaultText: string };
  blendType?: { label: string; options: { value: "suave" | "dura"; label: string }[]; defaultValue: "suave" | "dura" };
  contentMode?: { label: string; options: { value: "video" | "imagem"; label: string }[]; defaultValue: "video" | "imagem" };
  centerHeadline?: { label: string; defaultValue: boolean };
  splitCopyText?: { label: string; defaultText: string };
  splitButtonLabel?: { label: string; defaultText: string };
  rankingPosition?: { label: string; options: { value: "top" | "bottom"; label: string }[]; defaultValue: "top" | "bottom" };
  captions?: { label: string; defaultEnabled: boolean; rendererOptions: { value: string; label: string }[]; defaultRenderer: string };
}

interface HookPackInfo {
  id: string;
  label: string;
}

export interface HeadlineOverride {
  headlineText?: string;
  headlineHighlight?: string;
  headlineLine1?: string;
  headlineLine2Words?: string[];
  headlineHighlightWord?: string;
}

/** Campos que podem ser GLOBAIS (uma vez, valem pra todas) ou customizados
 * por variação (ver `perVariantOverrides`) — 2026-10-19. */
export interface RankingCaptionValues {
  rankingPosition: "top" | "bottom";
  captionsEnabled: boolean;
  captionRenderer: string;
  captionLines: 1 | 2;
  captionWordByWord: boolean;
  captionHighlight: boolean;
  captionFontFamily: string; // "" = default do estilo
}

export interface CopyConfigResult {
  headlineByHook: Record<string, HeadlineOverride>;
  phoneScreenFile?: string;
  tags?: { title: string; sub: string }[];
  rankingItems?: { position: string; value: string }[];
  rankingHeadlineText?: string;
  blendType?: "suave" | "dura";
  contentMode?: "video" | "imagem";
  centerHeadlineEnabled?: boolean;
  splitCopyText?: string;
  splitButtonLabel?: string;
  rankingPosition?: "top" | "bottom";
  captionsEnabled?: boolean;
  captionRenderer?: string;
  captionLines?: 1 | 2;
  captionWordByWord?: boolean;
  captionHighlight?: boolean;
  captionFontFamily?: string;
  /** Só as variações que o usuário customizou individualmente — as demais
   * usam os campos globais acima (rankingPosition/captions*). */
  perVariantOverrides?: Record<string, Partial<RankingCaptionValues>>;
  selectedHookIds: string[];
}

interface Props {
  sessionId: string;
  hookPacks: HookPackInfo[];
  headline: HeadlineShape;
  configurableAssets: ConfigurableAssets | null;
  busy: boolean;
  error: string | null;
  onConfirm: (result: CopyConfigResult) => void;
  onSkip: (selectedHookIds: string[]) => void;
  onBack: () => void;
}

function headlineToFields(headline: HeadlineShape) {
  if (headline.kind === "simple") {
    return { text: headline.defaultText, highlight: headline.defaultHighlight, line1: "", line2: "", highlightWord: "" };
  }
  return {
    text: "",
    highlight: "",
    line1: headline.defaultLine1,
    line2: headline.defaultLine2Words.join(" "),
    highlightWord: headline.defaultHighlightWord,
  };
}

/** Bloco de controles de ranking/legenda — usado tanto no painel GLOBAL
 * quanto (escopado) dentro de cada hook personalizado. Evita duplicar ~60
 * linhas de JSX 2x. */
function RankingCaptionFields({
  configurableAssets,
  values,
  onChange,
  idPrefix,
}: {
  configurableAssets: ConfigurableAssets;
  values: RankingCaptionValues;
  onChange: (patch: Partial<RankingCaptionValues>) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {configurableAssets.rankingPosition && (
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          {configurableAssets.rankingPosition.label}
          <select
            value={values.rankingPosition}
            onChange={(e) => onChange({ rankingPosition: e.target.value as "top" | "bottom" })}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
          >
            {configurableAssets.rankingPosition.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {configurableAssets.captions && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={values.captionsEnabled}
              onChange={(e) => onChange({ captionsEnabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            {configurableAssets.captions.label}
          </label>
          {values.captionsEnabled && (
            <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-500">
                Estilo
                <select
                  value={values.captionRenderer}
                  onChange={(e) => onChange({ captionRenderer: e.target.value })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {configurableAssets.captions.rendererOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-500">
                Fonte
                <select
                  value={values.captionFontFamily}
                  onChange={(e) => onChange({ captionFontFamily: e.target.value })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  <option value="">Padrão do estilo</option>
                  {FONT_CHOICES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-500">
                Linhas por bloco
                <select
                  value={values.captionLines}
                  onChange={(e) => onChange({ captionLines: Number(e.target.value) as 1 | 2 })}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  <option value={1}>1 linha</option>
                  <option value={2}>2 linhas</option>
                </select>
              </label>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={values.captionWordByWord}
                    onChange={(e) => onChange({ captionWordByWord: e.target.checked })}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  Palavra por vez (karaokê)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={values.captionHighlight}
                    onChange={(e) => onChange({ captionHighlight: e.target.checked })}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  Destacar a palavra falada
                </label>
              </div>
            </div>
          )}
        </div>
      )}
      <span className="sr-only">{idPrefix}</span>
    </div>
  );
}

export default function CopyConfigStep({
  sessionId,
  hookPacks,
  headline,
  configurableAssets,
  busy,
  error,
  onConfirm,
  onSkip,
  onBack,
}: Props) {
  const initial = useMemo(() => headlineToFields(headline), [headline]);

  const [perHook, setPerHook] = useState<Record<string, ReturnType<typeof headlineToFields>>>(() =>
    Object.fromEntries(hookPacks.map((h) => [h.id, { ...initial }])),
  );

  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(() => new Set(hookPacks.map((h) => h.id)));
  const toggleHook = useCallback((hookId: string) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(hookId)) next.delete(hookId);
      else next.add(hookId);
      return next;
    });
  }, []);

  const [phoneScreenFile, setPhoneScreenFile] = useState<string | null>(null);
  const [phoneScreenUploading, setPhoneScreenUploading] = useState(false);
  const [phoneScreenError, setPhoneScreenError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<{ title: string; sub: string }[]>(() => configurableAssets?.tags?.defaults.map((t) => ({ ...t })) ?? []);
  const [rankingItems, setRankingItems] = useState<{ position: string; value: string }[]>(
    () => configurableAssets?.rankingItems?.defaults.map((r) => ({ ...r })) ?? [],
  );
  const [rankingHeadlineText, setRankingHeadlineText] = useState(() => configurableAssets?.rankingHeadline?.defaultText ?? "");
  const [blendType, setBlendType] = useState<"suave" | "dura">(() => configurableAssets?.blendType?.defaultValue ?? "dura");
  const [contentMode, setContentMode] = useState<"video" | "imagem">(() => configurableAssets?.contentMode?.defaultValue ?? "video");
  const [centerHeadlineEnabled, setCenterHeadlineEnabled] = useState(() => configurableAssets?.centerHeadline?.defaultValue ?? false);
  const [splitCopyText, setSplitCopyText] = useState(() => configurableAssets?.splitCopyText?.defaultText ?? "");
  const [splitButtonLabel, setSplitButtonLabel] = useState(() => configurableAssets?.splitButtonLabel?.defaultText ?? "");

  // Ranking/legenda — GLOBAL (default) + por variação (2026-10-19).
  const [globalRC, setGlobalRC] = useState<RankingCaptionValues>(() => ({
    rankingPosition: configurableAssets?.rankingPosition?.defaultValue ?? "bottom",
    captionsEnabled: configurableAssets?.captions?.defaultEnabled ?? false,
    captionRenderer: configurableAssets?.captions?.defaultRenderer ?? "clean",
    captionLines: 2,
    captionWordByWord: false,
    captionHighlight: true,
    captionFontFamily: "",
  }));
  const [perHookRC, setPerHookRC] = useState<Record<string, RankingCaptionValues>>({});
  const customizedHookIds = useMemo(() => new Set(Object.keys(perHookRC)), [perHookRC]);

  const toggleCustomizeHook = useCallback(
    (hookId: string) => {
      setPerHookRC((prev) => {
        if (prev[hookId]) {
          const { [hookId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [hookId]: { ...globalRC } };
      });
    },
    [globalRC],
  );
  const updateHookRC = useCallback((hookId: string, patch: Partial<RankingCaptionValues>) => {
    setPerHookRC((prev) => (prev[hookId] ? { ...prev, [hookId]: { ...prev[hookId], ...patch } } : prev));
  }, []);
  const resetAllToGeneral = useCallback(() => setPerHookRC({}), []);

  const addRankingItem = useCallback(() => {
    setRankingItems((prev) => [...prev, { position: `${prev.length + 1}º lugar`, value: "" }]);
  }, []);
  const removeRankingItem = useCallback((index: number) => {
    setRankingItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateHook = useCallback((hookId: string, patch: Partial<ReturnType<typeof headlineToFields>>) => {
    setPerHook((prev) => ({ ...prev, [hookId]: { ...prev[hookId], ...patch } }));
  }, []);

  const uploadPhoneScreen = useCallback(
    async (file: File) => {
      setPhoneScreenUploading(true);
      setPhoneScreenError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("sessionId", sessionId);
        form.append("kind", "phone-screen");
        const res = await fetch("/api/generate/upload-asset", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "falha no upload");
        setPhoneScreenFile(data.file);
      } catch (err) {
        setPhoneScreenError(err instanceof Error ? err.message : String(err));
      } finally {
        setPhoneScreenUploading(false);
      }
    },
    [sessionId],
  );

  const selectedHookIds = useMemo(() => hookPacks.filter((h) => selectedHooks.has(h.id)).map((h) => h.id), [hookPacks, selectedHooks]);

  const confirm = useCallback(() => {
    const headlineByHook: Record<string, HeadlineOverride> = {};
    for (const h of hookPacks) {
      if (!selectedHooks.has(h.id)) continue;
      const f = perHook[h.id];
      headlineByHook[h.id] =
        headline.kind === "simple"
          ? { headlineText: f.text, headlineHighlight: f.highlight }
          : {
              headlineLine1: f.line1,
              headlineLine2Words: f.line2.split(/\s+/).filter(Boolean),
              headlineHighlightWord: f.highlightWord,
            };
    }
    const hasRankingOrCaptions = Boolean(configurableAssets?.rankingPosition || configurableAssets?.captions);
    onConfirm({
      headlineByHook,
      phoneScreenFile: phoneScreenFile ?? undefined,
      tags: configurableAssets?.tags ? tags : undefined,
      rankingItems: configurableAssets?.rankingItems ? rankingItems : undefined,
      rankingHeadlineText: configurableAssets?.rankingHeadline ? rankingHeadlineText : undefined,
      blendType: configurableAssets?.blendType ? blendType : undefined,
      contentMode: configurableAssets?.contentMode ? contentMode : undefined,
      centerHeadlineEnabled: configurableAssets?.centerHeadline ? centerHeadlineEnabled : undefined,
      splitCopyText: configurableAssets?.splitCopyText ? splitCopyText : undefined,
      splitButtonLabel: configurableAssets?.splitButtonLabel ? splitButtonLabel : undefined,
      rankingPosition: hasRankingOrCaptions ? globalRC.rankingPosition : undefined,
      captionsEnabled: hasRankingOrCaptions ? globalRC.captionsEnabled : undefined,
      captionRenderer: hasRankingOrCaptions ? globalRC.captionRenderer : undefined,
      captionLines: hasRankingOrCaptions ? globalRC.captionLines : undefined,
      captionWordByWord: hasRankingOrCaptions ? globalRC.captionWordByWord : undefined,
      captionHighlight: hasRankingOrCaptions ? globalRC.captionHighlight : undefined,
      captionFontFamily: hasRankingOrCaptions && globalRC.captionFontFamily ? globalRC.captionFontFamily : undefined,
      perVariantOverrides: Object.keys(perHookRC).length > 0 ? perHookRC : undefined,
      selectedHookIds,
    });
  }, [
    hookPacks,
    selectedHooks,
    perHook,
    headline,
    phoneScreenFile,
    tags,
    rankingItems,
    rankingHeadlineText,
    blendType,
    contentMode,
    centerHeadlineEnabled,
    splitCopyText,
    splitButtonLabel,
    globalRC,
    perHookRC,
    configurableAssets,
    selectedHookIds,
    onConfirm,
  ]);

  const hasSplitOptions =
    configurableAssets?.blendType ||
    configurableAssets?.contentMode ||
    configurableAssets?.centerHeadline ||
    configurableAssets?.splitCopyText ||
    configurableAssets?.splitButtonLabel;

  const hasRankingCaptionOptions = configurableAssets?.rankingPosition || configurableAssets?.captions;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">Configurar copy</h2>
      <p className="mb-1 text-sm text-neutral-500">
        Cada variação pode ter uma headline diferente — abaixo é onde você escreve a copy de cada uma, em vez de
        deixar o template repetir a mesma. Os campos abaixo da lista valem pra todas as variações (descrevem o
        produto, não o hook). Tudo é opcional — pular mantém a copy padrão do template.
      </p>
      <p className="mb-6 text-sm text-neutral-500">
        Desmarque pra gerar menos variações, ou marque mais do pool abaixo pra gerar mais —{" "}
        <span className="text-neutral-300">{selectedHookIds.length} de {hookPacks.length} selecionada(s)</span>.
      </p>

      <div className="flex flex-col gap-4">
        {hookPacks.map((h) => {
          const f = perHook[h.id];
          const checked = selectedHooks.has(h.id);
          const isCustomized = customizedHookIds.has(h.id);
          return (
            <div
              key={h.id}
              className={`rounded-xl border p-4 transition ${checked ? "border-neutral-800 bg-neutral-900" : "border-neutral-900 bg-neutral-950/60 opacity-50"}`}
            >
              <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-400">
                <input type="checkbox" checked={checked} onChange={() => toggleHook(h.id)} className="h-4 w-4 accent-emerald-500" />
                {h.label}
              </label>
              {!checked ? null : headline.kind === "simple" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-500">
                    Headline
                    <input
                      value={f.text}
                      onChange={(e) => updateHook(h.id, { text: e.target.value })}
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-500">
                    Palavra em destaque
                    <input
                      value={f.highlight}
                      onChange={(e) => updateHook(h.id, { highlight: e.target.value })}
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs text-neutral-500">
                    Linha 1
                    <input
                      value={f.line1}
                      onChange={(e) => updateHook(h.id, { line1: e.target.value })}
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-500">
                    Linha 2
                    <input
                      value={f.line2}
                      onChange={(e) => updateHook(h.id, { line2: e.target.value })}
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-neutral-500">
                    Palavra em destaque (da linha 2)
                    <input
                      value={f.highlightWord}
                      onChange={(e) => updateHook(h.id, { highlightWord: e.target.value })}
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                    />
                  </label>
                </div>
              )}

              {checked && hasRankingCaptionOptions && (
                <div className="mt-4 border-t border-neutral-800 pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={isCustomized}
                      onChange={() => toggleCustomizeHook(h.id)}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    Personalizar ranking/legenda só pra esta variação (padrão: usa a config geral abaixo)
                  </label>
                  {isCustomized && (
                    <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/10 p-3">
                      <RankingCaptionFields
                        configurableAssets={configurableAssets!}
                        values={perHookRC[h.id]}
                        onChange={(patch) => updateHookRC(h.id, patch)}
                        idPrefix={h.id}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {configurableAssets?.phoneScreen && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 text-sm font-semibold text-neutral-300">{configurableAssets.phoneScreen.label}</div>
          <p className="mb-3 text-xs text-neutral-500">
            Padrão: {configurableAssets.phoneScreen.defaultFile.split("/").pop()}. Suba uma imagem pra usar outra tela.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={phoneScreenUploading}
              className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium hover:bg-neutral-700 disabled:opacity-50"
            >
              {phoneScreenUploading ? "Enviando…" : phoneScreenFile ? "Trocar imagem" : "Escolher imagem"}
            </button>
            {phoneScreenFile && <span className="text-xs text-emerald-400">{phoneScreenFile}</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoneScreen(f);
              }}
            />
          </div>
          {phoneScreenError && <p className="mt-2 text-xs text-red-400">{phoneScreenError}</p>}
        </div>
      )}

      {configurableAssets?.tags && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-3 text-sm font-semibold text-neutral-300">{configurableAssets.tags.label}</div>
          <div className="flex flex-col gap-3">
            {tags.map((tag, i) => (
              <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-500">
                  Título
                  <input
                    value={tag.title}
                    onChange={(e) => setTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, title: e.target.value } : t)))}
                    className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-500">
                  Subtexto
                  <input
                    value={tag.sub}
                    onChange={(e) => setTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, sub: e.target.value } : t)))}
                    className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {(configurableAssets?.rankingItems || configurableAssets?.rankingHeadline) && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          {configurableAssets.rankingHeadline && (
            <label className="mb-4 flex flex-col gap-1 text-xs text-neutral-500">
              {configurableAssets.rankingHeadline.label}
              <input
                value={rankingHeadlineText}
                onChange={(e) => setRankingHeadlineText(e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          )}
          {configurableAssets.rankingItems && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-300">{configurableAssets.rankingItems.label}</div>
                <button
                  onClick={addRankingItem}
                  className="rounded-md bg-neutral-800 px-3 py-1 text-xs font-medium hover:bg-neutral-700"
                >
                  + Adicionar posição
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {rankingItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      Posição
                      <input
                        value={item.position}
                        onChange={(e) =>
                          setRankingItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, position: e.target.value } : r)))
                        }
                        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      Valor/Prêmio
                      <input
                        value={item.value}
                        onChange={(e) =>
                          setRankingItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                        }
                        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                      />
                    </label>
                    <button
                      onClick={() => removeRankingItem(i)}
                      disabled={rankingItems.length <= 1}
                      className="rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-800 disabled:opacity-30"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {hasRankingCaptionOptions && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-300">Ranking e legenda (geral — vale pra todas as variações)</div>
            {customizedHookIds.size > 0 && (
              <button
                onClick={resetAllToGeneral}
                className="rounded-md bg-neutral-800 px-3 py-1 text-xs font-medium hover:bg-neutral-700"
                title="Remove a personalização individual de todas as variações — todas voltam a usar esta config geral"
              >
                Aplicar config geral a todas ({customizedHookIds.size} personalizada{customizedHookIds.size > 1 ? "s" : ""})
              </button>
            )}
          </div>
          <RankingCaptionFields configurableAssets={configurableAssets!} values={globalRC} onChange={(patch) => setGlobalRC((prev) => ({ ...prev, ...patch }))} idPrefix="global" />
        </div>
      )}

      {hasSplitOptions && (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-3 text-sm font-semibold text-neutral-300">Opções da Tela Dividida</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {configurableAssets?.blendType && (
              <label className="flex flex-col gap-1 text-xs text-neutral-500">
                {configurableAssets.blendType.label}
                <select
                  value={blendType}
                  onChange={(e) => setBlendType(e.target.value as "suave" | "dura")}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {configurableAssets.blendType.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {configurableAssets?.contentMode && (
              <label className="flex flex-col gap-1 text-xs text-neutral-500">
                {configurableAssets.contentMode.label}
                <select
                  value={contentMode}
                  onChange={(e) => setContentMode(e.target.value as "video" | "imagem")}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {configurableAssets.contentMode.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {configurableAssets?.centerHeadline && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={centerHeadlineEnabled}
                onChange={(e) => setCenterHeadlineEnabled(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              {configurableAssets.centerHeadline.label}
            </label>
          )}
          {configurableAssets?.splitCopyText && (
            <label className="mt-4 flex flex-col gap-1 text-xs text-neutral-500">
              {configurableAssets.splitCopyText.label}
              <input
                value={splitCopyText}
                onChange={(e) => setSplitCopyText(e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          )}
          {configurableAssets?.splitButtonLabel && (
            <label className="mt-4 flex flex-col gap-1 text-xs text-neutral-500">
              {configurableAssets.splitButtonLabel.label}
              <input
                value={splitButtonLabel}
                onChange={(e) => setSplitButtonLabel(e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={confirm}
          disabled={busy || selectedHookIds.length === 0}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? "Gerando…" : `Gerar ${selectedHookIds.length} variação(ões) com essa copy`}
        </button>
        <button
          onClick={() => onSkip(selectedHookIds)}
          disabled={busy || selectedHookIds.length === 0}
          className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
        >
          Pular copy (usar padrões do template)
        </button>
        <button onClick={onBack} disabled={busy} className="text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-50">
          ← Trocar template
        </button>
      </div>
      {selectedHookIds.length === 0 && <p className="mt-4 text-sm text-amber-400">Selecione pelo menos 1 variação pra gerar.</p>}
      {busy && hasRankingCaptionOptions && globalRC.captionsEnabled && (
        <p className="mt-4 text-sm text-neutral-500">
          Se a legenda automática estiver ligada, a 1ª geração da sessão transcreve o áudio antes de renderizar
          (leva um pouco mais — é cacheado, as próximas gerações desta sessão são rápidas).
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </section>
  );
}
