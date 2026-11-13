#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_audit_benchmark.py — Pipeline *audit-benchmark.

Lê os criativos já extraídos pelo *creative-benchmark e roda auditorias LLM
por agente, personalizadas via data/clients/<slug>/audit-config.yaml.

Cada agente audita conforme uma LENTE específica para o cliente — focos,
dimensões de score, palavras-tabu, paleta visual. O brand-identity do cliente
é injetado como contexto rígido (o agente NÃO inventa nada fora dali).

Pipeline:
    *daily-monitor → *creative-benchmark → [*audit-benchmark] → síntese

Usage:
    python run_audit_benchmark.py --client=<slug> --date=YYYY-MM-DD \\
        --platforms=instagram,tiktok \\
        [--agents=mrbeast-mk,garyvee-mk,ladeira,casey-neistat-img,sam-kolder-vid] \\
        [--skip-chief-synthesis]

Output:
    workspaces/businesses/<slug>/marketing/daily-monitoring/<date>/benchmark/
        <platform>/<rank>-<handle>-<hash>/
            Análise.md     (placeholders → auditorias preenchidas)
        _audit-summary-<date>.md   (ranking + síntese estratégica)
        _audit-summary-<date>.json (machine-readable)
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys

# Garante UTF-8 no Windows
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Reusa o resolver de cliente e o motor LLM multi-provider do squad
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML ausente. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

from _client_resolver import resolve_client  # noqa: E402
from recast_engine import call_llm  # noqa: E402


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

REGISTRY_PATH = "squads/virals-marketing-squad/data/clients/_registry.yaml"
TRANSCRICAO_MAX_CHARS = 7000
CAPTION_MAX_CHARS = 1800


def load_yaml(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_audit_config_path(client_slug: str) -> str:
    """Resolve o path do audit-config.yaml — registry primeiro, convenção como fallback."""
    if os.path.exists(REGISTRY_PATH):
        reg = load_yaml(REGISTRY_PATH)
        entry = (reg.get("clients") or {}).get(client_slug, {}) or {}
        explicit = entry.get("audit_config")
        if explicit and os.path.exists(explicit):
            return explicit
    convention = f"squads/virals-marketing-squad/data/clients/{client_slug}/audit-config.yaml"
    if not os.path.exists(convention):
        raise FileNotFoundError(
            f"audit-config.yaml ausente para cliente '{client_slug}'. "
            f"Esperado em: {convention}"
        )
    return convention


def slugify_section(label: str) -> str:
    s = re.sub(r"[^\w\s-]", "", label.lower(), flags=re.UNICODE)
    s = re.sub(r"[\s-]+", "_", s).strip("_")
    return s[:60] or "section"


def extract_json(text: str) -> dict:
    """Extrai o primeiro JSON válido do texto, tolerando cercas e ruído."""
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1).strip()
    else:
        a, b = cleaned.find("{"), cleaned.rfind("}")
        if a != -1 and b > a:
            cleaned = cleaned[a:b + 1]
    return json.loads(cleaned)


# ──────────────────────────────────────────────────────────────────────────────
# Descoberta de criativos
# ──────────────────────────────────────────────────────────────────────────────

def find_benchmark_creatives(workspace_dir: str, date: str, platforms: list) -> list:
    """Retorna lista de dicts com bench/transcricao/analise_path."""
    base = os.path.join(workspace_dir, "daily-monitoring", date, "benchmark")
    if not os.path.isdir(base):
        return []
    creatives = []
    for plat in platforms:
        plat_dir = os.path.join(base, plat)
        if not os.path.isdir(plat_dir):
            continue
        for entry in sorted(os.listdir(plat_dir)):
            folder = os.path.join(plat_dir, entry)
            if not os.path.isdir(folder):
                continue
            bench_path = os.path.join(folder, "Benchmark.json")
            trans_path = os.path.join(folder, "Transcrição.md")
            analise_path = os.path.join(folder, "Análise.md")
            if not (os.path.isfile(bench_path) and os.path.isfile(analise_path)):
                continue
            with open(bench_path, "r", encoding="utf-8") as f:
                bench = json.load(f)
            # VEX-14: criativo degradado (vídeo não baixado, análise de capa/
            # metadados) NÃO entra na auditoria. Auditar metadados produz o
            # veredito falso "falta de bastidor/evidência" que o benchmark de
            # 2026-07-11 gerou. O fail-loud marca item_status; honramos aqui.
            if bench.get("item_status") in ("degraded", "failed"):
                print(f"  ⏭️  {entry}: ignorado ({bench.get('item_status')} — {bench.get('status_reason', 'sem análise real')})")
                continue
            transcricao = ""
            if os.path.isfile(trans_path):
                with open(trans_path, "r", encoding="utf-8") as f:
                    transcricao = f.read()
            creatives.append({
                "creative_id": entry,
                "platform": plat,
                "folder": folder,
                "analise_path": analise_path,
                "bench": bench,
                "transcricao": transcricao,
            })
    return creatives


