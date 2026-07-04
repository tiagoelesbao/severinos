"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TimelineFxComposition } from "@/remotion/TimelineFxComposition";
import { Timeline as TimelineView } from "@/components/Timeline";
import type { Timeline } from "@/lib/timeline";
import type { FxPlan } from "@/lib/fxPlan";
import {
  moveClip,
  trimClip,
  removeClip,
  setHookRenderer,
  setCaptionRenderer,
  setElementParams,
  addElementLayer,
  makeTextElement,
  elementType,
  reorderClip,
  splitClip,
  trimClipStart,
  shiftNarration,
  moveAudioSegment,
  resizeAudioSegment,
  addLayer,
  addLayerClip,
  removeLayer,
  removeLayerClip,
  moveLayerClip,
  trimLayerClip,
  setClipTransition,
  setClipFrameMode,
  setClipKenBurns,
} from "@/lib/editorState";
import type { TransitionType, AnimType } from "@/lib/timeline";
import { buildCues, editCueText, shiftCaptions, type CueOptions } from "@/lib/cues";
import type { HookRenderer, CaptionRenderer } from "@/lib/fxRegistry";
import type { AuditReport } from "@/lib/audit";

interface Snapshot {
  timeline: Timeline;
  fxPlan: FxPlan;
}

interface AutocutInfo {
  role: string;
  silenceSeconds: number;
  leadSec: number;
  trailSec: number;
}

type AssetKind = "audio" | "video" | "image";
interface Asset {
  name: string;
  url: string;
  kind: AssetKind;
}

// Mapeia o asset para a camada (áudio vs visual) e o tipo de elemento.
const assetLayerKind = (k: AssetKind): "audio" | "video" => (k === "audio" ? "audio" : "video");
const assetElementType = (k: AssetKind) =>
  k === "audio" ? ("media-audio" as const) : k === "image" ? ("image" as const) : ("media-video" as const);
const assetIcon = (k: AssetKind) => (k === "audio" ? "♪" : k === "image" ? "🖼" : "▦");
const baseName = (n: string) => n.split("/").pop() ?? n;

const HOOKS: HookRenderer[] = ["snap-zoom", "hard-cut", "whip"];
const CAPS: CaptionRenderer[] = ["word-pop", "mono-bold", "underline"];

// Modelos de legenda (chunking): 1/2 linhas, densidade de palavras.
const CAPTION_STYLES: { id: string; label: string; opts: CueOptions }[] = [
  { id: "frase2", label: "Frase · até 2 linhas", opts: { maxWords: 6, maxLines: 2, maxCharsPerLine: 18 } },
  { id: "linha1", label: "1 linha · curta", opts: { maxWords: 4, maxLines: 1, maxCharsPerLine: 17 } },
  { id: "punchy", label: "Punchy · 2 palavras", opts: { maxWords: 2, maxLines: 1, maxCharsPerLine: 16 } },
  { id: "karaoke", label: "Karaokê · palavra", opts: { maxWords: 1, maxLines: 1, maxCharsPerLine: 16 } },
];

// Zoom da timeline (pixels por segundo). Define a densidade horizontal.
const PPS_MIN = 20;
const PPS_MAX = 220;
const PPS_DEFAULT = 80;

interface CreativeItem { id: string; label: string; hasMaterials: boolean }

