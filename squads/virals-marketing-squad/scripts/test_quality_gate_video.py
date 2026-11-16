#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_quality_gate_video.py — MVC-04: testes do gate terminal de vídeo.

Cobre os checklists V1–V7 (numbers + claims + tabu + cta + hook + shotlist),
a classificação bloqueante/soft, o reparo, e os caminhos do gate: bloqueio
(LLM offline → FAIL) e self-healing (LLM mock limpa → PASS). Self-contained.
"""

import os
import sys
import yaml
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quality_gate_video as qgv  # noqa: E402


def _identity():
    return {
        "tom_de_voz": {"lexico": {"nunca_usar": ["segredo", "dica"]}},
        "cta_estilo": {"exemplos_proibidos": ["link na bio"]},
    }


def _brief(plan):
    return {
        "client_slug": "tiago-elesbao",
        "source": {"caption": "retenção em reels"},
        "transcript": [
            {"start": 0, "end": 3, "text": "Você perde 80% da audiência"},
            {"start": 3, "end": 9, "text": "o problema é o primeiro frame"},
        ],
        "benchmark_analysis": {"cut_cadence": {"meets_retention_checkpoint": True}},
        "content_plan": plan,
    }


def _clean_plan(script="Você perde 80% se errar o primeiro frame"):
    return {
        "tema": "retenção",
        "hook": {"variants": [
            {"pattern_interrupt": "snap-zoom", "text_overlay": "Pare de perder views", "spoken_open": "Olha isso"},
            {"pattern_interrupt": "whip", "text_overlay": "Seu frame está errado", "spoken_open": "Repara aqui"},
            {"pattern_interrupt": "cut", "text_overlay": "Retenção começa no zero", "spoken_open": "Pensa comigo"},
        ]},
        "storyboard": [{"beat_n": 1, "on_screen_text": "frame", "duration_s": 2.0}],
        "script": script,
        "shotlist": [{"plano": "close no rosto", "falas_chave": "vai direto ao ponto"}],
    }


def test_plan_text_aggregates():
    txt = qgv.plan_text(_clean_plan(script="ROTEIRO"))
    assert "ROTEIRO" in txt and "Pare de perder views" in txt and "vai direto ao ponto" in txt


def test_v3_flags_fabricated_number():
    plan = _clean_plan(script="A retenção sobe 47% com esse ajuste")
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is False
    assert checks["V3_fid_numeros"]["blocking"] is True
    assert "V3_fid_numeros" in qgv.blocking_failures(checks)


def test_v3_passes_grounded_number():
    plan = _clean_plan(script="Você perde 80% se errar o frame")
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is True


def test_v3_flags_fabricated_number_in_scene():
    # MVC-05/fix: fabricação escondida no storyboard.scene deve ser pega.
    plan = _clean_plan()
    plan["storyboard"][0]["scene"] = "Tiago aponta gráfico de +150% em 12 meses"
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is False
    assert any("150" in n for n in checks["V3_fid_numeros"]["detail"]["fabricados"])


def test_v3_flags_fabricated_number_in_edit_inserts():
    # MVC-05/fix: fabricação no edit_spec.inserts deve ser pega.
    plan = _clean_plan()
    plan["edit_spec"] = {"inserts": ["print de churn caindo 8%"]}
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is False
    assert any("8" in n for n in checks["V3_fid_numeros"]["detail"]["fabricados"])


def test_apply_repair_fixes_scene_and_inserts():
    plan = _clean_plan()
    plan["storyboard"][0]["scene"] = "gráfico +150%"
    plan["edit_spec"] = {"inserts": ["print churn 8%"]}
    qgv._apply_repair(plan, {"scenes": ["gráfico de crescimento"],
                             "edit_inserts": ["print de evolução do churn"]})
    assert plan["storyboard"][0]["scene"] == "gráfico de crescimento"
    assert plan["edit_spec"]["inserts"] == ["print de evolução do churn"]


def test_v3_ignores_editing_cadence_numbers():
    # Falso-positivo corrigido: "1,5-2 s" / "@ beat 3" são instruções de edição.
    plan = _clean_plan()
    plan["edit_spec"] = {"transitions": ["cut a cada 1,5-2 s", "whip @ beat 3"],
                         "zooms": ["zoom 3s no rosto"]}
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is True, checks["V3_fid_numeros"]["detail"]


def test_v3_still_flags_content_stat_in_edit_inserts():
    # Mas stat de CONTEÚDO (não-tempo) no insert continua barrada.
    plan = _clean_plan()
    plan["edit_spec"] = {"inserts": ["print de churn caindo 8%"],
                         "transitions": ["cut a cada 1,5-2 s"]}
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V3_fid_numeros"]["ok"] is False
    assert any("8" in n for n in checks["V3_fid_numeros"]["detail"]["fabricados"])


def test_v4_flags_fabricated_claim():
    plan = _clean_plan(script="Segundo pesquisas mostram, a retenção cai")
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V4_fid_qualitativa"]["ok"] is False
    assert "V4_fid_qualitativa" in qgv.blocking_failures(checks)


def test_v5_flags_taboo():
    plan = _clean_plan(script="Esse é o segredo da retenção")
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V5_voz_tabu"]["ok"] is False
    assert "segredo" in checks["V5_voz_tabu"]["detail"]["palavras_tabu"]


def test_v7_flags_forbidden_cta():
    plan = _clean_plan()
    plan["script"] = plan["script"] + " ... agora clica no link na bio"
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V7_cta"]["ok"] is False
    assert "V7_cta" in qgv.blocking_failures(checks)


def test_v1_hook_insufficient_is_blocking():
    plan = _clean_plan()
    plan["hook"]["variants"] = plan["hook"]["variants"][:1]
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert checks["V1_hook"]["blocking"] is True
    assert checks["V1_hook"]["ok"] is False


def test_clean_plan_has_no_blocking():
    plan = _clean_plan()
    checks = qgv.check_video_plan(plan, _brief(plan), _identity())
    assert qgv.blocking_failures(checks) == []


def test_apply_repair_updates_text():
    plan = _clean_plan(script="tem 47% aqui")
    qgv._apply_repair(plan, {"script": "limpo", "hook_overlays": ["novo overlay"],
                             "shotlist_falas": ["nova fala"]})
    assert plan["script"] == "limpo"
    assert plan["hook"]["variants"][0]["text_overlay"] == "novo overlay"
    assert plan["shotlist"][0]["falas_chave"] == "nova fala"


def test_gate_requires_content_plan():
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump({"transcript": [{"start": 0, "end": 1, "text": "x"}]}, f, allow_unicode=True)
        path = f.name
    try:
        try:
            qgv.quality_gate_video(path)
            assert False, "esperava ValueError"
        except ValueError as e:
            assert "content_plan" in str(e)
    finally:
        os.unlink(path)


def test_gate_blocks_on_fabrication_when_llm_offline():
    plan = _clean_plan(script="A retenção sobe 47% garantido")
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(_brief(plan), f, allow_unicode=True)
        path = f.name
    orig = qgv.call_llm_json
    qgv.call_llm_json = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("offline"))
    try:
        status = qgv.quality_gate_video(path)
        out = yaml.safe_load(open(path, encoding="utf-8"))
    finally:
        qgv.call_llm_json = orig
        os.unlink(path)
    assert status == "FAIL"
    assert out["_validation"]["video_gate_status"] == "FAIL"
    assert any("47" in n for n in out["_validation"]["video_fidelity_unresolved"]["numeros"])


def test_gate_self_heals_with_llm_mock():
    plan = _clean_plan(script="A retenção sobe 47% garantido")
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(_brief(plan), f, allow_unicode=True)
        path = f.name
    # LLM "reparo" devolve script sem o número fabricado.
    orig = qgv.call_llm_json
    qgv.call_llm_json = lambda *a, **k: (
        {"script": "Você perde 80% se errar o frame", "hook_overlays": [],
         "hook_spoken": [], "on_screen": [], "shotlist_falas": []}, "mock:model")
    try:
        status = qgv.quality_gate_video(path)
        out = yaml.safe_load(open(path, encoding="utf-8"))
    finally:
        qgv.call_llm_json = orig
        os.unlink(path)
    assert status in ("PASS", "CONCERNS")  # número removido → sem bloqueante
    assert out["quality_gate_video"]["status"] == status
    assert "video_fidelity_unresolved" not in out["_validation"]


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