# ──────────────────────────────────────────────────────────────────────────────
# Seleção de agentes por tipo
# ──────────────────────────────────────────────────────────────────────────────

def normalize_type(t: str) -> str:
    return (t or "").lower().strip().replace("-", "_")


def applies_to_creative(agent_cfg: dict, bench_type_str: str, subtype_str: str) -> bool:
    """Checa se o agente aplica ao tipo do criativo via `applies_to_types`."""
    applies = agent_cfg.get("applies_to_types")
    if not applies:
        return True
    norm_t = normalize_type(bench_type_str)
    norm_s = normalize_type(subtype_str)
    for declared in applies:
        d = normalize_type(declared)
        if d == norm_t or d == norm_s or d in norm_t or d in norm_s:
            return True
    return False


def select_agents_for_creative(audit_config: dict, requested: list,
                               bench_type: str, subtype: str) -> list:
    cfg_agents = audit_config.get("agents", {}) or {}
    out = []
    for agent_id in requested:
        cfg = cfg_agents.get(agent_id)
        if not cfg:
            continue
        if applies_to_creative(cfg, bench_type, subtype):
            out.append(agent_id)
    return out


# ──────────────────────────────────────────────────────────────────────────────
# Construção de prompt
# ──────────────────────────────────────────────────────────────────────────────

def build_brand_context_block(brand_identity: dict, audit_config: dict) -> str:
    fields = (audit_config.get("context_inject", {})
              .get("always_load_from_brand_identity", []) or [])
    excerpt = {k: brand_identity.get(k) for k in fields if k in brand_identity}
    return yaml.dump(excerpt, allow_unicode=True, sort_keys=False, width=120)


def build_creative_block(creative: dict) -> str:
    b = creative["bench"]
    caption = (b.get("description") or "")[:CAPTION_MAX_CHARS]
    transcricao = (creative["transcricao"] or "")[:TRANSCRICAO_MAX_CHARS]
    duration = b.get("duration_seconds")
    duration_str = f" · {duration}s" if duration else ""
    return (
        f"Plataforma: {b.get('platform','')} ({b.get('subtype','')})\n"
        f"Tipo: {b.get('type','')}{duration_str}\n"
        f"Criador: {b.get('creator','')}\n"
        f"URL: {b.get('url','')}\n"
        f"Rank no daily-monitor: #{b.get('rank','?')}\n"
        f"Screenshots no bundle: {b.get('screenshots_count','?')}\n"
        f"\n"
        f"CAPTION/DESCRIÇÃO ORIGINAL:\n{caption or '(sem caption)'}\n"
        f"\n"
        f"TRANSCRIÇÃO/ANÁLISE VISUAL (extraída pelo creative-benchmark):\n"
        f"{transcricao or '(sem transcrição)'}"
    )


def build_audit_prompt(agent_id: str, agent_cfg: dict,
                       brand_context: str, creative_block: str,
                       client_paths) -> str:
    role = agent_cfg.get("role", agent_id)
    persona = (agent_cfg.get("persona_summary") or "").strip()
    lens = (agent_cfg.get("lens_for_client") or "").strip()
    score_dims = "\n".join(f"  - {d}" for d in agent_cfg.get("score_dimensions", []))
    score_anchor = (agent_cfg.get("score_anchor") or "").strip()
    sections = agent_cfg.get("output_sections", []) or []
    section_keys = [slugify_section(s) for s in sections]
    sections_spec = ",\n".join(f'    "{k}": "..."' for k in section_keys)

    return f"""Você é {role} (@{agent_id}) auditando um criativo viral para o cliente {client_paths.nome_exibicao} ({client_paths.handle_instagram}).

PERSONA:
{persona}

LENTE DE AUDITORIA PARA ESTE CLIENTE:
{lens}

CONTEXTO DE MARCA DO CLIENTE (fonte única — não invente nada fora disto):
<<<
{brand_context}
>>>

DIMENSÕES DE SCORE (avalie cada uma mentalmente):
{score_dims}

ÂNCORA DE SCORE (use para calibrar):
{score_anchor}

CRIATIVO A AUDITAR:
<<<
{creative_block}
>>>

Produza a auditoria em JSON válido, sem markdown wrapper, no formato EXATO:
{{
  "score": <float entre 1 e 10>,
  "veredito": "modelar" | "adaptar" | "inspirar" | "ignorar",
  "modelable_for_client": true|false,
  "key_findings": ["...", "..."],
  "sections": {{
{sections_spec}
  }},
  "lexico_flags": ["palavra-tabu detectada no criativo", ...],
  "adaptacao_obrigatoria": "uma frase clara sobre o que MUDAR para servir ao cliente"
}}

Regras:
- score é decimal (ex: 7.5).
- veredito: "modelar" = reaplicável direto; "adaptar" = estrutura serve, requer reframe; "inspirar" = pegar o princípio sem o formato; "ignorar" = não usar.
- key_findings: 3 a 5 bullets concretos vindos da sua especialidade.
- sections: preencha cada chave com 2-4 frases (markdown permitido dentro da string).
- lexico_flags: lista vazia se nenhuma palavra-tabu foi detectada.
- adaptacao_obrigatoria: 1 frase clara, acionável.

NUNCA invente bordões/léxico/oferta que não estejam no contexto do cliente.
NUNCA pontue como "modelar" se o criativo violar restrições do brand-identity."""


