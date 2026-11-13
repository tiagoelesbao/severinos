#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
design_creative.py — Pipeline unificado do comando *design-creative.

Encadeia os motores num comando só:
  1. deep_modeler   — modela o brief a partir do benchmark
  2. analyze_benchmark / plan_creative / recast_engine / quality_gate
  3. orchestrate_*  — renderiza o criativo final

Cada cliente tem seu próprio brand-identity, brand-config E templates.yaml.
O templates.yaml define quais templates estão disponíveis por output_type
(carousel | single) e recomenda templates a partir do bench_type (vídeo,
post único ou carrossel da fonte).

Uso (forma curta — compatível com versões anteriores):
  python design_creative.py <benchmark_dir> <single|carousel> [--client=<slug>]
                            [--image-mode=pexels|brand|ai] [--template=<id>]

Uso (forma completa — fluxo de 6 passos do agente):
  python design_creative.py <benchmark_dir> <single|carousel> \\
    --client=<slug> \\
    --bench-platform=instagram \\
    --bench-type=carousel \\
    --template=carousel-news \\
    [--image-mode=pexels|brand|ai]

Sem --template, o script consulta templates.yaml.scoring_match[output_type]
[from_<bench_type>] e usa o PRIMEIRO ID da lista como default.
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

# Raiz do projeto (este arquivo está em squads/virals-marketing-squad/scripts/).
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
PY = sys.executable


def _run(label, cmd, fatal=True):
    print(f"\n{'=' * 64}\n>> {label}\n{'=' * 64}")
    rc = subprocess.run([PY] + cmd, cwd=ROOT).returncode
    if rc != 0 and fatal:
        print(f"x {label} falhou (exit {rc}) — pipeline abortado.", file=sys.stderr)
        sys.exit(rc)
    return rc


def _load_generated_templates(client_slug):
    """Carrega templates GERADOS de generated-templates/*.spec.yaml (Frente A).

    Retorna {output_type: [entry, ...]}. Cada entry recebe `_spec_path` (path
    relativo do .spec.yaml), propagado ao orquestrador via --template-spec.
    """
    out = {"carousel": [], "single": []}
    if not client_slug:
        return out
    gdir = os.path.join(
        ROOT, "squads", "virals-marketing-squad", "data", "clients",
        client_slug, "generated-templates",
    )
    if not os.path.isdir(gdir):
        return out
    for fn in sorted(os.listdir(gdir)):
        if not fn.endswith(".spec.yaml"):
            continue
        path = os.path.join(gdir, fn)
        try:
            with open(path, "r", encoding="utf-8") as f:
                entry = yaml.safe_load(f) or {}
        except yaml.YAMLError:
            continue
        if not entry.get("id"):
            continue
        entry["_spec_path"] = os.path.relpath(path, ROOT).replace("\\", "/")
        ot = entry.get("output_type", "carousel")
        out.setdefault(ot, []).append(entry)
    return out


def _load_client_templates(client_slug):
    """Carrega templates.yaml do cliente + mescla os templates gerados.

    Retorna None se o templates.yaml curado estiver ausente. Os templates
    gerados (Frente A) são anexados em memória — o templates.yaml NUNCA é
    reescrito.
    """
    if not client_slug:
        return None
    path = os.path.join(
        ROOT,
        "squads", "virals-marketing-squad", "data", "clients",
        client_slug, "templates.yaml",
    )
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    # Mescla os templates gerados (não-destrutivo).
    generated = _load_generated_templates(client_slug)
    templates = data.setdefault("templates", {})
    for output_type, entries in generated.items():
        if entries:
            templates.setdefault(output_type, [])
            templates[output_type].extend(entries)
    return data


def _list_templates_for(templates_yaml, output_type):
    """Retorna lista de templates disponíveis para o output_type."""
    if not templates_yaml:
        return []
    return (templates_yaml.get("templates") or {}).get(output_type, []) or []


def _resolve_template_id(templates_yaml, output_type, bench_type, explicit_id):
    """Resolve o template_id a usar.

    1. Se `explicit_id` foi passado e existe no registry → usa-o.
    2. Caso contrário, consulta scoring_match[output_type][from_<bench_type>]
       e usa o primeiro item da lista.
    3. Se nada bater, devolve None (o orquestrador usará seu fallback heurístico).

    Retorna tupla (template_id, template_id_render, spec_path) para o render
    switch. `spec_path` é o path do .spec.yaml quando o template é GERADO
    (Frente A); None para templates curados.
    """
    if not templates_yaml:
        return explicit_id, explicit_id, None
    templates = _list_templates_for(templates_yaml, output_type)
    by_id = {t["id"]: t for t in templates if "id" in t}

    def _unpack(entry):
        return (
            entry["id"],
            entry.get("template_id_render", entry["id"]),
            entry.get("_spec_path"),
        )

    if explicit_id and explicit_id in by_id:
        return _unpack(by_id[explicit_id])

    if explicit_id and explicit_id not in by_id:
        # Talvez o usuário tenha passado um template_id_render legado
        # (ex.: "carousel-slide", "single-post"). Devolve direto.
        return explicit_id, explicit_id, None

    # Auto-pick via scoring_match
    scoring = (templates_yaml.get("scoring_match") or {}).get(output_type) or {}
    bench_key = f"from_{bench_type}" if bench_type else None
    candidates = scoring.get(bench_key) or scoring.get("from_single") or []
    for cand_id in candidates:
        if cand_id in by_id:
            return _unpack(by_id[cand_id])

    # Fallback: primeiro template registrado para esse output_type
    if templates:
        return _unpack(templates[0])

    return None, None, None


