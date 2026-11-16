#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
video_templates.py — MVC-06: Loader/CLI do registry de templates de vídeo.

Carrega data/clients/<slug>/video-templates.yaml (packs de hook/legenda/
transição/motion) e recomenda IDs por hook_type via scoring_match. É a ponte
entre o plano (MVC-03) e o app de edição da Fase B (apps/video-studio).

CLI:
  python video_templates.py --list-video-templates --client=<slug>

API:
  load_video_templates(slug) -> dict | None
  list_for(data, category)   -> list
  recommend(data, hook_type) -> {"hook","caption","transition","motion"}  (IDs)
"""

import os
import sys

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

CATEGORIES = ("hook_packs", "caption_styles", "transition_packs", "motion_presets")
_HOOK_KEY = {
    "bold claim": "from_bold_claim",
    "curiosity gap": "from_curiosity_gap",
    "pattern interrupt": "from_pattern_interrupt",
}


def _registry_path(slug):
    return (f"squads/virals-marketing-squad/data/clients/"
            f"{slug or 'virals'}/video-templates.yaml")


def load_video_templates(slug=None):
    """Carrega o registry do cliente. Retorna None se ausente (degradação)."""
    path = _registry_path(slug)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def list_for(data, category):
    return (data or {}).get(category, []) or []


def _ids(data, category):
    return [t.get("id") for t in list_for(data, category) if t.get("id")]


def recommend(data, hook_type=None):
    """Recomenda 1 ID por categoria. hook via scoring_match[hook]; demais via
    scoring_match[<cat>].default. Fallback: 1º item registrado da categoria."""
    if not data:
        return {}
    scoring = data.get("scoring_match", {}) or {}

    # Hook por tipo
    hook_ids = _ids(data, "hook_packs")
    hook_pick = None
    hk = _HOOK_KEY.get((hook_type or "").strip().lower())
    cands = (scoring.get("hook", {}) or {}).get(hk or "", []) if hk else []
    for cid in cands:
        if cid in hook_ids:
            hook_pick = cid
            break
    if not hook_pick and hook_ids:
        hook_pick = hook_ids[0]

    def _pick(cat_key, category):
        defaults = (scoring.get(cat_key, {}) or {}).get("default", []) or []
        ids = _ids(data, category)
        for cid in defaults:
            if cid in ids:
                return cid
        return ids[0] if ids else None

    return {
        "hook": hook_pick,
        "caption": _pick("caption", "caption_styles"),
        "transition": _pick("transition", "transition_packs"),
        "motion": _pick("motion", "motion_presets"),
    }


def _list_cli(slug):
    data = load_video_templates(slug)
    if not data:
        print(f"video-templates.yaml ausente para cliente '{slug or 'virals'}'")
        return 1
    meta = data.get("meta", {}) or {}
    print(f"=== Video templates de '{meta.get('cliente', slug)}' "
          f"(v{meta.get('versao', '?')}) ===")
    for cat in CATEGORIES:
        items = list_for(data, cat)
        print(f"\n[{cat}] ({len(items)})")
        for t in items:
            print(f"  - {t.get('id', '?'):<26} {t.get('label', '')}")
            if t.get("description"):
                print(f"    └ {t['description']}")
    return 0


if __name__ == "__main__":
    slug = None
    show = False
    for a in sys.argv[1:]:
        if a.startswith("--client="):
            slug = a.split("=", 1)[1].strip() or None
        elif a == "--list-video-templates":
            show = True
    if not show:
        print("Uso: python squads/virals-marketing-squad/scripts/video_templates.py "
              "--list-video-templates --client=<slug>")
        sys.exit(1)
    sys.exit(_list_cli(slug))