# ──────────────────────────────────────────────────────────────────────────────
# Execução de auditorias
# ──────────────────────────────────────────────────────────────────────────────

def run_one_audit(agent_id: str, agent_cfg: dict, brand_context: str,
                  creative: dict, client_paths) -> dict:
    creative_block = build_creative_block(creative)
    prompt = build_audit_prompt(agent_id, agent_cfg, brand_context,
                                creative_block, client_paths)
    text, model = call_llm(prompt, max_retries=2)
    try:
        parsed = extract_json(text)
    except Exception as e:
        return {"error": f"parse_failed: {e}", "raw": text[:2000], "_model": model}
    parsed["_model"] = model
    return parsed


def compute_total_score(audits: dict, weights: dict) -> float:
    """Média ponderada dos scores dos agentes que efetivamente rodaram (sem erro).
    Os pesos são renormalizados pelos agentes presentes — designers ausentes
    não puxam a média para baixo.
    """
    total_w = 0.0
    total = 0.0
    for agent_id, audit in audits.items():
        if "error" in audit:
            continue
        s = audit.get("score")
        if s is None:
            continue
        try:
            s = float(s)
        except Exception:
            continue
        w = float(weights.get(agent_id, 0.0)) or 1.0
        total_w += w
        total += w * s
    if total_w == 0:
        return None
    return round(total / total_w, 2)


def classify(score: float, thresholds: dict) -> str:
    if score is None:
        return "—"
    if score >= float(thresholds.get("excelente", 8.0)):
        return "Excelente 🟢"
    if score >= float(thresholds.get("bom", 6.0)):
        return "Bom 🟡"
    if score >= float(thresholds.get("mediano", 4.0)):
        return "Mediano 🟠"
    return "Fraco 🔴"


def veredito_from_score(score: float, table: list) -> str:
    if score is None:
        return "ignorar"
    for row in table or []:
        try:
            if score >= float(row.get("if_score_gte", 0)):
                return row.get("veredito", "ignorar")
        except Exception:
            continue
    return "ignorar"


# ──────────────────────────────────────────────────────────────────────────────
# Renderização Markdown
# ──────────────────────────────────────────────────────────────────────────────

def render_agent_audit_md(agent_id: str, agent_cfg: dict, audit: dict) -> str:
    role = agent_cfg.get("role", "")
    if "error" in audit:
        return (f"### @{agent_id} — {role}\n\n"
                f"_❌ Auditoria não concluída: {audit['error']}_\n")
    score = audit.get("score", "?")
    veredito = audit.get("veredito", "?")
    modelable = "✅" if audit.get("modelable_for_client") else "⚠️"
    lines = [
        f"### @{agent_id} — {role}",
        "",
        f"**Score:** {score}/10  ·  **Veredito:** `{veredito}`  ·  **Modelable:** {modelable}",
        "",
    ]
    kfs = audit.get("key_findings") or []
    if kfs:
        lines.append("**Key findings:**")
        for kf in kfs:
            lines.append(f"- {kf}")
        lines.append("")
    sec_data = audit.get("sections") or {}
    for sec_label in agent_cfg.get("output_sections", []):
        key = slugify_section(sec_label)
        content = sec_data.get(key) or sec_data.get(sec_label)
        if not content:
            continue
        lines.append(f"**{sec_label}:**")
        lines.append("")
        lines.append(str(content).strip())
        lines.append("")
    flags = audit.get("lexico_flags") or []
    if flags:
        lines.append(f"**🚩 Léxico-flags:** {', '.join(flags)}")
        lines.append("")
    adapt = (audit.get("adaptacao_obrigatoria") or "").strip()
    if adapt:
        lines.append(f"**🔄 Adaptação obrigatória:** {adapt}")
        lines.append("")
    return "\n".join(lines)


