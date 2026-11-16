"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TrimStep, { type TrimResult } from "./TrimStep";
import CopyConfigStep, { type CopyConfigResult, type HeadlineShape, type ConfigurableAssets } from "./CopyConfigStep";

/**
 * Fluxo "Gerar variações" (pedido do founder 2026-10-18): upload do
 * vídeo-fonte → escolher template → o backend gera 1 variação por hook do
 * template → galeria pra escolher/baixar/refinar. Reaproveita o padrão já
 * provado de job assíncrono (spawn + status.json + polling) do resto do
 * video-studio — ver src/app/api/generate/*.
 *
 * Botão "Editar" (2026-10-18): monta um criativo real (Materiais Brutos +
 * studio-edit.json, ver lib/generateEditorBridge.ts) e abre no editor
 * principal (`/studio`). O clipe do TAKE vira 100% editável (corte, câmera,
 * volume) e as legendas de abertura viram elementos de texto de verdade.
 * O encerramento de marca depende do template (`decomposedEnding` em
 * generate.ts): nos que têm decomposição (Garantido) cada elemento do
 * motion final (fundo, telefone, CTA) vira camada própria, independente —
 * mover/escalar/remover cada uma; nos demais (Império, por ora) é clipe
 * único "queimado" (editável como bloco, não camada por camada).
 *
 * Seleção de cliente (2026-10-18): cada cliente tem seu catálogo de
 * templates — esse passo filtra o catálogo antes do upload, não é só
 * cosmético (o template "template 1 garantido" só aparece pra quem
 * escolheu Garantido Prêmios aqui).
 *
 * Corte/reenquadramento (2026-10-18): passo entre upload e template — corta
 * um trecho (ou vídeo inteiro) e reenquadra dentro do quadro vertical antes
 * de seguir pro motor de template. Sobrescreve o `source.*` da sessão via
 * POST /api/generate/trim (ver TrimStep.tsx pra UI, a rota pro ffmpeg).
 *
 * Configurar copy (2026-10-18, achado do founder: "3 copys iguais nas 3
 * variações... a lógica provavelmente está corrompida"): passo entre
 * template e geração — headline por variação + assets compartilhados (tela
 * do celular, pílulas), em vez de cravar a mesma copy padrão em tudo (bug
 * real em generate.ts, corrigido junto). Pular mantém os defaults.
 */

type Step = "client" | "upload" | "trim" | "template" | "copy" | "generating" | "gallery";

interface HookPackInfo {
  id: string;
  label: string;
}
interface TemplateInfo {
  id: string;
  client: string;
  clientLabel: string;
  label: string;
  hookPacks: HookPackInfo[];
  headline: HeadlineShape;
  configurableAssets: ConfigurableAssets | null;
}
interface ClientInfo {
  slug: string;
  label: string;
}
interface GenerateOutput {
  label: string;
  file: string;
}
interface GenerateStatus {
  state: "idle" | "transcribing" | "queued" | "rendering" | "done" | "error";
  progress: number;
  total?: number;
  done?: number;
  outputs?: GenerateOutput[];
  error?: string;
}