def _generate_template_from_bench(benchmark_dir, ctype, client):
    """Roda o gerador (Frente A) e captura TEMPLATE_ID + SPEC_PATH do stdout.

    Retorna (template_id, spec_path) ou (None, None) se falhar.
    """
    gen = "squads/virals-marketing-squad/scripts/generate_template_from_benchmark.py"
    cmd = [PY, gen, benchmark_dir, ctype]
    if client:
        cmd.append(f"--client={client}")
    print(f"\n{'=' * 64}\n>> Frente A — Gerando template a partir do benchmark"
          f"\n{'=' * 64}")
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    # Ecoa a saída do gerador para o usuário.
    if proc.stdout:
        print(proc.stdout, end="")
    if proc.stderr:
        print(proc.stderr, end="", file=sys.stderr)
    if proc.returncode != 0:
        print("x Geração de template falhou — caindo para resolução normal.",
              file=sys.stderr)
        return None, None
    template_id = spec_path = None
    for line in (proc.stdout or "").splitlines():
        if line.startswith("TEMPLATE_ID="):
            template_id = line.split("=", 1)[1].strip()
        elif line.startswith("SPEC_PATH="):
            spec_path = line.split("=", 1)[1].strip()
    return template_id, spec_path


def _render_blockers(brief):
    """Lista motivos para BLOQUEAR o render — copy de qualidade é pré-condição.

    MCI-06: pure function (testável sem I/O). Bloqueia quando a copy ainda é
    o OCR cru de fallback ou contém fabricação não resolvida.
    """
    reasons = []
    v = brief.get("_validation", {}) or {}
    if str(v.get("status", "")).upper() == "FAIL":
        reasons.append("_validation.status = FAIL (recast não aplicado)")
    if v.get("fact_fidelity_unresolved"):
        reasons.append(
            f"números fabricados não resolvidos: {v['fact_fidelity_unresolved']}")
    if v.get("qualitative_unresolved"):
        reasons.append(
            f"fabricação qualitativa não resolvida: {v['qualitative_unresolved']}")
    pending, placeholder = [], []
    for s in brief.get("content_data", []) or []:
        pstatus = str((s.get("personalization", {}) or {}).get("status", "")).upper()
        if pstatus == "PENDING_RECAST":
            pending.append(s.get("slide_n"))
        if "[RECAST PENDENTE]" in str(s.get("headline", "")):
            placeholder.append(s.get("slide_n"))
    if pending:
        reasons.append(f"slides com recast pendente: {pending}")
    if placeholder:
        reasons.append(f"slides com headline placeholder: {placeholder}")
    return reasons


def _render_blockers_from_path(brief_path):
    """Carrega o brief e devolve os motivos de bloqueio (lista vazia = liberado)."""
    try:
        with open(os.path.join(ROOT, brief_path), "r", encoding="utf-8") as f:
            return _render_blockers(yaml.safe_load(f) or {})
    except (OSError, yaml.YAMLError) as e:
        print(f"AVISO: não consegui inspecionar o brief para o gate ({e}); "
              "deixando o render seguir.", file=sys.stderr)
        return []