def render_chief_synthesis_md(audits: dict, total_score, classification,
                              veredito_dominante: str) -> str:
    adapts = []
    flags_all = []
    for a in audits.values():
        if "error" in a:
            continue
        ad = (a.get("adaptacao_obrigatoria") or "").strip()
        if ad:
            adapts.append(ad)
        for f in (a.get("lexico_flags") or []):
            flags_all.append(f)
    score_str = f"{total_score:.1f}/10" if isinstance(total_score, (int, float)) else "—"
    lines = [
        "### Síntese Final (@marketing-chief)",
        "",
        f"**📈 Score ponderado:** {score_str}  ·  **Classificação:** {classification}  ·  **Veredito dominante:** `{veredito_dominante}`",
        "",
    ]
    if adapts:
        lines.append("**Adaptações obrigatórias consolidadas (do painel):**")
        for a in adapts:
            lines.append(f"- {a}")
        lines.append("")
    if flags_all:
        # de-dup preservando ordem
        seen = set()
        uniq = []
        for f in flags_all:
            f = (f or "").strip()
            if f and f.lower() not in seen:
                uniq.append(f)
                seen.add(f.lower())
        lines.append(f"**🚩 Léxico-flags cross-agent:** {', '.join(uniq)}")
        lines.append("")
    return "\n".join(lines)


def update_analise_md(analise_path: str, marker: str, total_score, classification,
                      audits_md: str, chief_md: str) -> None:
    with open(analise_path, "r", encoding="utf-8") as f:
        content = f.read()
    header = (
        f"{marker}\n\n"
        f"_Auditoria automatizada via *audit-benchmark — personalizada por "
        f"cliente via audit-config.yaml._\n\n"
    )
    if marker in content:
        idx = content.index(marker)
        body = content[:idx] + header + audits_md.rstrip() + "\n\n" + chief_md.rstrip() + "\n"
    else:
        body = content.rstrip() + "\n\n" + header + audits_md.rstrip() + "\n\n" + chief_md.rstrip() + "\n"
    with open(analise_path, "w", encoding="utf-8") as f:
        f.write(body)


# ──────────────────────────────────────────────────────────────────────────────
# Síntese estratégica cross-criativo (Chief, opcional LLM)
# ──────────────────────────────────────────────────────────────────────────────

def build_chief_synthesis_prompt(client_paths, date: str, results: list,
                                 audit_config: dict) -> str:
    """Síntese rigorosa, ancorada nos dados — sem invenção.

    O prompt força cada bullet a citar `creative_id` em colchetes (ou `[cross: id1+id2+...]`
    para padrões cross-criativo), permitindo validação automática pós-LLM.
    """
    rows = []
    valid_ids = []
    for r in results:
        valid_ids.append(r["creative_id"])
        verdicts = [a.get("veredito") for a in r["audits"].values()
                    if "veredito" in a and "error" not in a]
        dominant = max(set(verdicts), key=verdicts.count) if verdicts else "—"
        agent_lines = []
        for ag, ad in r["audits"].items():
            if "error" in ad:
                continue
            agent_lines.append(
                f"    @{ag}: score={ad.get('score','?')} · veredito={ad.get('veredito','?')} · "
                f"adaptacao_obrigatoria=\"{(ad.get('adaptacao_obrigatoria') or '')[:200]}\""
            )
        # Inclui também 1-2 key findings por agente, que são o material concreto da auditoria
        findings_lines = []
        for ag, ad in r["audits"].items():
            if "error" in ad:
                continue
            kfs = ad.get("key_findings") or []
            for kf in kfs[:2]:
                findings_lines.append(f"    [@{ag}] {kf}")
        rows.append(
            f"\n• {r['creative_id']} (rede={r['platform']}, tipo={r['type']}, "
            f"score_total={r.get('total_score','—')}, veredito_dominante={dominant})\n"
            + "\n".join(agent_lines) +
            ("\n  key_findings:\n" + "\n".join(findings_lines) if findings_lines else "")
        )
    rows_block = "\n".join(rows)
    valid_ids_csv = ", ".join(valid_ids)

    return f"""Você é o @marketing-chief (CMO orquestrador) consolidando a auditoria de benchmarks
para o cliente {client_paths.nome_exibicao} ({client_paths.handle_instagram}). Data: {date}.

═══════════════════════════════════════════════════════════════
REGRAS INEGOCIÁVEIS — VIOLAR INVALIDA O OUTPUT INTEIRO
═══════════════════════════════════════════════════════════════

1. **ZERO INVENÇÃO.** Você SÓ pode citar fatos, padrões, números e elementos que aparecem
   EXPLICITAMENTE no bloco "DADOS DA AUDITORIA" abaixo. Se um detalhe não está lá, NÃO existe.

2. **CITAÇÃO OBRIGATÓRIA.** Todo bullet de toda lista DEVE começar com `[<creative_id>]` para
   observações por criativo, ou `[cross: id1, id2, ...]` para padrões cross-criativo
   (mínimo 2 creative_ids reais). Sem citação = bullet inválido.

3. **IDs PERMITIDOS** (use SOMENTE estes — não invente outros):
   {valid_ids_csv}

4. **PROIBIDO inventar exemplos** como "screenshots de dashboards", "código IA", "trechos
   de código", "gráficos de campanha" se essas palavras não estão nas key_findings ou
   adaptacao_obrigatoria abaixo. Se você não viu, NÃO ESCREVA.

5. **PROIBIDO** se referir a "versões adaptadas por @agente" — não houve adaptação real,
   apenas auditoria. Os agentes RECOMENDARAM adaptações; não as executaram.

═══════════════════════════════════════════════════════════════
DADOS DA AUDITORIA (ÚNICA FONTE DE VERDADE)
═══════════════════════════════════════════════════════════════
{rows_block}

═══════════════════════════════════════════════════════════════
TAREFA — Produza JSON válido (sem markdown wrapper) no formato:
═══════════════════════════════════════════════════════════════

{{
  "padroes_cross_criativo": [
    "[cross: id1, id2, id3] descrição do padrão observado nos dados (mín 2 ids)",
    "..."
  ],
  "criativos_modelar_diretamente": ["<creative_id>", "..."],
  "criativos_inspirar": ["<creative_id>", "..."],
  "criativos_ignorar": ["<creative_id>", "..."],
  "leituras_estrategicas": [
    "[cross: id1, id2] observação estratégica fundamentada nos dados",
    "..."
  ],
  "proximos_passos": [
    "[<creative_id>] ação concreta vinculada a esse criativo",
    "..."
  ]
}}

CRITÉRIO PARA AS LISTAS de criativos:
- modelar_diretamente: veredito_dominante == "modelar" OU score_total >= 8.0
- inspirar: veredito_dominante == "inspirar" OU (score_total entre 4.0 e 6.0)
- ignorar: veredito_dominante == "ignorar" OU score_total < 4.0

CRITÉRIO PARA os padrões e leituras:
- Mínimo 2 creative_ids reais por bullet (em `[cross: ...]`)
- O padrão DEVE aparecer em key_findings ou adaptacao_obrigatoria de pelo menos 2 criativos
- Se não há padrão suficientemente robusto, gere lista MENOR — preferir 2 sólidos a 5 inventados

CRITÉRIO PARA próximos_passos:
- Cada bullet deve citar 1 creative_id real e propor 1 ação concreta
- Ações válidas: "rodar *design-creative para gerar [output] inspirado em [id]",
  "rodar *industrialize-video usando padrão de [id]", "descartar e refazer baseando em [id]"

EXEMPLO DE BULLET VÁLIDO:
  "[cross: 01-hormozi-b9937e, 03-hormozi-6a6e2d] Uso de prova social via revista People +
   pose casual de founder ressoa como autoridade humanizada."

EXEMPLO DE BULLET INVÁLIDO (rejeitado):
  "Bastidores reais (celular, gravações de tela, códigos) são o gatilho principal de engajamento"
  → INVÁLIDO: não cita creative_id; inventa "gravações de tela" e "códigos" que não estão nos dados.

Responda APENAS o JSON, sem texto antes/depois."""