export default function GeneratePage() {
  const [step, setStep] = useState<Step>("client");
  const [openingEditorFor, setOpeningEditorFor] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [openingAll, setOpeningAll] = useState(false);
  const [openAllError, setOpenAllError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<{ durationSeconds: number; width: number; height: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trimming, setTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [generateStarting, setGenerateStarting] = useState(false);
  const [generateStartError, setGenerateStartError] = useState<string | null>(null);

  const [status, setStatus] = useState<GenerateStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/generate/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch((err) => setTemplatesError(String(err)));
  }, []);

  const clients = useMemo<ClientInfo[]>(() => {
    const seen = new Map<string, string>();
    for (const t of templates) if (!seen.has(t.client)) seen.set(t.client, t.clientLabel);
    return Array.from(seen, ([slug, label]) => ({ slug, label }));
  }, [templates]);

  const templatesForClient = useMemo(
    () => templates.filter((t) => t.client === selectedClient),
    [templates, selectedClient],
  );

  const selectClient = useCallback((slug: string) => {
    setSelectedClient(slug);
    setStep("upload");
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/generate/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "falha no upload");
      setSessionId(data.sessionId);
      setSourceUrl(data.url);
      setSourceMeta({ durationSeconds: data.durationSeconds, width: data.width, height: data.height });
      setStep("trim");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const confirmTrim = useCallback(
    async (result: TrimResult) => {
      if (!sessionId) return;
      setTrimming(true);
      setTrimError(null);
      try {
        const res = await fetch("/api/generate/trim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, ...result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "falha no corte/reenquadramento");
        if (!data.skipped) {
          setSourceUrl(data.url);
          setSourceMeta((prev) => (prev ? { ...prev, durationSeconds: data.durationSeconds } : prev));
        }
        setStep("template");
      } catch (err) {
        setTrimError(err instanceof Error ? err.message : String(err));
      } finally {
        setTrimming(false);
      }
    },
    [sessionId],
  );

  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setStep("copy");
  }, []);

  const startGenerate = useCallback(
    async (overrides: Partial<CopyConfigResult> = {}) => {
      if (!sessionId || !selectedTemplateId) return;
      setGenerateStarting(true);
      setGenerateStartError(null);
      try {
        const res = await fetch("/api/generate/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, templateId: selectedTemplateId, ...overrides }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "falha ao iniciar geração");
        setStep("generating");
        setStatus({ state: "queued", progress: 0 });
        pollRef.current = setInterval(async () => {
          const r = await fetch(`/api/generate/render?sessionId=${sessionId}`);
          const s: GenerateStatus = await r.json();
          setStatus(s);
          if (s.state === "done" || s.state === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            if (s.state === "done") setStep("gallery");
          }
        }, 2000);
      } catch (err) {
        setGenerateStartError(err instanceof Error ? err.message : String(err));
      } finally {
        setGenerateStarting(false);
      }
    },
    [sessionId, selectedTemplateId],
  );

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Abre numa aba NOVA (2026-10-18, founder: "clicando em editar... perco
  // os outros 2 criativos gerados, não consigo voltar e editar neles") — a
  // galeria fica aberta, intacta, pra editar as outras variações também.
  //
  // window.open() só funciona sem ser bloqueado como pop-up quando chamado
  // DENTRO do gesto síncrono do clique — depois de um `await fetch(...)` o
  // navegador não reconhece mais como ação direta do usuário e bloqueia
  // silenciosamente. Por isso abre a aba em branco JÁ no clique (ainda
  // síncrono) e só navega ela pra URL final quando a resposta chega.
  const openInEditor = useCallback(
    async (variantFile: string) => {
      if (!sessionId) return;
      const newTab = window.open("about:blank", "_blank");
      // "variants/<hookId>.mp4" -> "<hookId>"
      const hookId = variantFile.replace(/^variants\//, "").replace(/\.mp4$/, "");
      setOpeningEditorFor(variantFile);
      setEditorError(null);
      try {
        const res = await fetch("/api/generate/open-editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, hookId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "falha ao abrir no editor");
        const url = `/studio?client=${encodeURIComponent(data.client)}&creative=${encodeURIComponent(data.creative)}`;
        if (newTab) newTab.location.href = url;
        else window.open(url, "_blank"); // aba em branco foi bloqueada — tenta de novo com a URL final
      } catch (err) {
        setEditorError(err instanceof Error ? err.message : String(err));
        newTab?.close();
      } finally {
        setOpeningEditorFor(null);
      }
    },
    [sessionId],
  );

  // "Editar os 3" — monta os criativos das 3 variações de uma vez (mesma
  // ponte, 1 chamada por variação) e abre UMA aba apontando pro cliente: o
  // painel "Criativos" do /studio já lista todos os criativos do cliente,
  // então as 3 variações aparecem prontas pra alternar sem gerar de novo.
  const openAllInEditor = useCallback(async () => {
    if (!sessionId || !status?.outputs?.length) return;
    const newTab = window.open("about:blank", "_blank");
    setOpeningAll(true);
    setOpenAllError(null);
    try {
      const results = await Promise.all(
        status.outputs.map(async (o) => {
          const hookId = o.file.replace(/^variants\//, "").replace(/\.mp4$/, "");
          const res = await fetch("/api/generate/open-editor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, hookId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `falha ao abrir "${o.label}"`);
          return data as { client: string; creative: string };
        }),
      );
      const first = results[0];
      if (first) {
        const url = `/studio?client=${encodeURIComponent(first.client)}&creative=${encodeURIComponent(first.creative)}`;
        if (newTab) newTab.location.href = url;
        else window.open(url, "_blank");
      } else {
        newTab?.close();
      }
    } catch (err) {
      setOpenAllError(err instanceof Error ? err.message : String(err));
      newTab?.close();
    } finally {
      setOpeningAll(false);
    }
  }, [sessionId, status]);

  const reset = useCallback(() => {
    setStep("client");
    setSelectedClient(null);
    setSessionId(null);
    setSourceUrl(null);
    setSourceMeta(null);
    setTrimError(null);
    setSelectedTemplateId(null);
    setGenerateStarting(false);
    setGenerateStartError(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerar variações de criativo</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Upload do vídeo → escolher template → N variações geradas → escolher e refinar.
            </p>
          </div>
          {step !== "client" && (
            <button
              onClick={reset}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Começar de novo
            </button>
          )}
        </header>

        <Steps current={step} />

        {step === "client" && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Para qual cliente vamos gerar o criativo?</h2>
            {templatesError && <p className="text-sm text-red-400">{templatesError}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {clients.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => selectClient(c.slug)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left transition hover:border-emerald-500"
                >
                  <div className="font-semibold">{c.label}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {templates.filter((t) => t.client === c.slug).length} template(s)
                  </div>
                </button>
              ))}
              {clients.length === 0 && !templatesError && (
                <p className="text-sm text-neutral-500">Carregando clientes…</p>
              )}
            </div>
          </section>
        )}

        {step === "upload" && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between text-sm text-neutral-400">
              <span>
                Cliente: <span className="font-medium text-neutral-200">{clients.find((c) => c.slug === selectedClient)?.label ?? selectedClient}</span>
              </span>
              <button onClick={() => setStep("client")} className="text-emerald-400 hover:underline">
                Trocar cliente
              </button>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900/50 px-6 py-20 text-center"
            >
              <p className="text-lg font-medium">Arraste o vídeo-fonte aqui</p>
              <p className="text-sm text-neutral-500">ou</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {uploading ? "Enviando…" : "Escolher arquivo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <p className="text-xs text-neutral-600">mp4, mov, webm ou mkv</p>
              {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
            </div>
          </section>
        )}

        {step === "trim" && sourceUrl && sourceMeta && (
          <TrimStep
            sourceUrl={sourceUrl}
            durationSeconds={sourceMeta.durationSeconds}
            width={sourceMeta.width}
            height={sourceMeta.height}
            busy={trimming}
            error={trimError}
            onConfirm={confirmTrim}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "template" && (
          <section className="mt-10">
            {sourceUrl && (
              <video src={sourceUrl} controls className="mb-8 max-h-80 rounded-xl bg-black" />
            )}
            <h2 className="mb-4 text-lg font-semibold">Escolha o template</h2>
            {templatesError && <p className="text-sm text-red-400">{templatesError}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {templatesForClient.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t.id)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left transition hover:border-emerald-500"
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {t.hookPacks.length} variações (
                    {t.hookPacks.map((h) => h.label).join(", ")})
                  </div>
                </button>
              ))}
              {templates.length === 0 && !templatesError && (
                <p className="text-sm text-neutral-500">Carregando templates…</p>
              )}
              {templates.length > 0 && templatesForClient.length === 0 && !templatesError && (
                <p className="text-sm text-neutral-500">Nenhum template cadastrado pra esse cliente ainda.</p>
              )}
            </div>
          </section>
        )}

        {step === "copy" && sessionId && (() => {
          const t = templates.find((x) => x.id === selectedTemplateId);
          if (!t) return null;
          return (
            <CopyConfigStep
              sessionId={sessionId}
              hookPacks={t.hookPacks}
              headline={t.headline}
              configurableAssets={t.configurableAssets}
              busy={generateStarting}
              error={generateStartError}
              onConfirm={(result) => startGenerate(result)}
              onSkip={(selectedHookIds) => startGenerate({ selectedHookIds })}
              onBack={() => setStep("template")}
            />
          );
        })()}

        {step === "generating" && (
          <section className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round((status?.progress ?? 0) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-neutral-400">
              {status?.state === "error"
                ? `Erro: ${status.error}`
                : status?.state === "transcribing"
                  ? "Transcrevendo o áudio pra legenda automática (1x por sessão, só na 1ª geração)…"
                  : `Renderizando variação ${status?.done ?? 0} de ${status?.total ?? "…"}`}
            </p>
          </section>
        )}

        {step === "gallery" && sessionId && (
          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Variações geradas</h2>
              {(status?.outputs?.length ?? 0) > 1 && (
                <button
                  onClick={openAllInEditor}
                  disabled={openingAll}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {openingAll ? "Abrindo…" : `Editar as ${status?.outputs?.length} (nova aba)`}
                </button>
              )}
            </div>
            {openAllError && <p className="mb-4 text-sm text-red-400">Erro ao abrir todas: {openAllError}</p>}
            {status?.outputs?.length !== (templates.find((t) => t.id === selectedTemplateId)?.hookPacks.length ?? 0) && (
              <p className="mb-4 text-sm text-amber-400">
                {status?.outputs?.length ?? 0} de {templates.find((t) => t.id === selectedTemplateId)?.hookPacks.length ?? "?"} variações renderizaram com sucesso — ver render.log da sessão pras que falharam.
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(status?.outputs ?? []).map((o) => {
                const url = `/api/generate/media/${sessionId}/${o.file}`;
                const isOpening = openingEditorFor === o.file;
                return (
                  <div key={o.file} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                    <video src={url} controls className="aspect-[9/16] w-full rounded-lg bg-black object-cover" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{o.label}</span>
                      <a
                        href={url}
                        download
                        className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium hover:bg-neutral-700"
                      >
                        Baixar
                      </a>
                    </div>
                    <button
                      onClick={() => openInEditor(o.file)}
                      disabled={isOpening}
                      className="mt-2 w-full rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {isOpening ? "Abrindo…" : "Editar (nova aba)"}
                    </button>
                  </div>
                );
              })}
            </div>
            {editorError && <p className="mt-4 text-sm text-red-400">Erro ao abrir editor: {editorError}</p>}
            <p className="mt-8 text-xs text-neutral-600">
              "Editar" abre o take e as legendas de abertura 100% editáveis (corte, câmera, texto) no editor
              do Studio. O encerramento de marca depende do template: nos que têm decomposição (ex.: Garantido)
              cada elemento do motion final vira camada própria (mover/escalar/remover individualmente); nos
              demais entra como um clipe único — editável como bloco, não camada por camada.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "client", label: "1. Cliente" },
    { id: "upload", label: "2. Upload" },
    { id: "trim", label: "3. Corte" },
    { id: "template", label: "4. Template" },
    { id: "copy", label: "5. Copy" },
    { id: "generating", label: "6. Gerando" },
    { id: "gallery", label: "7. Escolher" },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <span
            className={
              i <= idx ? "font-semibold text-emerald-400" : "text-neutral-600"
            }
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-neutral-700">→</span>}
        </div>
      ))}
    </div>
  );
}