def design_creative(benchmark_dir, ctype, image_mode="pexels", template=None,
                    client=None, bench_type=None, bench_platform=None,
                    generate_template=False, force=False, plan_only=False):
    benchmark_dir = benchmark_dir.rstrip("/\\")
    slug = os.path.basename(benchmark_dir)
    prefix = "brief-v5-single" if ctype == "single" else "brief-v5"
    brief = f"squads/virals-marketing-squad/data/{prefix}-{slug}.yaml"

    client_label = client or "virals (default)"

    # ── Frente A — gerar um template novo a partir do benchmark (opcional) ──
    # Roda ANTES da resolução para que o id gerado seja encontrado no merge.
    if generate_template:
        gen_id, _gen_spec = _generate_template_from_bench(benchmark_dir, ctype, client)
        if gen_id:
            template = gen_id  # força a resolução a usar o template recém-gerado

    # ── Resolução de template via templates.yaml do cliente (+ gerados) ──
    templates_yaml = _load_client_templates(client or "virals")
    resolved_id, render_id, spec_path = _resolve_template_id(
        templates_yaml, ctype, bench_type, template
    )

    print(f"*design-creative — {slug}")
    print(f"  client:         {client_label}")
    print(f"  output_type:    {ctype}")
    print(f"  bench_type:     {bench_type or '(não especificado)'}")
    print(f"  bench_platform: {bench_platform or '(não especificado)'}")
    print(f"  image_mode:     {image_mode}")
    print(f"  template input: {template or '(auto via scoring_match)'}")
    print(f"  template id:    {resolved_id or '(fallback do orquestrador)'}")
    print(f"  render id:      {render_id or '(default)'}")
    if spec_path:
        print(f"  template spec:  {spec_path} (gerado)")

    eng = "squads/virals-marketing-squad/scripts"
    client_flag = [f"--client={client}"] if client else []
    # MCI-05: propaga bench_type para o deep_modeler (informa o adapter).
    bench_type_flag = [f"--bench-type={bench_type}"] if bench_type else []

    # Etapa 1/6 — Modelagem. O client_slug é INJETADO no brief.
    # MCI-06: a Etapa 1 é fatal SÓ em falha real (sem brief / exit 1). Extração
    # incompleta (deep_modeler exit 2 = validation FAIL, mas brief salvo) NÃO
    # aborta — o recast plan-aware reconstrói/funde os slides e o gate de copy
    # (pré-render) decide se renderiza. Abortar aqui era o que deixava a copy
    # como OCR cru (o recast nunca era alcançado).
    rc1 = _run("Etapa 1/6 - Modelagem (deep_modeler)",
               [f"{eng}/deep_modeler.py", benchmark_dir, ctype] + client_flag + bench_type_flag,
               fatal=False)
    if rc1 == 1 or not os.path.exists(os.path.join(ROOT, brief)):
        print(f"x Modelagem falhou de fato (sem brief produzido, exit {rc1}) — "
              "pipeline abortado.", file=sys.stderr)
        sys.exit(rc1 or 1)
    if rc1 != 0:
        print("AVISO: extração incompleta (validation FAIL) — seguindo mesmo "
              "assim; o plan/recast reconstrói o conteúdo e o gate de copy "
              "(MCI-06) decide o render.")

    # Etapa 2/6 — Análise Holística do benchmark (NÃO-FATAL).
    _run("Etapa 2/6 - Análise Holística (analyze_benchmark)",
         [f"{eng}/analyze_benchmark.py", brief], fatal=False)

    # Etapas 3-5 — Planejamento, Recast e Quality Gate.
    # Cada uma resolve o cliente via --client OU via client_slug já persistido no brief.
    _run("Etapa 3/6 - Planejamento (plan_creative)",
         [f"{eng}/plan_creative.py", brief] + client_flag, fatal=False)

    # --plan-only (*planning-modeling, 2026-08-17): para AQUI — o objetivo desta
    # chamada é só o Plano de Modelagem (brief modelado + analisado + planejado
    # na voz do cliente), sem recast/quality_gate/render. Etapas 4-6 continuam
    # sendo o caminho de *design-creative completo (produção de fato).
    if plan_only:
        print(f"\n{'=' * 64}\nBRIEF_PATH={brief}\nOK — *planning-modeling (plan-only) concluido: {slug} "
              f"(cliente: {client_label})\n{'=' * 64}")
        return

    rc = _run("Etapa 4/6 - Recast (recast_engine)",
              [f"{eng}/recast_engine.py", brief] + client_flag, fatal=False)
    if rc != 0:
        print("AVISO: recast indisponível — seguindo com o brief modelado "
              "(recast pendente; o render usará o conteúdo de referência).")

    _run("Etapa 5/6 - Quality Gate (quality_gate)",
         [f"{eng}/quality_gate.py", brief], fatal=False)

    # ── MCI-06: GATE BLOQUEANTE — a qualidade da copy é pré-condição do render ──
    # Inverte a lógica antiga (Etapas 2-5 não-fatais entregavam OCR cru). Se a
    # copy não passou (FAIL / PENDING_RECAST / placeholder / fabricação), o
    # render é BARRADO — a menos que --force seja passado conscientemente.
    blockers = _render_blockers_from_path(brief)
    if blockers:
        print(f"\n{'=' * 64}")
        if not force:
            print("x RENDER BLOQUEADO (MCI-06) — a copy não passou nos gates:")
            for b in blockers:
                print(f"   - {b}")
            print("\nConserte a copy (re-rode recast/quality_gate com LLM "
                  "disponível) ou use --force para renderizar assim mesmo.")
            print('=' * 64)
            sys.exit(2)
        print("AVISO: render FORÇADO (--force) apesar de:")
        for b in blockers:
            print(f"   - {b}")
        print('=' * 64)

    # Etapa 6/6 — Render (fatal).
    orchestrator = (
        "squads/virals-marketing-squad/scripts/orchestrate_post_single.py"
        if ctype == "single"
        else "squads/virals-marketing-squad/scripts/orchestrate_carousel.py"
    )
    render_cmd = [orchestrator, brief]
    if ctype != "single":
        render_cmd.append(f"--image-mode={image_mode}")
    # Passa o render_id (string que o switch do render/page.tsx entende),
    # não o `template` solicitado pelo usuário (que pode ser um id do registry).
    # MKT-MC4-08: orchestrate_post_single agora também aceita --template.
    if render_id:
        render_cmd.append(f"--template={render_id}")
    # Frente A: templates gerados carregam uma spec que dirige o
    # BenchmarkDerivedSlide. Propaga o path para o orquestrador injetar nos props.
    if spec_path:
        render_cmd.append(f"--template-spec={spec_path}")
    _run("Etapa 6/6 - Render (orchestrate)", render_cmd)

    print(f"\n{'=' * 64}\nOK — *design-creative concluido: {slug} "
          f"(cliente: {client_label})\n{'=' * 64}")