# Regex pré-compiladas para validação pós-LLM
_BULLET_CITATION_RE = re.compile(
    r"^\s*\[(?:cross:\s*)?([A-Za-z0-9_\-,\s]+)\]"
)


def validate_synthesis(synthesis: dict, valid_ids: list) -> tuple:
    """Filtra bullets que violam a regra de citação.

    Para cada lista textual (padroes_cross_criativo, leituras_estrategicas,
    proximos_passos), exige que o bullet comece com `[<id>]` ou `[cross: id1, id2, ...]`
    e que TODOS os ids citados pertençam a `valid_ids`.

    Para listas de creative_id puras (criativos_*), normaliza para apenas ids válidos.

    Retorna (synthesis_filtrada, warnings_list).
    """
    valid_set = {i.strip() for i in valid_ids}
    warnings = []

    def _parse_citation(line: str):
        m = _BULLET_CITATION_RE.match(line)
        if not m:
            return None
        raw = m.group(1)
        # Aceita ids separados por vírgula ou "+"
        parts = re.split(r"[,+]", raw)
        ids = [p.strip() for p in parts if p.strip()]
        return ids

    def _filter_text_list(key: str, min_ids: int = 1):
        items = synthesis.get(key) or []
        kept = []
        for it in items:
            if not isinstance(it, str):
                continue
            ids = _parse_citation(it)
            if not ids:
                warnings.append(f"{key}: bullet sem citação descartado → '{it[:80]}…'")
                continue
            invalid = [i for i in ids if i not in valid_set]
            if invalid:
                warnings.append(
                    f"{key}: bullet com id inválido {invalid} descartado → '{it[:80]}…'"
                )
                continue
            if len(ids) < min_ids:
                warnings.append(
                    f"{key}: bullet com {len(ids)} id (precisa {min_ids}) descartado → '{it[:80]}…'"
                )
                continue
            kept.append(it)
        synthesis[key] = kept

    _filter_text_list("padroes_cross_criativo", min_ids=2)
    _filter_text_list("leituras_estrategicas", min_ids=2)
    _filter_text_list("proximos_passos", min_ids=1)

    def _filter_id_list(key: str):
        items = synthesis.get(key) or []
        kept = []
        for it in items:
            if not isinstance(it, str):
                continue
            it = it.strip().strip("[]")
            if it in valid_set:
                kept.append(it)
            else:
                warnings.append(f"{key}: id inválido descartado → '{it}'")
        # Preserva ordem e remove duplicatas
        seen = set()
        kept_unique = []
        for k in kept:
            if k not in seen:
                kept_unique.append(k)
                seen.add(k)
        synthesis[key] = kept_unique

    _filter_id_list("criativos_modelar_diretamente")
    _filter_id_list("criativos_inspirar")
    _filter_id_list("criativos_ignorar")

    return synthesis, warnings


