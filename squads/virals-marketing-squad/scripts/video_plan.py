#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
video_plan.py — MVC-05: Orquestrador do *industrialize-video (fase de planejamento).

Etapa final da Fase A do EPIC-MKT-Video-Creative. Espelha o design_creative.py:
encadeia os 4 motores num comando só e entrega o PLANO legível para gravar.

  1. deep_modeler_video      — extrai a timeline do benchmark (MVC-01)
  2. analyze_video_benchmark — análise de retenção (MVC-02)
  3. plan_video_creative     — plano completo na voz do cliente (MVC-03)
  4. quality_gate_video      — gate terminal (MVC-04)
  5. GATE DE SAÍDA           — lê _validation.video_gate_status; FAIL bloqueia
                               (salvo --force)
  6. Plano-de-Criativo.md    — render legível (hook×3, storyboard, roteiro,
                               edit_spec, shotlist) no output_dir do cliente.

Uso:
  python video_plan.py <benchmark_dir> --client=<slug> [--bench-platform=...] [--force]
"""

import os
import sys
import subprocess

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML ausente. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
PY = sys.executable
ENG = "squads/virals-marketing-squad/scripts"

sys.path.insert(0, os.path.join(ROOT, ENG))
from _client_resolver import (  # noqa: E402
    extract_client_arg,
    resolve_from_argv_or_brief,
)


def _run(label, cmd, fatal=True):
    print(f"\n{'=' * 64}\n>> {label}\n{'=' * 64}")
    rc = subprocess.run([PY] + cmd, cwd=ROOT).returncode
    if rc != 0 and fatal:
        print(f"x {label} falhou (exit {rc}) — pipeline abortado.", file=sys.stderr)
        sys.exit(rc)
    return rc


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Gate de saída (pura — testável)
# ---------------------------------------------------------------------------
def is_blocked(brief, force=False):
    """True se a saída deve ser BARRADA (gate de vídeo = FAIL e sem --force)."""
    status = (brief.get("_validation", {}) or {}).get("video_gate_status")
    return status == "FAIL" and not force


def block_reasons(brief):
    """Razões legíveis do bloqueio (vazio = liberado)."""
    v = brief.get("_validation", {}) or {}
    if v.get("video_gate_status") != "FAIL":
        return []
    unresolved = v.get("video_fidelity_unresolved", {}) or {}
    reasons = []
    for key, label in (("numeros", "números fabricados"),
                       ("claims", "atribuições inventadas"),
                       ("tabu", "léxico-tabu"),
                       ("cta", "CTA proibido")):
        if unresolved.get(key):
            reasons.append(f"{label}: {unresolved[key]}")
    qg = brief.get("quality_gate_video", {}) or {}
    if qg.get("blocking_failures"):
        reasons.append(f"checks bloqueantes: {qg['blocking_failures']}")
    return reasons or ["gate de vídeo reprovado (FAIL)"]


# ---------------------------------------------------------------------------
# Render do Plano-de-Criativo.md (pura — testável)
# ---------------------------------------------------------------------------
def render_plan_md(brief):
    """Monta o Markdown legível do plano a partir do brief."""
    plan = brief.get("content_plan", {}) or {}
    source = brief.get("source", {}) or {}
    meta = brief.get("metadata", {}) or {}
    qg = brief.get("quality_gate_video", {}) or {}
    client = brief.get("client_nome") or brief.get("client_slug") or "?"

    L = []
    L.append(f"# Plano de Criativo de Vídeo — {client}")
    L.append("")
    L.append(f"> **Tema:** {plan.get('tema', '?')}  ")
    L.append(f"> **Conceito:** {plan.get('format_concept', '?')}  ")
    L.append(f"> **Duração-alvo:** ~{meta.get('duration_seconds', '?')}s  ")
    L.append(f"> **Benchmark-bússola:** {source.get('creator', '?')} "
             f"({source.get('platform', '?')}) — {source.get('url', '')}  ")
    gate_icon = {"PASS": "✅", "CONCERNS": "⚠️", "FAIL": "⛔"}.get(qg.get("status"), "—")
    L.append(f"> **Quality Gate:** {gate_icon} {qg.get('status', 'não rodado')}")
    L.append("")

    # Hook ×3
    L.append("## 🪝 Hook (0–3s) — 3 variantes para A/B")
    for i, v in enumerate((plan.get("hook", {}) or {}).get("variants", []) or [], 1):
        L.append(f"\n**Variante {i}**")
        L.append(f"- **Texto na tela:** {v.get('text_overlay', '')}")
        L.append(f"- **Pattern interrupt:** {v.get('pattern_interrupt', '')}")
        L.append(f"- **Fala de abertura:** {v.get('spoken_open', '')}")
    L.append("")

    # Storyboard
    L.append("## 🎬 Storyboard (batida-a-batida)")
    L.append("")
    L.append("| # | Cena | Plano | Dur. | Texto na tela | B-roll | Motion |")
    L.append("|---|------|-------|------|---------------|--------|--------|")
    for s in plan.get("storyboard", []) or []:
        L.append(f"| {s.get('beat_n', '')} | {s.get('scene', '')} | "
                 f"{s.get('shot_type', '')} | {s.get('duration_s', '')}s | "
                 f"{s.get('on_screen_text', '')} | {s.get('broll', '')} | "
                 f"{s.get('motion', '')} |")
    L.append("")

    # Roteiro
    L.append("## 📝 Roteiro (fala integral, na voz do cliente)")
    L.append("")
    L.append(plan.get("script", "_(sem roteiro)_"))
    L.append("")

    # Edit spec
    es = plan.get("edit_spec", {}) or {}
    L.append("## ✂️ Especificação de edição")
    for key, label in (("zooms", "Zooms"), ("transitions", "Transições"),
                       ("inserts", "Inserts / B-roll"), ("motion_graphics", "Motion graphics")):
        vals = es.get(key) or []
        if vals:
            L.append(f"- **{label}:** " + "; ".join(str(x) for x in vals))
    if es.get("captions"):
        L.append(f"- **Legendas:** {es['captions']}")
    L.append("")

    # Shotlist
    L.append("## 🎥 Shotlist — material bruto a gravar")
    L.append("")
    L.append("| # | Plano | Framing | Áudio | Props | Locação | Fala-chave |")
    L.append("|---|-------|---------|-------|-------|---------|------------|")
    for i, s in enumerate(plan.get("shotlist", []) or [], 1):
        L.append(f"| {i} | {s.get('plano', '')} | {s.get('framing', '')} | "
                 f"{s.get('audio', '')} | {s.get('props', '')} | "
                 f"{s.get('locacao', '')} | {s.get('falas_chave', '')} |")
    L.append("")

    if plan.get("rationale"):
        L.append("## 💡 Racional")
        L.append("")
        L.append(plan["rationale"])
        L.append("")

    fid = plan.get("fidelity_check", {}) or {}
    if fid:
        L.append(f"> Fidelidade (MVC-03): {fid.get('status', '?')}"
                 + (f" — suspeitos: {fid.get('fabricated_numbers')}"
                    if fid.get("fabricated_numbers") else "") + "  ")
    L.append("\n---\n*Gerado por `*industrialize-video` (EPIC-MKT-Video-Creative · Fase A).*")
    return "\n".join(L)


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------
def video_plan(benchmark_dir, client_slug=None, bench_platform=None, force=False):
    benchmark_dir = benchmark_dir.rstrip("/\\")
    slug = os.path.basename(benchmark_dir)
    brief = f"squads/virals-marketing-squad/data/video-brief-{slug}.yaml"

    client_flag = [f"--client={client_slug}"] if client_slug else []
    plat_flag = [f"--bench-platform={bench_platform}"] if bench_platform else []

    print(f"*industrialize-video (planejamento) — {slug}")
    print(f"  client:         {client_slug or 'virals (default)'}")
    print(f"  bench_platform: {bench_platform or '(não especificado)'}")

    # Etapa 1/4 — Modelagem (fatal só se não produzir brief; exit 2 = FAIL não-fatal).
    rc1 = _run("Etapa 1/4 - Modelagem (deep_modeler_video)",
               [f"{ENG}/deep_modeler_video.py", benchmark_dir] + client_flag + plat_flag,
               fatal=False)
    if rc1 == 1 or not os.path.exists(os.path.join(ROOT, brief)):
        print(f"x Modelagem falhou de fato (sem brief, exit {rc1}) — abortado.", file=sys.stderr)
        sys.exit(rc1 or 1)
    if rc1 != 0:
        print("AVISO: extração incompleta — seguindo; etapas seguintes decidem.")

    # Etapa 2/4 — Análise (não-fatal).
    _run("Etapa 2/4 - Análise de retenção (analyze_video_benchmark)",
         [f"{ENG}/analyze_video_benchmark.py", brief], fatal=False)

    # Etapa 3/4 — Plano (não-fatal: sem LLM, segue sem plano e o gate de saída barra).
    _run("Etapa 3/4 - Plano (plan_video_creative)",
         [f"{ENG}/plan_video_creative.py", brief] + client_flag, fatal=False)

    # Etapa 4/4 — Quality Gate de vídeo (não-fatal; grava o veredito).
    _run("Etapa 4/4 - Quality Gate (quality_gate_video)",
         [f"{ENG}/quality_gate_video.py", brief], fatal=False)

    # ── GATE DE SAÍDA — a qualidade/fidelidade é pré-condição da entrega ──────
    data = _load_yaml(os.path.join(ROOT, brief))
    if not data.get("content_plan"):
        print("\nx Sem content_plan (plano não gerado — LLM indisponível?) — "
              "nada a renderizar.", file=sys.stderr)
        sys.exit(2)

    if is_blocked(data, force):
        print(f"\n{'=' * 64}")
        print("x SAÍDA BLOQUEADA (MVC-05) — o gate de vídeo reprovou:")
        for r in block_reasons(data):
            print(f"   - {r}")
        print("\nConserte (re-rode com LLM disponível) ou use --force para "
              "renderizar assim mesmo.")
        print('=' * 64)
        sys.exit(2)

    # ── Render do Plano-de-Criativo.md ───────────────────────────────────────
    client = resolve_from_argv_or_brief(client_slug, data)
    out_dir = os.path.join(ROOT, client.output_dir.rstrip("/\\"), "video-plans", slug)
    os.makedirs(out_dir, exist_ok=True)
    md_path = os.path.join(out_dir, "Plano-de-Criativo.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_plan_md(data))

    rel = os.path.relpath(md_path, ROOT).replace("\\", "/")
    qg = (data.get("quality_gate_video", {}) or {}).get("status", "?")
    print(f"\n{'=' * 64}")
    print(f"OK — *industrialize-video (planejamento) concluído: {slug}")
    print(f"   Gate: {qg}")
    print(f"   Plano: {rel}")
    print("   Próximo: gravar o material da shotlist → (Fase B) editar no app de vídeo.")
    print('=' * 64)
    return md_path


if __name__ == "__main__":
    client_slug, _rest = extract_client_arg(sys.argv[1:])
    bench_platform = None
    force = False
    _filtered = []
    for a in _rest:
        if a.startswith("--bench-platform="):
            bench_platform = a.split("=", 1)[1].strip() or None
        elif a == "--force":
            force = True
        else:
            _filtered.append(a)
    _rest = _filtered

    if len(_rest) < 1:
        print("Uso: python squads/virals-marketing-squad/scripts/video_plan.py "
              "<benchmark_dir> [--client=<slug>] "
              "[--bench-platform=instagram|tiktok|youtube|linkedin] [--force]")
        sys.exit(1)

    video_plan(_rest[0], client_slug=client_slug,
               bench_platform=bench_platform, force=force)