function StudioInner() {
  const router = useRouter();
  const params = useSearchParams();
  const client = params.get("client") || "";
  const [creative, setCreative] = useState(params.get("creative") || "");
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [sel, setSel] = useState(0);
  const [status, setStatus] = useState("Carregando…");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pps, setPps] = useState(PPS_DEFAULT);
  const [captionSource, setCaptionSource] = useState<string>("script");
  const [autocutInfo, setAutocutInfo] = useState<AutocutInfo[]>([]);
  const [autocutOn, setAutocutOn] = useState(false);
  const [maxGap, setMaxGap] = useState(0.4); // limiar de pausa (s) — agressividade
  const [styleId, setStyleId] = useState("frase2");
  const [selectedCue, setSelectedCue] = useState(-1);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [razorMode, setRazorMode] = useState(false);
  const [selectedLayerClip, setSelectedLayerClip] = useState(""); // "layerId/clipId"
  const [assets, setAssets] = useState<{ library: Asset[]; materials: Asset[]; uploads: Asset[] }>({ library: [], materials: [], uploads: [] });
  const [pickerFor, setPickerFor] = useState(""); // layerId aberto no picker
  // VEX-01: export final em andamento (poll de exports/render-status.json).
  const [exporting, setExporting] = useState<{ state: string; progress: number; output?: string; error?: string } | null>(null);
  const exportPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  // VEX-02: preparação automática (whisper + assembly) em andamento.
  const [preparing, setPreparing] = useState<{ state: string; error?: string } | null>(null);
  const preparePoll = useRef<ReturnType<typeof setInterval> | null>(null);
  // VEX-03: edições não salvas (dot no Salvar, guards de perda de trabalho).
  const [dirty, setDirty] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const captionStyle = useMemo(
    () => CAPTION_STYLES.find((s) => s.id === styleId)?.opts,
    [styleId],
  );

  const playerRef = useRef<PlayerRef>(null);
  const currentFrameRef = useRef(0);
  const hist = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  // N1.c: manipulação no palco (overlay de alças sobre o Player).
  const stageRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<Snapshot | null>(null);
  const stageDrag = useRef<{ mode: "move" | "resize"; lid: string; cid: string } | null>(null);

  const load = useCallback((withAutocut: boolean, gap: number) => {
    if (!client || !creative) return;
    setStatus("Carregando…");
    const q =
      `client=${client}&creative=${creative}` +
      (withAutocut ? `&autocut=1&maxgap=${gap}` : "");
    fetch(`/api/timeline?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setStatus(`Erro: ${d.error}`);
        hist.current = { past: [], future: [] };
        setSnap({ timeline: d.timeline, fxPlan: d.fxPlan });
        setAudit(d.audit ?? null);
        setPersisted(!!d.persisted);
        setCaptionSource(d.captionSource ?? "script");
        setAutocutInfo(d.autocut ?? []);
        setDirty(false);
        // VEX-03: restaura preferências salvas (styleId/autocut) do studio-edit.
        if (d.persisted && typeof d.styleId === "string") setStyleId(d.styleId);
        if (d.persisted && d.autocutSaved) {
          // O timeline persistido JÁ reflete o auto-cut salvo; sincronizar o
          // estado apenas alinha a UI (setState igual não re-dispara o efeito).
          if (typeof d.autocutSaved.on === "boolean") setAutocutOn(d.autocutSaved.on);
          if (typeof d.autocutSaved.maxGap === "number") setMaxGap(d.autocutSaved.maxGap);
        }
        setSel(0);
        setCurrentFrame(0);
        // Fit-to-window: ajusta o zoom para a timeline caber na largura útil.
        const totalSec = d.timeline.durationInFrames / d.timeline.fps;
        const usable = (typeof window !== "undefined" ? window.innerWidth : 1280) - 380;
        setPps(Math.max(PPS_MIN, Math.min(PPS_MAX, usable / Math.max(1, totalSec))));
        setStatus("");
      })
      .catch((e) => setStatus(`Erro: ${e}`));
  }, [client, creative]);

  // N3: lista de criativos do cliente (switcher) + resolve a seleção (URL > 1º).
  useEffect(() => {
    if (!client) { router.replace("/"); return; }
    fetch(`/api/creatives?client=${encodeURIComponent(client)}`)
      .then((r) => r.json())
      .then((d) => {
        const list: CreativeItem[] = d.creatives ?? [];
        setCreatives(list);
        const urlCreative = params.get("creative") || "";
        const valid = urlCreative && list.some((c) => c.id === urlCreative);
        const chosen = valid ? urlCreative : (list[0]?.id ?? "");
        setCreative(chosen);
        if (chosen && chosen !== urlCreative) {
          router.replace(`/studio?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(chosen)}`);
        }
      })
      .catch(() => setCreatives([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const switchCreative = useCallback((id: string) => {
    if (id === creative) return;
    setCreative(id);
    setSel(0); setSelectedLayerClip(""); setSelectedCue(-1); setSelectedAudio("");
    router.replace(`/studio?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(id)}`);
  }, [creative, client, router]);

  const removeCreative = useCallback(async (id: string) => {
    if (!confirm(
      `Remover o criativo "${id}"?\n\n` +
      "ISSO APAGA A PASTA DO CRIATIVO no disco, incluindo os Materiais Brutos gravados. " +
      "Não há como desfazer.",
    )) return;
    try {
      const res = await fetch(`/api/creatives?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { alert("Falha ao remover o criativo."); return; }
      const d = await fetch(`/api/creatives?client=${encodeURIComponent(client)}`).then((r) => r.json());
      const list: CreativeItem[] = d.creatives ?? [];
      setCreatives(list);
      if (id === creative) {
        const next = list[0]?.id ?? "";
        setCreative(next);
        router.replace(next
          ? `/studio?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(next)}`
          : `/studio?client=${encodeURIComponent(client)}`);
      }
    } catch { alert("Erro ao remover o criativo."); }
  }, [client, creative, router]);

  // Debounce: reage ao toggle e ao slider de agressividade (ao vivo).
  useEffect(() => {
    const t = setTimeout(() => load(autocutOn, maxGap), 220);
    return () => clearTimeout(t);
  }, [autocutOn, maxGap, load]);

  // VEX-03: mudar o auto-cut recarrega do servidor (descarta edições não
  // salvas) — com trabalho pendente, pede confirmação antes.
  const guardedAutocut = useCallback(
    (fn: () => void) => {
      if (
        dirty &&
        !confirm("Há edições NÃO SALVAS — mudar o auto-cut recarrega a timeline e as descarta.\n\nContinuar?")
      )
        return;
      fn();
    },
    [dirty],
  );

  // VEX-03: aviso do navegador ao fechar/recarregar com trabalho pendente.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Assets inseríveis (biblioteca + materiais) para as camadas extras.
  useEffect(() => {
    if (!client || !creative) return;
    fetch(`/api/assets?client=${client}&creative=${creative}`)
      .then((r) => r.json())
      .then((d) => setAssets({ library: d.library ?? [], materials: d.materials ?? [], uploads: d.uploads ?? [] }))
      .catch(() => {});
  }, [client, creative]);

  // Sincroniza o playhead da timeline com o frame do Player (e play/pause).
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      const f = e.detail.frame;
      currentFrameRef.current = f;
      setCurrentFrame((prev) => (prev === f ? prev : f));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [snap]);

  const apply = useCallback((next: Snapshot) => {
    setSnap((cur) => {
      if (cur) hist.current.past.push(cur);
      hist.current.future = [];
      return next;
    });
    setDirty(true);
  }, []);

  // Transação para gestos contínuos (arraste de trim): 1 entrada de histórico no
  // início, atualizações ao vivo durante o gesto (sem poluir o undo).
  const beginEdit = useCallback(() => {
    setSnap((cur) => {
      if (cur) hist.current.past.push(cur);
      hist.current.future = [];
      return cur;
    });
    setDirty(true);
  }, []);
  const liveUpdate = useCallback((next: Snapshot) => setSnap(next), []);

  // Espelha o snap num ref para os listeners de drag do palco lerem o estado atual.
  useEffect(() => { snapRef.current = snap; }, [snap]);

  // N1.c: arraste/resize do elemento selecionado direto no palco (overlay).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = stageDrag.current;
      const node = stageRef.current;
      const s = snapRef.current;
      if (!d || !node || !s) return;
      const rect = node.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (d.mode === "move") {
        liveUpdate({ timeline: setElementParams(s.timeline, d.lid, d.cid, { x: Math.round(px * 1000) / 10, y: Math.round(py * 1000) / 10 }), fxPlan: s.fxPlan });
      } else {
        const layer = (s.timeline.extraLayers ?? []).find((L) => L.id === d.lid);
        const cl = layer?.clips.find((c) => c.id === d.cid);
        if (!cl) return;
        const cx = (cl.x ?? 50) / 100;
        const cy = (cl.y ?? 50) / 100;
        const scale = Math.max(0.1, Math.min(3, Math.max(Math.abs(px - cx), Math.abs(py - cy)) * 2));
        liveUpdate({ timeline: setElementParams(s.timeline, d.lid, d.cid, { scale: Math.round(scale * 100) / 100 }), fxPlan: s.fxPlan });
      }
    };
    const onUp = () => { stageDrag.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [liveUpdate]);

  const undo = useCallback(() => {
    setSnap((cur) => {
      const prev = hist.current.past.pop();
      if (!prev || !cur) return cur;
      hist.current.future.push(cur);
      setDirty(true); // estado diverge do salvo
      return prev;
    });
  }, []);
  const redo = useCallback(() => {
    setSnap((cur) => {
      const nxt = hist.current.future.pop();
      if (!nxt || !cur) return cur;
      hist.current.past.push(cur);
      setDirty(true);
      return nxt;
    });
  }, []);

  const seek = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    currentFrameRef.current = frame;
    setCurrentFrame(frame);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) p.pause();
    else p.play();
  }, []);

  // N2: upload de asset do computador → media bin (Studio Assets do criativo).
  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !client || !creative) return;
      const fd = new FormData();
      fd.append("file", file);
      setStatus("Enviando…");
      try {
        const res = await fetch(`/api/upload?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`, { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) { setStatus(`Erro: ${d.error ?? "upload"}`); return; }
        setAssets((a) => ({ ...a, uploads: [{ name: d.name, url: d.url, kind: d.kind }, ...a.uploads] }));
        setStatus("✓ Enviado");
        setTimeout(() => setStatus(""), 1500);
      } catch {
        setStatus("Erro no upload");
      }
    },
    [client, creative],
  );

  // MVC-11: persiste a edição atual (clique em Salvar). Só então sobrevive a reload.
  const save = useCallback(async () => {
    if (!snap || !client || !creative) return;
    setStatus("Salvando…");
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          creative,
          timeline: snap.timeline,
          fxPlan: snap.fxPlan,
          captionSource,
          // VEX-03: preferências persistem (estilo de legenda + auto-cut).
          styleId,
          autocut: { on: autocutOn, maxGap },
        }),
      });
      if (!res.ok) { setStatus("✗ Falha ao salvar"); return; }
      setPersisted(true);
      setDirty(false);
      setStatus("✓ Salvo");
      setTimeout(() => setStatus(""), 1500);
    } catch {
      setStatus("✗ Erro ao salvar");
    }
  }, [snap, client, creative, captionSource, styleId, autocutOn, maxGap]);

  // MVC-11: descarta a edição salva e recarrega o estado fresco do plano.
  const resetEdit = useCallback(async () => {
    if (!client || !creative) return;
    if (!confirm("Descartar a edição salva e voltar ao estado do plano?")) return;
    try {
      await fetch(`/api/timeline?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`, { method: "DELETE" });
      setPersisted(false);
      load(autocutOn, maxGap);
    } catch {
      setStatus("✗ Erro ao resetar");
    }
  }, [client, creative, load, autocutOn, maxGap]);

  // VEX-01: exporta o estado ATUAL da tela → mp4 (worker em background + poll).
  const stopExportPoll = useCallback(() => {
    if (exportPoll.current) {
      clearInterval(exportPoll.current);
      exportPoll.current = null;
    }
  }, []);

  const exportVideo = useCallback(async () => {
    if (!snap || !client || !creative || exportPoll.current) return;
    setExporting({ state: "queued", progress: 0 });
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          creative,
          timeline: snap.timeline,
          fxPlan: snap.fxPlan,
          captionStyle,
          captionSource,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setExporting({ state: "error", progress: 0, error: d.error ?? "falha ao iniciar" });
        return;
      }
      exportPoll.current = setInterval(async () => {
        try {
          const s = await fetch(
            `/api/render?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`,
          ).then((r) => r.json());
          setExporting(s);
          if (s.state === "done" || s.state === "error") stopExportPoll();
        } catch {
          /* mantém o poll — pode ser hiccup do dev server */
        }
      }, 1200);
    } catch {
      setExporting({ state: "error", progress: 0, error: "erro de rede" });
    }
  }, [snap, client, creative, captionStyle, captionSource, stopExportPoll]);

  // Troca de criativo/desmontagem encerra o poll (o job continua no servidor).
  useEffect(() => () => stopExportPoll(), [creative, stopExportPoll]);

  // VEX-02: dispara a preparação (transcrição whisper + assembly) e recarrega ao fim.
  const prepareCreative = useCallback(async () => {
    if (!client || !creative || preparePoll.current) return;
    setPreparing({ state: "queued" });
    try {
      const res = await fetch("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client, creative }),
      });
      const d = await res.json();
      if (!res.ok) {
        setPreparing({ state: "error", error: d.error ?? "falha ao iniciar" });
        return;
      }
      preparePoll.current = setInterval(async () => {
        try {
          const s = await fetch(
            `/api/prepare?client=${encodeURIComponent(client)}&creative=${encodeURIComponent(creative)}`,
          ).then((r) => r.json());
          setPreparing(s);
          if (s.state === "done" || s.state === "error") {
            if (preparePoll.current) {
              clearInterval(preparePoll.current);
              preparePoll.current = null;
            }
            if (s.state === "done") {
              setPreparing(null);
              load(autocutOn, maxGap); // recarrega com transcript/assembly novos
            }
          }
        } catch {
          /* hiccup do dev server — mantém o poll */
        }
      }, 2000);
    } catch {
      setPreparing({ state: "error", error: "erro de rede" });
    }
  }, [client, creative, load, autocutOn, maxGap]);

  useEffect(() => () => {
    if (preparePoll.current) {
      clearInterval(preparePoll.current);
      preparePoll.current = null;
    }
  }, [creative]);

  // N2: drop de asset na timeline → insere elemento na camada-alvo (ou cria uma).
  const handleAssetDrop = useCallback(
    (payload: { src: string; name: string; kind: AssetKind }, atFrame: number, layerId: string | null) => {
      if (!snap) return;
      const tl = snap.timeline;
      const fx = snap.fxPlan;
      const lk = assetLayerKind(payload.kind);
      const start = Math.max(0, atFrame);
      const dur = Math.max(30, Math.min(tl.fps * 5, Math.max(30, tl.durationInFrames - start)));
      const el = {
        type: assetElementType(payload.kind),
        src: payload.src,
        label: baseName(payload.name),
        startFrame: start,
        durationInFrames: dur,
        ...(lk === "audio" ? { volume: 1 } : { opacity: 1 }),
      };
      const layer = layerId ? (tl.extraLayers ?? []).find((L) => L.id === layerId) : undefined;
      if (layer && layer.kind === lk) {
        apply({ timeline: addLayerClip(tl, layer.id, el), fxPlan: fx });
      } else {
        apply({ timeline: addElementLayer(tl, lk, lk === "audio" ? "SFX/Trilha" : "Overlay", el), fxPlan: fx });
      }
    },
    [snap, apply],
  );

  const mediaBaseUrl = `/api/media/${client}/${creative}`;
  const inputProps = useMemo(
    () =>
      snap
        ? { timeline: snap.timeline, fxPlan: { ...snap.fxPlan, captionStyle }, mediaBaseUrl }
        : null,
    [snap, captionStyle, mediaBaseUrl],
  );
  // Cues para a track de legendas (mesmo chunking do preview).
  const cues = useMemo(
    () => (snap ? buildCues(snap.fxPlan.captions, captionStyle) : []),
    [snap, captionStyle],
  );

  // Atalhos de teclado (VEX-03): transporte, undo/redo, delete contextual,
  // frame-step, razor. Popover "?" no transporte lista todos.
  useEffect(() => {
    if (!snap) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const { fps, durationInFrames } = snap.timeline;
      const cf = currentFrameRef.current;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.code === "KeyS") {
        e.preventDefault();
        save();
      } else if (ctrl && e.code === "KeyZ" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (ctrl && e.code === "KeyZ") {
        e.preventDefault();
        undo();
      } else if (ctrl && e.code === "KeyY") {
        e.preventDefault();
        redo();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        // Delete contextual: elemento de camada > clipe de vídeo selecionado.
        e.preventDefault();
        if (selectedLayerClip) {
          const [lid, cid] = selectedLayerClip.split("/");
          apply({ timeline: removeLayerClip(snap.timeline, lid, cid), fxPlan: snap.fxPlan });
          setSelectedLayerClip("");
        } else if (snap.timeline.videoTrack.length > 1) {
          apply({ timeline: removeClip(snap.timeline, sel), fxPlan: snap.fxPlan });
          setSel(0);
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "Comma") {
        seek(Math.max(0, cf - 1)); // 1 frame
      } else if (e.code === "Period") {
        seek(Math.min(durationInFrames - 1, cf + 1));
      } else if (e.code === "ArrowLeft") {
        seek(Math.max(0, cf - fps));
      } else if (e.code === "ArrowRight") {
        seek(Math.min(durationInFrames - 1, cf + fps));
      } else if (e.code === "Home") {
        seek(0);
      } else if (e.code === "End") {
        seek(durationInFrames - 1);
      } else if (e.code === "KeyC" && !ctrl) {
        setRazorMode((v) => !v);
      } else if (e.code === "Escape") {
        setSelectedLayerClip("");
        setShowKeys(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snap, seek, togglePlay, save, undo, redo, apply, sel, selectedLayerClip]);

  if (!snap || !inputProps) {
    const empty = !!client && creatives.length === 0;
    return (
      <main style={{ display: "grid", placeItems: "center", height: "100vh", color: "#B5B5C0", background: "#08080e", textAlign: "center", padding: 24 }}>
        <div>
          <div>{empty ? "Nenhum criativo de vídeo para este cliente." : status || "Carregando…"}</div>
          <button
            onClick={() => router.push("/")}
            style={{ marginTop: 16, background: "#1a1a24", color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
          >
            ← Trocar cliente
          </button>
        </div>
      </main>
    );
  }

  const { timeline, fxPlan } = snap;
  const clip = timeline.videoTrack[sel];
  const curSec = (currentFrame / timeline.fps).toFixed(2);
  const totSec = (timeline.durationInFrames / timeline.fps).toFixed(2);

  const box: React.CSSProperties = {
    background: "#0c0c16",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    padding: 12,
  };
  const btn: React.CSSProperties = {
    background: "#1a1a24",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 13,
  };

  // F4.2: achados da reavaliação de sound design (auditoria do material gravado).
  const soundFindings = audit?.findings.filter((f) => f.category === "som") ?? [];

  // Trilhas de fundo disponíveis (biblioteca music/) + add cobrindo o vídeo todo.
  const musicTracks = assets.library.filter((a) => a.kind === "audio" && a.name.toLowerCase().startsWith("music/"));
  const addBackground = (a: Asset) =>
    apply({
      timeline: addElementLayer(timeline, "audio", "Trilha de fundo", {
        type: "media-audio", src: a.url, label: `fundo · ${baseName(a.name)}`,
        startFrame: 0, durationInFrames: timeline.durationInFrames, volume: 0.25,
      }),
      fxPlan,
    });

  // Elemento visual selecionado (para as alças no palco — N1.c). Áudio não tem alça.
  const selVisual = (() => {
    if (!selectedLayerClip) return null;
    const [lid, cid] = selectedLayerClip.split("/");
    const layer = (timeline.extraLayers ?? []).find((L) => L.id === lid);
    const cl = layer?.clips.find((c) => c.id === cid);
    if (!layer || !cl || elementType(layer.kind, cl) === "media-audio") return null;
    return { lid, cid, cl };
  })();

  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "100vh", background: "#000", color: "#fff" }}>
      {/* ── Parte superior: criativos + preview + inspector ─────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 320px", minHeight: 0 }}>
        {/* Esquerda: cliente + switcher de criativos (N3) */}
        <aside style={{ background: "#0a0a12", borderRight: "1px solid rgba(255,255,255,.08)", padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => router.push("/")} style={{ ...btn, fontSize: 11, alignSelf: "flex-start", padding: "4px 10px" }}>← Trocar cliente</button>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>{client}</div>
            <div style={{ fontSize: 10, color: "#666" }}>{creatives.length} criativo{creatives.length === 1 ? "" : "s"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {creatives.map((c) => {
              const isSel = c.id === creative;
              return (
                <div key={c.id} style={{ position: "relative" }}>
                  <button
                    onClick={() => switchCreative(c.id)}
                    title={c.id}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 30px 8px 10px", borderRadius: 8, cursor: "pointer",
                      background: isSel ? "rgba(255,184,0,.10)" : "#0c0c16", color: isSel ? "#fff" : "rgba(255,255,255,.72)",
                      border: `1px solid ${isSel ? "rgba(255,184,0,.6)" : "rgba(255,255,255,.08)"}`,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                    <div style={{ fontSize: 9, color: c.hasMaterials ? "#2DE2C8" : "#FF8C42", marginTop: 2 }}>
                      {c.hasMaterials ? "ingestável" : "sem materiais"}
                    </div>
                  </button>
                  <button
                    onClick={() => removeCreative(c.id)}
                    title="Remover criativo (apaga a pasta, incl. Materiais Brutos!)"
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,.25)", cursor: "pointer", fontSize: 12 }}
                  >🗑</button>
                </div>
              );
            })}
            {creatives.length === 0 && <div style={{ fontSize: 10, color: "#666" }}>Nenhum criativo.</div>}
          </div>

          {/* Media bin (N2): biblioteca + materiais + uploads, arrastáveis p/ timeline */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>Biblioteca</span>
              <label style={{ ...btn, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>
                ↑ Upload
                <input type="file" accept="audio/*,video/*,image/*" style={{ display: "none" }} onChange={onUpload} />
              </label>
            </div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 6 }}>Arraste um item para a timeline.</div>
            {([
              { title: "Uploads", items: assets.uploads },
              { title: "Materiais", items: assets.materials },
              { title: "Biblioteca", items: assets.library },
            ] as const).map((g) => (g.items.length > 0 ? (
              <div key={g.title} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{g.title} · {g.items.length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {g.items.map((a) => (
                    <div
                      key={a.url}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify({ src: a.url, name: a.name, kind: a.kind }));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      title={a.name}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", borderRadius: 6, background: "#0c0c16", border: "1px solid rgba(255,255,255,.08)", cursor: "grab", fontSize: 10 }}
                    >
                      <span style={{ opacity: 0.7 }}>{assetIcon(a.kind)}</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baseName(a.name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null))}
            {assets.uploads.length + assets.materials.length + assets.library.length === 0 && (
              <div style={{ fontSize: 10, color: "#666" }}>Nenhum asset. Faça upload ou solte arquivos em public/library/.</div>
            )}
          </div>

          {/* Trilha de fundo (música que acompanha o vídeo inteiro) */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>🎵 Trilha de fundo</div>
            <div style={{ fontSize: 9, color: "#666", margin: "2px 0 6px" }}>Acompanha o vídeo inteiro (volume baixo, sob a fala).</div>
            {musicTracks.length === 0 && (
              <div style={{ fontSize: 10, color: "#666" }}>Nenhuma trilha em public/library/music.</div>
            )}
            {musicTracks.map((a) => (
              <div key={a.url} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "4px 7px", borderRadius: 6, background: "#0c0c16", border: "1px solid rgba(255,255,255,.08)", marginBottom: 3 }}>
                <span style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🎵 {baseName(a.name).replace(/\.\w+$/, "")}</span>
                <button onClick={() => addBackground(a)} title="Adicionar como trilha de fundo do vídeo inteiro" style={{ ...btn, padding: "2px 8px", fontSize: 10 }}>＋ fundo</button>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 9, color: "#555", marginTop: "auto", lineHeight: 1.5 }}>
            Novos criativos vêm do pipeline <code>*industrialize-video</code> (Fase A).
          </div>
        </aside>

        {/* Preview (palco) */}
        <main style={{ position: "relative", background: "#08080e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, minHeight: 0 }}>
          <div ref={stageRef} onMouseDown={() => setSelectedLayerClip("")} style={{ position: "relative", height: "calc(100% - 56px)", aspectRatio: "9 / 16", background: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.6)" }}>
            <Player
              ref={playerRef}
              component={TimelineFxComposition as never}
              inputProps={inputProps as never}
              durationInFrames={timeline.durationInFrames}
              fps={timeline.fps}
              compositionWidth={timeline.width}
              compositionHeight={timeline.height}
              style={{ width: "100%", height: "100%" }}
              errorFallback={() => (
                <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#FF8C42", fontSize: 12, textAlign: "center", padding: 16 }}>
                  Mídia incompatível neste clipe (formato/codec).<br />Veja a auditoria de edição.
                </div>
              )}
            />
            {/* Alças no palco: mover (caixa tracejada) + redimensionar (canto). */}
            {selVisual && (() => {
              const { lid, cid, cl } = selVisual;
              const sc = cl.scale ?? 1;
              const x = cl.x ?? 50;
              const y = cl.y ?? 50;
              const left = x - sc * 50;
              const top = y - sc * 50;
              const size = sc * 100;
              const hx = Math.max(4, Math.min(96, x + sc * 50));
              const hy = Math.max(4, Math.min(96, y + sc * 50));
              const down = (mode: "move" | "resize") => (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                beginEdit();
                stageDrag.current = { mode, lid, cid };
              };
              return (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
                  <div
                    onMouseDown={down("move")}
                    style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%`, border: "1.5px dashed #FFB800", boxSizing: "border-box", cursor: "move", pointerEvents: "auto" }}
                  />
                  <div
                    onMouseDown={down("resize")}
                    title="Redimensionar"
                    style={{ position: "absolute", left: `${hx}%`, top: `${hy}%`, width: 14, height: 14, marginLeft: -7, marginTop: -7, background: "#FFB800", border: "2px solid #000", borderRadius: 3, cursor: "nwse-resize", pointerEvents: "auto", zIndex: 6 }}
                  />
                </div>
              );
            })()}
          </div>
          {/* Transporte */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <button style={btn} onClick={() => seek(0)} title="Início">⏮</button>
            <button style={{ ...btn, minWidth: 44 }} onClick={togglePlay} title="Espaço">
              {playing ? "⏸" : "▶"}
            </button>
            <button style={btn} onClick={() => seek(timeline.durationInFrames - 1)} title="Fim">⏭</button>
            <span style={{ fontSize: 12, color: "#888", fontVariantNumeric: "tabular-nums", marginLeft: 8 }}>
              {curSec}s / {totSec}s
            </span>
            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.12)", margin: "0 6px" }} />
            <button style={btn} onClick={undo} title="Desfazer">↶</button>
            <button style={btn} onClick={redo} title="Refazer">↷</button>
            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.12)", margin: "0 6px" }} />
            <button
              style={{ ...btn, background: razorMode ? "#FF4D2E" : "#1a1a24", fontWeight: 700 }}
              onClick={() => setRazorMode((v) => !v)}
              title="Ferramenta de corte: clique num clipe para dividir"
            >
              ✂ {razorMode ? "Cortar ON" : "Cortar"}
            </button>
            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.12)", margin: "0 6px" }} />
            <label style={{ fontSize: 11, color: "#666" }}>zoom</label>
            <input
              type="range"
              min={PPS_MIN}
              max={PPS_MAX}
              value={pps}
              onChange={(e) => setPps(Number(e.target.value))}
              style={{ width: 90 }}
            />
            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.12)", margin: "0 6px" }} />
            <button style={{ ...btn, background: "#2DE2C8", color: "#06121a", fontWeight: 700, position: "relative" }} onClick={save} title="Salvar edição (Ctrl+S)">
              💾 Salvar
              {dirty && <span title="Edições não salvas" style={{ position: "absolute", top: -4, right: -4, width: 10, height: 10, borderRadius: "50%", background: "#FF4D2E", border: "2px solid #000" }} />}
            </button>
            {persisted && (
              <button style={{ ...btn, fontSize: 11 }} onClick={resetEdit} title="Descartar a edição salva e voltar ao plano">↺ Resetar</button>
            )}
            {(() => {
              const busy = exporting && !["done", "error", "idle"].includes(exporting.state);
              const label = !exporting || exporting.state === "idle"
                ? "⬇ Exportar"
                : exporting.state === "rendering"
                  ? `⏳ ${Math.round(exporting.progress * 100)}%`
                  : exporting.state === "done"
                    ? "✓ Exportado"
                    : exporting.state === "error"
                      ? "✗ Export falhou"
                      : `⏳ ${exporting.state}…`;
              return (
                <button
                  style={{ ...btn, background: busy ? "#1a1a24" : "#FFB800", color: busy ? "#fff" : "#1a1200", fontWeight: 700, opacity: busy ? 0.85 : 1 }}
                  onClick={exportVideo}
                  disabled={!!busy}
                  title={
                    exporting?.state === "done" && exporting.output
                      ? `mp4 em ${exporting.output} — clique para exportar de novo`
                      : exporting?.state === "error"
                        ? `${exporting.error ?? "erro"} — clique para tentar de novo`
                        : "Renderiza o estado atual da tela em mp4 (exports/)"
                  }
                >
                  {label}
                </button>
              );
            })()}
            {exporting?.state === "done" && exporting.output && (
              <span style={{ fontSize: 10, color: "#2DE2C8", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={exporting.output}>
                {exporting.output}
              </span>
            )}
            {exporting?.state === "error" && exporting.error && (
              <span style={{ fontSize: 10, color: "#FF4D2E", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={exporting.error}>
                {exporting.error}
              </span>
            )}
            {status && <span style={{ fontSize: 11, color: "#888" }}>{status}</span>}
            <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.12)", margin: "0 6px" }} />
            <button style={{ ...btn, padding: "6px 10px" }} onClick={() => setShowKeys((v) => !v)} title="Atalhos de teclado">?</button>
          </div>
          {showKeys && (
            <div style={{ position: "absolute", bottom: 70, right: 24, zIndex: 30, background: "#0c0c16", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "12px 16px", boxShadow: "0 12px 40px rgba(0,0,0,.6)", fontSize: 11, lineHeight: 1.9, color: "#ccc" }}>
              <div style={{ fontWeight: 800, color: "#fff", marginBottom: 4 }}>Atalhos</div>
              <div><kbd>Espaço</kbd> play/pause · <kbd>← →</kbd> ±1s · <kbd>, .</kbd> ±1 frame</div>
              <div><kbd>Home</kbd>/<kbd>End</kbd> início/fim · <kbd>C</kbd> cortar (razor)</div>
              <div><kbd>Ctrl+Z</kbd> desfazer · <kbd>Ctrl+Shift+Z</kbd>/<kbd>Ctrl+Y</kbd> refazer</div>
              <div><kbd>Delete</kbd> remover selecionado · <kbd>Ctrl+S</kbd> salvar · <kbd>Esc</kbd> desselecionar</div>
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside style={{ background: "#0a0a12", padding: 16, overflowY: "auto", borderLeft: "1px solid rgba(255,255,255,.08)" }}>
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Inspector</h2>
          <p style={{ fontSize: 11, color: "#666", margin: 0 }}>
            {timeline.videoTrack.length} clips · {(timeline.durationInFrames / timeline.fps).toFixed(1)}s · narração-driven
          </p>

          {clip && (
            <section style={{ ...box, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                Clip {sel + 1}: <strong style={{ color: "#fff" }}>{clip.role}</strong>{" "}
                {clip.audioEnabled ? "🔊" : "🔇"}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>
                {clip.file} · {clip.durationSeconds}s
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => apply({ timeline: moveClip(timeline, sel, -1), fxPlan })}>← Antes</button>
                <button style={btn} onClick={() => apply({ timeline: moveClip(timeline, sel, +1), fxPlan })}>Depois →</button>
                <button style={btn} onClick={() => apply({ timeline: trimClip(timeline, sel, +15), fxPlan })}>+0,5s</button>
                <button style={btn} onClick={() => apply({ timeline: trimClip(timeline, sel, -15), fxPlan })}>−0,5s</button>
                <button style={btn} onClick={() => { apply({ timeline: removeClip(timeline, sel), fxPlan }); setSel(0); }}>🗑</button>
              </div>

              {/* Transição de entrada (clipes a partir do 2º) */}
              {sel > 0 && (
                <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Transição de entrada</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={clip.transitionIn?.type ?? "dissolve"}
                      onChange={(e) => apply({ timeline: setClipTransition(timeline, sel, e.target.value as TransitionType, clip.transitionIn?.durationInFrames ?? 6), fxPlan })}
                      style={{ ...btn, flex: 1 }}
                    >
                      {(["none", "dissolve", "slide", "zoom"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      type="number" min={1} max={20}
                      value={clip.transitionIn?.durationInFrames ?? 6}
                      onChange={(e) => apply({ timeline: setClipTransition(timeline, sel, clip.transitionIn?.type ?? "dissolve", Number(e.target.value)), fxPlan })}
                      title="frames"
                      style={{ ...btn, width: 56 }}
                    />
                  </div>
                </div>
              )}

              {/* Parâmetros de screen-capture (inserts: skill/reference/generation/result) */}
              {!clip.audioEnabled && !clip.gap && (
                <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>
                    Enquadramento · velocidade {clip.playbackRate.toFixed(2)}×
                  </div>
                  <select
                    value={clip.frameMode ?? "auto"}
                    onChange={(e) => apply({ timeline: setClipFrameMode(timeline, sel, e.target.value as "auto" | "cover" | "panel"), fxPlan })}
                    style={{ ...btn, width: "100%" }}
                  >
                    <option value="auto">auto (painel de tela)</option>
                    <option value="panel">painel (aspect real, sem corte)</option>
                    <option value="cover">cover (preenche, corta laterais)</option>
                  </select>
                  <div style={{ fontSize: 10, color: "#888", margin: "8px 0 2px" }}>
                    Zoom (Ken Burns) {Math.round((clip.kenBurns ?? 0) * 100)}%
                  </div>
                  <input
                    type="range" min={0} max={0.15} step={0.01}
                    value={clip.kenBurns ?? 0}
                    onPointerDown={beginEdit}
                    onChange={(e) => liveUpdate({ timeline: setClipKenBurns(timeline, sel, Number(e.target.value)), fxPlan })}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </section>
          )}

          <section style={{ ...box, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Áudio & dinâmica</div>
            <div style={{ fontSize: 11, color: captionSource === "transcript" ? "#2DE2C8" : "#FF8C42", marginBottom: 8 }}>
              {captionSource === "transcript"
                ? "✓ Legendas da transcrição real (suas gravações)"
                : "⚠ Legendas estimadas pelo roteiro (sem transcript)"}
            </div>
            {captionSource !== "transcript" && (
              <div style={{ marginBottom: 10 }}>
                <button
                  style={{ ...btn, width: "100%", background: preparing && preparing.state !== "error" ? "#1a1a24" : "#7B5BFF", fontWeight: 700 }}
                  onClick={prepareCreative}
                  disabled={!!preparing && !["error"].includes(preparing.state)}
                  title="Transcreve as gravações (Whisper) e gera a montagem narração-driven (assembly) automaticamente"
                >
                  {!preparing || preparing.state === "error"
                    ? "⚙ Preparar criativo (transcrição + montagem)"
                    : preparing.state === "transcribing"
                      ? "⏳ Transcrevendo gravações…"
                      : preparing.state === "assembling"
                        ? "⏳ Gerando montagem…"
                        : "⏳ Preparando…"}
                </button>
                {preparing?.state === "error" && (
                  <div style={{ fontSize: 10, color: "#FF4D2E", marginTop: 4 }}>{preparing.error}</div>
                )}
              </div>
            )}
            {autocutInfo.length > 0 && (
              <div style={{ fontSize: 10, color: "#888", marginBottom: 8, lineHeight: 1.5 }}>
                Silêncio detectado:{" "}
                {autocutInfo.map((a) => `${a.role} ${a.silenceSeconds}s`).join(" · ")}
              </div>
            )}
            <button
              style={{ ...btn, width: "100%", background: autocutOn ? "#2DE2C8" : "#1a1a24", color: autocutOn ? "#06121a" : "#fff", fontWeight: 700 }}
              onClick={() => guardedAutocut(() => setAutocutOn((v) => !v))}
            >
              {autocutOn ? "✂ Auto-cut ATIVO — reverter" : "✂ Auto-cut silêncios"}
            </button>
            {autocutOn && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
                  <span>Agressividade</span>
                  <span style={{ color: "#2DE2C8" }}>cortar pausas &gt; {maxGap.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={0.9}
                  step={0.05}
                  // invertido: slider à direita = mais agressivo = limiar menor
                  value={1.05 - maxGap}
                  onChange={(e) => guardedAutocut(() => setMaxGap(Number((1.05 - Number(e.target.value)).toFixed(2))))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555" }}>
                  <span>suave</span>
                  <span>agressivo</span>
                </div>
              </div>
            )}
          </section>

          {/* Camadas extras — SFX, trilha, overlays inseríveis */}
          <section style={{ ...box, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>🎚️ Camadas extras</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button style={{ ...btn, flex: 1, fontSize: 12 }} onClick={() => apply({ timeline: addLayer(timeline, "audio", "SFX/Trilha"), fxPlan })}>＋ Áudio</button>
              <button style={{ ...btn, flex: 1, fontSize: 12 }} onClick={() => apply({ timeline: addLayer(timeline, "video", "Overlay"), fxPlan })}>＋ Overlay</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button style={{ ...btn, flex: 1, fontSize: 12 }} onClick={() => apply({ timeline: addElementLayer(timeline, "video", "Texto", makeTextElement(currentFrame, timeline.fps)), fxPlan })}>＋ Texto</button>
            </div>
            {(timeline.extraLayers ?? []).length === 0 && (
              <div style={{ fontSize: 10, color: "#666" }}>Nenhuma camada. Adicione uma trilha/SFX ou overlay.</div>
            )}
            {(timeline.extraLayers ?? []).map((L) => {
              const pool = [...assets.uploads, ...assets.materials, ...assets.library].filter((a) => assetLayerKind(a.kind) === L.kind);
              return (
                <div key={L.id} style={{ ...box, padding: 8, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>
                      {L.kind === "audio" ? "♪" : "▦"} {L.name} · {L.clips.length}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...btn, padding: "2px 8px", fontSize: 11 }} onClick={() => setPickerFor(pickerFor === L.id ? "" : L.id)}>＋ clip</button>
                      <button style={{ ...btn, padding: "2px 8px", fontSize: 11 }} onClick={() => apply({ timeline: removeLayer(timeline, L.id), fxPlan })}>🗑</button>
                    </div>
                  </div>
                  {pickerFor === L.id && (
                    <div style={{ marginTop: 6, maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                      {pool.length === 0 && <div style={{ fontSize: 10, color: "#666" }}>Sem assets {L.kind}. Solte arquivos em public/library/.</div>}
                      {pool.map((a) => (
                        <button
                          key={a.url}
                          style={{ ...btn, textAlign: "left", fontSize: 10, padding: "4px 6px" }}
                          onClick={() => {
                            const dur = Math.max(30, Math.min(timeline.fps * 5, timeline.durationInFrames - currentFrame));
                            const isAudio = a.kind === "audio";
                            apply({ timeline: addLayerClip(timeline, L.id, { type: assetElementType(a.kind), src: a.url, label: baseName(a.name), startFrame: currentFrame, durationInFrames: dur, ...(isAudio ? { volume: 1 } : { opacity: 1 }) }), fxPlan });
                            setPickerFor("");
                          }}
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {selectedLayerClip && (() => {
              const [lid, cid] = selectedLayerClip.split("/");
              const layer = (timeline.extraLayers ?? []).find((L) => L.id === lid);
              const cl = layer?.clips.find((c) => c.id === cid);
              if (!layer || !cl) return null;
              const t = elementType(layer.kind, cl);
              const patch = (p: Partial<typeof cl>) => apply({ timeline: setElementParams(timeline, lid, cid, p), fxPlan });
              const live = (p: Partial<typeof cl>) => liveUpdate({ timeline: setElementParams(timeline, lid, cid, p), fxPlan });
              return (
                <div style={{ ...box, padding: 8, marginTop: 8, borderColor: "#fff" }}>
                  <div style={{ fontSize: 11, color: "#fff", marginBottom: 6 }}>Elemento: {cl.label} <span style={{ color: "#666" }}>· {t}</span></div>

                  {t === "media-audio" && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: "#888" }}>Volume {Math.round((cl.volume ?? 1) * 100)}%</div>
                      <input type="range" min={0} max={1} step={0.05} value={cl.volume ?? 1}
                        onPointerDown={beginEdit}
                        onChange={(e) => live({ volume: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                  )}

                  {t === "text" && (
                    <>
                      <textarea key={`txt-${cid}`} defaultValue={cl.text ?? ""} rows={2}
                        onBlur={(e) => patch({ text: e.target.value })}
                        style={{ ...btn, width: "100%", cursor: "text", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                        <input type="number" min={16} max={200} defaultValue={cl.fontSize ?? 64} key={`fs-${cid}`}
                          onBlur={(e) => patch({ fontSize: Number(e.target.value) })} title="Tamanho (px)"
                          style={{ ...btn, width: 70 }} />
                        <input type="color" value={cl.color ?? "#FFFFFF"}
                          onChange={(e) => patch({ color: e.target.value })} title="Cor"
                          style={{ ...btn, width: 44, padding: 2 }} />
                      </div>
                    </>
                  )}

                  {/* Transform (posição/escala/opacidade) — elementos visuais */}
                  {t !== "media-audio" && (
                    <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 }}>
                      <div style={{ fontSize: 10, color: "#888" }}>Posição X {Math.round(cl.x ?? 50)}%</div>
                      <input type="range" min={0} max={100} value={cl.x ?? 50} onPointerDown={beginEdit} onChange={(e) => live({ x: Number(e.target.value) })} style={{ width: "100%" }} />
                      <div style={{ fontSize: 10, color: "#888" }}>Posição Y {Math.round(cl.y ?? 50)}%</div>
                      <input type="range" min={0} max={100} value={cl.y ?? 50} onPointerDown={beginEdit} onChange={(e) => live({ y: Number(e.target.value) })} style={{ width: "100%" }} />
                      <div style={{ fontSize: 10, color: "#888" }}>Escala {Math.round((cl.scale ?? 1) * 100)}%</div>
                      <input type="range" min={0.1} max={3} step={0.05} value={cl.scale ?? 1} onPointerDown={beginEdit} onChange={(e) => live({ scale: Number(e.target.value) })} style={{ width: "100%" }} />
                      <div style={{ fontSize: 10, color: "#888" }}>Opacidade {Math.round((cl.opacity ?? 1) * 100)}%</div>
                      <input type="range" min={0} max={1} step={0.05} value={cl.opacity ?? 1} onPointerDown={beginEdit} onChange={(e) => live({ opacity: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                  )}

                  {/* Animações de entrada e saída — todos os tipos de elemento */}
                  {(() => {
                    const anim = (w: "animateIn" | "animateOut") => cl[w] ?? { type: "none" as AnimType, durationInFrames: 8 };
                    const setAnim = (w: "animateIn" | "animateOut", p: Partial<{ type: AnimType; durationInFrames: number }>) =>
                      patch({ [w]: { ...anim(w), ...p } } as Partial<typeof cl>);
                    return (
                      <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 }}>
                        <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Animação</div>
                        {(["animateIn", "animateOut"] as const).map((w) => (
                          <div key={w} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: "#888", width: 46 }}>{w === "animateIn" ? "Entrada" : "Saída"}</span>
                            <select value={anim(w).type} onChange={(e) => setAnim(w, { type: e.target.value as AnimType })} style={{ ...btn, flex: 1, fontSize: 11 }}>
                              {(["none", "fade", "slide", "zoom"] as const).map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <input type="number" min={1} max={60} value={anim(w).durationInFrames}
                              onChange={(e) => setAnim(w, { durationInFrames: Math.max(1, Number(e.target.value)) })}
                              title="frames" style={{ ...btn, width: 50 }} />
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <button style={{ ...btn, width: "100%", fontSize: 11, marginTop: 8 }} onClick={() => { apply({ timeline: removeLayerClip(timeline, lid, cid), fxPlan }); setSelectedLayerClip(""); }}>🗑 Remover elemento</button>
                </div>
              );
            })()}
          </section>

          {soundFindings.length > 0 && (
            <section style={{ ...box, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>🔊 Sound design — revisão</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {soundFindings.map((f) => (
                  <div key={f.id} style={{ fontSize: 10, color: "#bbb", borderLeft: `2px solid ${f.severity === "aviso" ? "#FF8C42" : "#2DE2C8"}`, paddingLeft: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
                      <span>{f.message}</span>
                      {typeof f.atMs === "number" && (
                        <button onClick={() => seek(Math.round((f.atMs! / 1000) * timeline.fps))} title="Ir para o ponto" style={{ ...btn, padding: "0 6px", fontSize: 10 }}>▶</button>
                      )}
                    </div>
                    {f.suggestion && <div style={{ color: "#777", marginTop: 2 }}>{f.suggestion}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section style={{ ...box, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Hook FX</div>
            <select
              value={fxPlan.hookRenderer}
              onChange={(e) => apply({ timeline, fxPlan: setHookRenderer(fxPlan, e.target.value as HookRenderer) })}
              style={{ ...btn, width: "100%" }}
            >
              {HOOKS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>

            <div style={{ fontSize: 12, color: "#888", margin: "12px 0 8px" }}>Destaque de palavra</div>
            <select
              value={fxPlan.captionRenderer}
              onChange={(e) => apply({ timeline, fxPlan: setCaptionRenderer(fxPlan, e.target.value as CaptionRenderer) })}
              style={{ ...btn, width: "100%" }}
            >
              {CAPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </section>

          <section style={{ ...box, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
              Legendas — {cues.length} cues
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Modelo</div>
            <select
              value={styleId}
              onChange={(e) => { setStyleId(e.target.value); setSelectedCue(-1); }}
              style={{ ...btn, width: "100%" }}
            >
              {CAPTION_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <div style={{ fontSize: 11, color: "#888", margin: "12px 0 6px" }}>
              {selectedCue >= 0 && cues[selectedCue]
                ? `Editar cue ${selectedCue + 1}/${cues.length}`
                : "Clique numa cue na faixa T para editar"}
            </div>
            {selectedCue >= 0 && cues[selectedCue] && (
              <textarea
                key={`cue-${selectedCue}-${cues[selectedCue].startMs}`}
                defaultValue={cues[selectedCue].words.map((w) => w.text).join(" ")}
                onBlur={(e) => {
                  const cue = cues[selectedCue];
                  apply({
                    timeline,
                    fxPlan: {
                      ...fxPlan,
                      captions: editCueText(fxPlan.captions, cue.startMs, cue.endMs, e.target.value),
                    },
                  });
                }}
                rows={2}
                style={{ ...btn, width: "100%", cursor: "text", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
              />
            )}
          </section>
        </aside>
      </div>

      {/* ── Faixa inferior: timeline NLE ────────────────────────────────── */}
      <TimelineView
        timeline={timeline}
        fxPlan={fxPlan}
        currentFrame={currentFrame}
        pps={pps}
        selectedIndex={sel}
        mediaBaseUrl={mediaBaseUrl}
        onSelectClip={(i) => { setSel(i); setSelectedLayerClip(""); }}
        onSeek={seek}
        onTrimStart={beginEdit}
        onTrim={(index, deltaFrames) => liveUpdate({ timeline: trimClip(timeline, index, deltaFrames), fxPlan })}
        onTrimStartLeft={(index, deltaFrames) => liveUpdate({ timeline: trimClipStart(timeline, index, deltaFrames), fxPlan })}
        razorMode={razorMode}
        onReorder={(from, to) => apply({ timeline: reorderClip(timeline, from, to), fxPlan })}
        onSplit={(index, atFrame) => { apply({ timeline: splitClip(timeline, index, atFrame), fxPlan }); setRazorMode(false); }}
        cues={cues}
        selectedCue={selectedCue}
        onSelectCue={(i) => { setSelectedCue(i); setSelectedLayerClip(""); }}
        onCueShift={(i, deltaFrames) => {
          const cue = cues[i];
          if (!cue) return;
          const deltaMs = (deltaFrames / timeline.fps) * 1000;
          liveUpdate({ timeline, fxPlan: { ...fxPlan, captions: shiftCaptions(fxPlan.captions, cue.startMs, cue.endMs, deltaMs) } });
        }}
        selectedAudio={selectedAudio}
        onSelectAudio={(id) => { setSelectedAudio(id); setSelectedLayerClip(""); }}
        onNarrShift={(delta) => liveUpdate({ timeline: shiftNarration(timeline, delta), fxPlan })}
        onSegMove={(segIndex, delta) => liveUpdate({ timeline: moveAudioSegment(timeline, segIndex, delta), fxPlan })}
        onAssetDrop={handleAssetDrop}
        selectedLayerClip={selectedLayerClip}
        onSelectLayerClip={(layerId, clipId) => { setSelectedLayerClip(`${layerId}/${clipId}`); setSelectedCue(-1); setSelectedAudio(""); }}
        onLayerClipMove={(layerId, clipId, delta) => liveUpdate({ timeline: moveLayerClip(timeline, layerId, clipId, delta), fxPlan })}
        onLayerClipTrim={(layerId, clipId, delta) => liveUpdate({ timeline: trimLayerClip(timeline, layerId, clipId, delta), fxPlan })}
        onAudioTrim={(blockId, delta) => {
          if (blockId.startsWith("talk-")) {
            const idx = Number(blockId.slice(5));
            if (idx >= 0 && idx < timeline.videoTrack.length) {
              liveUpdate({ timeline: trimClip(timeline, idx, delta), fxPlan });
            }
          } else if (blockId.startsWith("narr-")) {
            const segIndex = Number(blockId.slice(5));
            liveUpdate({ timeline: resizeAudioSegment(timeline, segIndex, delta), fxPlan });
          }
        }}
      />
    </div>
  );
}

export default function Studio() {
  return (
    <Suspense fallback={<main style={{ display: "grid", placeItems: "center", height: "100vh", color: "#B5B5C0", background: "#08080e" }}>Carregando…</main>}>
      <StudioInner />
    </Suspense>
  );
}