def render_chief_strategic_md(synthesis: dict, validation_warnings=None) -> str:
    if not synthesis or "error" in synthesis:
        return ("## 🧠 Síntese Estratégica (@marketing-chief)\n\n"
                f"_Síntese LLM não concluída: {synthesis.get('error','sem dados') if synthesis else 'sem dados'}_\n")
    out = ["## 🧠 Síntese Estratégica (@marketing-chief)", ""]
    model = synthesis.get("_model")
    if model:
        out.append(f"_Gerada via `{model}` · validada por regra de citação obrigatória._")
        out.append("")
    sec = [
        ("Padrões cross-criativo", "padroes_cross_criativo"),
        ("Criativos para modelar diretamente", "criativos_modelar_diretamente"),
        ("Criativos para inspirar (reescrita pesada)", "criativos_inspirar"),
        ("Criativos a ignorar", "criativos_ignorar"),
        ("Leituras estratégicas", "leituras_estrategicas"),
        ("Próximos passos", "proximos_passos"),
    ]
    for title, key in sec:
        items = synthesis.get(key) or []
        if not items:
            out.append(f"### {title}")
            out.append("")
            out.append("_Nenhum item válido sob a regra de citação._")
            out.append("")
            continue
        out.append(f"### {title}")
        out.append("")
        for it in items:
            out.append(f"- {it}")
        out.append("")
    if validation_warnings:
        out.append("<details><summary>⚠️ Itens descartados pela validação de citação</summary>")
        out.append("")
        for w in validation_warnings:
            out.append(f"- {w}")
        out.append("")
        out.append("</details>")
        out.append("")
    return "\n".join(out)


# ──────────────────────────────────────────────────────────────────────────────
# Render do summary consolidado
# ──────────────────────────────────────────────────────────────────────────────