def _list_templates_cli(client_slug):
    """Imprime os templates do cliente para inspeção (--list-templates)."""
    tpls = _load_client_templates(client_slug or "virals")
    if not tpls:
        print(f"templates.yaml ausente para cliente '{client_slug or 'virals'}'")
        return
    print(f"=== Templates de '{(tpls.get('meta') or {}).get('cliente','?')}' ===")
    for output_type in ("carousel", "single"):
        items = _list_templates_for(tpls, output_type)
        print(f"\n[{output_type}] ({len(items)} disponíveis)")
        for t in items:
            status = t.get("preview_status", "?")
            if t.get("generated"):
                badge = "✨ gerado"
            elif status == "ready":
                badge = "✅ ready"
            else:
                badge = f"🟡 {status}"
            print(f"  - {t.get('id'):<30} {badge:<22}  {t.get('label')}")
            if t.get("description"):
                print(f"    └ {t['description']}")


if __name__ == "__main__":
    rest = []
    image_mode = "pexels"
    template = None
    client = None
    bench_type = None
    bench_platform = None
    show_templates = False
    generate_template = False
    force = False
    plan_only = False

    for a in sys.argv[1:]:
        if a.startswith("--image-mode="):
            image_mode = a.split("=", 1)[1].strip()
        elif a.startswith("--template="):
            template = a.split("=", 1)[1].strip() or None
        elif a.startswith("--client="):
            client = a.split("=", 1)[1].strip() or None
        elif a.startswith("--bench-type="):
            bench_type = a.split("=", 1)[1].strip() or None
        elif a.startswith("--bench-platform="):
            bench_platform = a.split("=", 1)[1].strip() or None
        elif a == "--list-templates":
            show_templates = True
        elif a == "--generate-template":
            generate_template = True
        elif a == "--force":
            force = True
        elif a == "--plan-only":
            plan_only = True
        else:
            rest.append(a)

    if show_templates:
        _list_templates_cli(client)
        sys.exit(0)

    if len(rest) < 2 or rest[1] not in ("single", "carousel"):
        print(
            "Uso: python squads/virals-marketing-squad/scripts/design_creative.py \\\n"
            "       <benchmark_dir> <single|carousel> \\\n"
            "       [--client=<slug>] \\\n"
            "       [--bench-platform=instagram|tiktok|youtube|linkedin] \\\n"
            "       [--bench-type=video|single|carousel] \\\n"
            "       [--template=<id-from-templates.yaml>] \\\n"
            "       [--generate-template] \\\n"
            "       [--force] \\\n"
            "       [--plan-only] \\\n"
            "       [--image-mode=pexels|brand|ai]\n\n"
            "  --generate-template  cria um NOVO template a partir do benchmark\n"
            "                       (Frente A) e o usa neste render.\n"
            "  --force              renderiza mesmo que o gate de copy (MCI-06)\n"
            "                       acuse FAIL/recast pendente/fabricação.\n"
            "  --plan-only          para depois da Etapa 3 (plan_creative) —\n"
            "                       só o Plano de Modelagem, sem recast/render.\n"
            "                       Usado por *planning-modeling.\n\n"
            "Liste os templates disponíveis para um cliente:\n"
            "  python design_creative.py --list-templates --client=<slug>"
        )
        sys.exit(1)

    design_creative(
        rest[0], rest[1],
        image_mode=image_mode,
        template=template,
        client=client,
        bench_type=bench_type,
        bench_platform=bench_platform,
        generate_template=generate_template,
        force=force,
        plan_only=plan_only,
    )
