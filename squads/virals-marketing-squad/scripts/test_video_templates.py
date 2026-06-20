#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_video_templates.py — MVC-06: testes do registry de templates de vídeo.

Valida: carga dos YAMLs reais (virals + tiago, >=3 por categoria), recomendação
por hook_type via scoring_match e fallback. Self-contained.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video_templates as vt  # noqa: E402


def test_loads_both_clients_with_min_3_per_category():
    for slug in ("virals", "tiago-elesbao"):
        data = vt.load_video_templates(slug)
        assert data is not None, f"registry ausente p/ {slug}"
        for cat in vt.CATEGORIES:
            items = vt.list_for(data, cat)
            assert len(items) >= 3, f"{slug}/{cat} tem {len(items)} (<3)"
            assert all(t.get("id") for t in items), f"{slug}/{cat} item sem id"


def test_missing_client_returns_none():
    assert vt.load_video_templates("cliente-inexistente") is None


def test_recommend_uses_scoring_for_bold_claim_tiago():
    data = vt.load_video_templates("tiago-elesbao")
    rec = vt.recommend(data, "bold claim")
    # scoring_match.hook.from_bold_claim começa em hook-number-hardcut
    assert rec["hook"] == "hook-number-hardcut"
    assert rec["caption"] and rec["transition"] and rec["motion"]


def test_recommend_curiosity_gap_virals():
    data = vt.load_video_templates("virals")
    rec = vt.recommend(data, "curiosity gap")
    assert rec["hook"] == "hook-curiosity-whip"


def test_recommend_unknown_hook_falls_back_to_first():
    data = vt.load_video_templates("virals")
    rec = vt.recommend(data, "tipo-desconhecido")
    hook_ids = [t["id"] for t in vt.list_for(data, "hook_packs")]
    assert rec["hook"] == hook_ids[0]


def test_recommend_empty_data_returns_empty():
    assert vt.recommend(None) == {}


def test_recommended_ids_are_valid():
    for slug in ("virals", "tiago-elesbao"):
        data = vt.load_video_templates(slug)
        rec = vt.recommend(data, "pattern interrupt")
        valid = {
            "hook": [t["id"] for t in vt.list_for(data, "hook_packs")],
            "caption": [t["id"] for t in vt.list_for(data, "caption_styles")],
            "transition": [t["id"] for t in vt.list_for(data, "transition_packs")],
            "motion": [t["id"] for t in vt.list_for(data, "motion_presets")],
        }
        for k, v in rec.items():
            assert v in valid[k], f"{slug}: {k}={v} não está no registry"


def _run_all():
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  ✓ {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  ✗ {fn.__name__}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  ✗ {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passaram.")
    return failed


if __name__ == "__main__":
    sys.exit(1 if _run_all() else 0)