def render_summary_md(client_paths, date: str, results: list,
                      chief_md: str, audit_config: dict,
                      agents_requested: list) -> str:
    lines = [
        f"# Audit Benchmark Summary · {date}",
        "",
        f"**Cliente:** {client_paths.nome_exibicao} (`{client_paths.slug}`)  ·  "
        f"**Handle:** {client_paths.handle_instagram}",
        f"**Total auditados:** {len(results)}  ·  "
        f"**Agentes solicitados:** {', '.join(agents_requested)}",
        f"**Personalização:** audit-config.yaml + brand-identity.yaml",
        "",
        "## 🏆 Ranking (score ponderado)",
        "",
        "| # | Plataforma | Criador | Tipo | Score | Classificação | Veredito | Pasta |",
        "| ---: | :--- | :--- | :--- | ---: | :--- | :--- | :--- |",
    ]
    sorted_r = sorted(results, key=lambda r: (r.get("total_score") or 0), reverse=True)
    for i, r in enumerate(sorted_r, 1):
        s = r.get("total_score")
        s_str = f"**{s:.1f}**" if isinstance(s, (int, float)) else "—"
        cls = r.get("classification", "—")
        verdicts = [a.get("veredito") for a in r["audits"].values()
                    if "veredito" in a and "error" not in a]
        dominant = max(set(verdicts), key=verdicts.count) if verdicts else "—"
        lines.append(
            f"| {i} | {r['platform']} | {r['creator']} | {r['type']} | {s_str} | {cls} | `{dominant}` | `{r['folder_rel']}` |"
        )
    lines.append("")
    lines.append(chief_md)
    lines.append("")
    lines.append("## 📂 Auditorias Detalhadas (por criativo)")
    lines.append("")
    for r in sorted_r:
        lines.append(
            f"- **{r['creative_id']}** · {r['creator']} · {r['type']} · "
            f"`{r.get('classification','—')}` → "
            f"[Análise.md]({r['folder_rel']}/Análise.md)"
        )
    lines.append("")
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Pipeline *audit-benchmark.")
    ap.add_argument("--client", required=True, help="Slug do cliente (ex.: virals, tiago-elesbao)")
    ap.add_argument("--date", required=True, help="Data do batch em YYYY-MM-DD")
    ap.add_argument("--platforms", default="instagram", help="CSV: instagram,tiktok,youtube,linkedin")
    ap.add_argument("--agents", default="", help="CSV de agentes (vazio = painel default + designers do audit-config)")
    ap.add_argument("--skip-chief-synthesis", action="store_true",
                    help="Pula a síntese LLM cross-criativo do Chief (apenas computa scores)")
    ap.add_argument("--synthesis-only", action="store_true",
                    help="Não re-roda agentes; carrega _audit-summary-<date>.json existente e "
                         "regenera APENAS a síntese estratégica do Chief (barato, para iterar prompt)")
    ap.add_argument("--max-synthesis-retries", type=int, default=2,
                    help="Quantas vezes tentar gerar a síntese se a validação rejeitar todos os bullets")
    args = ap.parse_args()

    client_slug = args.client.strip()
    date = args.date.strip()
    platforms = [p.strip() for p in args.platforms.split(",") if p.strip()]

    # Resolve cliente + carrega configs
    try:
        client_paths = resolve_client(client_slug)
    except (ValueError, FileNotFoundError) as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(2)

    audit_cfg_path = get_audit_config_path(client_slug)
    audit_config = load_yaml(audit_cfg_path)
    brand_identity = load_yaml(client_paths.brand_identity)

    panel = audit_config.get("audit_panel", {}) or {}
    default_agents = list(panel.get("default", []))
    designers = list((panel.get("designers_by_type") or {}).values())
    designers_unique = list(dict.fromkeys(designers))

    requested = [a.strip() for a in args.agents.split(",") if a.strip()]
    if not requested:
        requested = default_agents + designers_unique

    print("=" * 60)
    print(f"=== Audit Benchmark ===")
    print(f"Cliente:    {client_paths.nome_exibicao} ({client_slug})")
    print(f"Data:       {date}")
    print(f"Plataformas: {', '.join(platforms)}")
    print(f"Agentes:    {', '.join(requested)}")
    print(f"Config:     {audit_cfg_path}")
    print(f"Identity:   {client_paths.brand_identity}")
    print("=" * 60)

    scoring = audit_config.get("scoring", {}) or {}
    weights = scoring.get("weights", {}) or {}
    thresholds = scoring.get("classification", {}) or {}
    veredito_table = scoring.get("veredito_decision_table", []) or []
    marker = (audit_config.get("output", {}) or {}).get(
        "placeholder_marker", "## 🧠 Espaço para Auditorias Especializadas"
    )
    bench_root = os.path.join(client_paths.workspace_dir, "daily-monitoring", date, "benchmark")

    # ── Modo --synthesis-only: carrega resultados pré-existentes ──
    if args.synthesis_only:
        out_cfg_pre = audit_config.get("output", {}) or {}
        prev_json = os.path.join(
            bench_root,
            out_cfg_pre.get("summary_json", "_audit-summary-{date}.json").format(date=date),
        )
        if not os.path.isfile(prev_json):
            print(f"❌ --synthesis-only exige {prev_json} pré-existente.")
            sys.exit(4)
        with open(prev_json, "r", encoding="utf-8") as f:
            prev = json.load(f)
        results = prev.get("results") or []
        # `agents_requested` herdado salvo se o usuário não passar --agents explicitamente
        if not args.agents:
            requested = prev.get("agents_requested") or requested
        print(f"♻️  Modo --synthesis-only: {len(results)} criativos carregados de {prev_json}")
        creatives = []  # bypassa o laço per-creative
    else:
        creatives = find_benchmark_creatives(client_paths.workspace_dir, date, platforms)
        if not creatives:
            print(f"❌ Nenhum criativo em "
                  f"{client_paths.workspace_dir}/daily-monitoring/{date}/benchmark/")
            print(f"   Rode antes: *creative-benchmark --client={client_slug} --date={date}")
            sys.exit(3)
        print(f"📂 Criativos encontrados: {len(creatives)}")
        results = []

    brand_context = build_brand_context_block(brand_identity, audit_config)

    for i, c in enumerate(creatives, 1):
        bench_type = c["bench"].get("type", "") or ""
        subtype = c["bench"].get("subtype", "") or ""
        type_label = f"{bench_type}/{subtype}" if subtype else bench_type
        print(f"\n[{i}/{len(creatives)}] {c['creative_id']} ({type_label}) — {c['bench'].get('creator','')}")

        applicable = select_agents_for_creative(audit_config, requested, bench_type, subtype)
        if not applicable:
            print(f"  ⚠️ Nenhum agente aplicável ao tipo '{type_label}', pulando.")
            continue

        audits = {}
        audits_md_parts = []
        for agent_id in applicable:
            cfg = audit_config["agents"][agent_id]
            print(f"  > @{agent_id}…", end=" ", flush=True)
            try:
                audit = run_one_audit(agent_id, cfg, brand_context, c, client_paths)
                if "error" in audit:
                    print(f"❌ {audit['error']}")
                else:
                    print(f"✅ score={audit.get('score','?')} veredito={audit.get('veredito','?')}")
            except Exception as e:
                audit = {"error": str(e)}
                print(f"❌ {e}")
            audits[agent_id] = audit
            audits_md_parts.append(render_agent_audit_md(agent_id, cfg, audit))

        total = compute_total_score(audits, weights)
        cls = classify(total, thresholds)
        veredito_dominante = veredito_from_score(total, veredito_table)

        chief_md = render_chief_synthesis_md(audits, total, cls, veredito_dominante)
        audits_md = "\n\n---\n\n".join(audits_md_parts)
        update_analise_md(c["analise_path"], marker, total, cls, audits_md, chief_md)

        rel = os.path.relpath(c["folder"], bench_root).replace("\\", "/")
        results.append({
            "creative_id": c["creative_id"],
            "platform": c["platform"],
            "creator": c["bench"].get("creator", ""),
            "type": type_label,
            "url": c["bench"].get("url", ""),
            "rank": c["bench"].get("rank"),
            "audits": audits,
            "total_score": total,
            "classification": cls,
            "veredito_dominante": veredito_dominante,
            "folder_rel": rel,
        })

    # ── Síntese estratégica cross-criativo (LLM, opcional) ──
    chief_synthesis_md = "## 🧠 Síntese Estratégica (@marketing-chief)\n\n_Pulada via --skip-chief-synthesis._\n"
    chief_synthesis_json = None
    validation_warnings: list = []
    if not args.skip_chief_synthesis and results:
        print(f"\n🧠 Gerando síntese estratégica do @marketing-chief…")
        valid_ids = [r["creative_id"] for r in results]
        attempt = 0
        max_attempts = max(1, int(args.max_synthesis_retries))
        chief_synthesis_json = None
        while attempt < max_attempts:
            attempt += 1
            try:
                prompt = build_chief_synthesis_prompt(client_paths, date, results, audit_config)
                text, model = call_llm(prompt, max_retries=2)
                parsed = extract_json(text)
                parsed["_model"] = model
                # ── Pós-validação: filtra bullets que não citam creative_id válido ──
                parsed, warnings = validate_synthesis(parsed, valid_ids)
                validation_warnings = warnings
                # Conta quantos bullets úteis sobraram
                kept_total = sum(
                    len(parsed.get(k) or [])
                    for k in (
                        "padroes_cross_criativo", "criativos_modelar_diretamente",
                        "criativos_inspirar", "criativos_ignorar",
                        "leituras_estrategicas", "proximos_passos",
                    )
                )
                discarded = len(warnings)
                print(f"  Tentativa {attempt}: model={model} · "
                      f"bullets_válidos={kept_total} · descartados={discarded}")
                if kept_total > 0:
                    chief_synthesis_json = parsed
                    break
                print(f"  ⚠️  Tentativa {attempt}: TODOS os bullets foram descartados. "
                      f"Re-tentando com mesmo prompt (LLM pode retornar diferente).")
            except Exception as e:
                print(f"  ❌ Tentativa {attempt} falhou: {e}")
        if chief_synthesis_json:
            chief_synthesis_md = render_chief_strategic_md(chief_synthesis_json, validation_warnings)
            print(f"  ✅ Síntese OK após {attempt} tentativa(s) "
                  f"(model={chief_synthesis_json.get('_model','?')})")
        else:
            chief_synthesis_md = render_chief_strategic_md(
                {"error": f"todas as {max_attempts} tentativas foram descartadas pela validação"},
                validation_warnings,
            )
            print(f"  ❌ Síntese rejeitada após {max_attempts} tentativas")

    # ── Persiste summary ──
    out_cfg = audit_config.get("output", {}) or {}
    summary_md_name = out_cfg.get("summary_file", "_audit-summary-{date}.md").format(date=date)
    summary_json_name = out_cfg.get("summary_json", "_audit-summary-{date}.json").format(date=date)
    summary_md_path = os.path.join(bench_root, summary_md_name)
    summary_json_path = os.path.join(bench_root, summary_json_name)

    summary_md = render_summary_md(client_paths, date, results, chief_synthesis_md,
                                   audit_config, requested)
    with open(summary_md_path, "w", encoding="utf-8") as f:
        f.write(summary_md)

    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "client": client_slug,
            "client_display": client_paths.nome_exibicao,
            "date": date,
            "platforms": platforms,
            "agents_requested": requested,
            "audit_config": audit_cfg_path,
            "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
            "synthesis_only": bool(args.synthesis_only),
            "results": results,
            "chief_synthesis": chief_synthesis_json,
            "validation_warnings": validation_warnings,
        }, f, ensure_ascii=False, indent=2, default=str)

    # ── Relatório final em stdout ──
    ok = sum(1 for r in results if r.get("total_score") is not None)
    fail = sum(1 for r in results
               if any("error" in a for a in r["audits"].values()))

    print("\n" + "=" * 60)
    print(f"🏁 AUDIT BENCHMARK COMPLETO")
    print(f"✅ Auditados:       {len(results)}/{len(creatives)}")
    print(f"   Com score total: {ok}")
    print(f"   Com falha parcial: {fail}")
    print(f"📄 Summary MD:    {summary_md_path}")
    print(f"📊 Summary JSON:  {summary_json_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
