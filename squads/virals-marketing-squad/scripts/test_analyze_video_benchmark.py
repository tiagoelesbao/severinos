#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_analyze_video_benchmark.py — MVC-02: testes da análise de retenção.

Cobre métricas determinísticas, classificação de hook, estrutura da heurística,
o fallback NÃO-FATAL (LLM indisponível → heurística) e o caminho LLM (mock).
Self-contained: usa dicts/tempfiles, não depende de rede. Roda com pytest OU
`python test_*.py`.
"""

import os
import sys
import yaml
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze_video_benchmark as avb  # noqa: E402


def _sample_brief():
    return {
        "media_kind": "video",
        "source": {"creator": "@x", "platform": "instagram", "type": "reel"},
        "metadata": {"duration_seconds": 30, "like_count": 100},
        "hook_raw": "Você está perdendo 80% da audiência?",
        "transcript": [
            {"start": 0, "end": 2, "text": "a"},
            {"start": 2, "end": 5, "text": "b"},
            {"start": 5, "end": 9, "text": "c"},
            {"start": 9, "end": 15, "text": "d"},
            {"start": 15, "end": 30, "text": "e"},
        ],
        "beats": [
            {"n": 1, "start": 0, "end": 9, "text": "abertura", "role": "hook"},
            {"n": 2, "start": 9, "end": 30, "text": "fecho", "role": "cta"},
        ],
    }


def test_compute_cut_cadence():
    cad = avb.compute_cut_cadence(_sample_brief())
    assert cad["segments"] == 5
    assert cad["duration_s"] == 30
    assert cad["avg_segment_s"] == 6.0
    assert cad["meets_retention_checkpoint"] is False  # 6s > 2.5


def test_cut_cadence_fast_video_meets_checkpoint():
    brief = {"transcript": [{"start": i, "end": i + 2, "text": "x"} for i in range(0, 20, 2)],
             "metadata": {"duration_seconds": 20}}
    cad = avb.compute_cut_cadence(brief)
    assert cad["avg_segment_s"] == 2.0
    assert cad["meets_retention_checkpoint"] is True


def test_compute_pacing_curve():
    pacing = avb.compute_pacing_curve(_sample_brief(), window=5)
    assert pacing[0] == {"window": "00-05s", "segments": 2}
    assert sum(p["segments"] for p in pacing) == 5


def test_classify_hook_heuristic():
    assert avb.classify_hook_heuristic("Por que você falha?") == "curiosity gap"
    assert avb.classify_hook_heuristic("Eu fiz 3 milhões") == "bold claim"
    assert avb.classify_hook_heuristic("Pare de fazer isso agora") == "pattern interrupt"
    assert avb.classify_hook_heuristic("") == "pattern interrupt"


def test_heuristic_analysis_structure():
    a = avb.heuristic_analysis(_sample_brief())
    for key in ("hook_type", "pattern_interrupts", "cut_cadence", "broll_strategy",
                "caption_style", "pacing_curve", "retention_devices", "recommendation"):
        assert key in a, f"falta {key}"
    assert a["hook_type"] == "curiosity gap"  # hook tem "?"
    assert isinstance(a["retention_devices"], list) and a["retention_devices"]


def test_analyze_falls_back_to_heuristic(monkeypatch=None):
    # Força o LLM a falhar → deve cair na heurística (NÃO-FATAL).
    def _boom(*a, **k):
        raise RuntimeError("todos os provedores falharam")
    orig = avb.call_llm_json
    avb.call_llm_json = _boom
    try:
        analysis, label = avb.analyze(_sample_brief())
    finally:
        avb.call_llm_json = orig
    assert label == "heuristic"
    assert analysis["hook_type"] == "curiosity gap"
    assert analysis["cut_cadence"]["segments"] == 5


def test_analyze_uses_llm_and_merges_metrics():
    # Mock do LLM devolvendo um dict; cut_cadence deve ser sobrescrito pelas métricas reais.
    def _fake(prompt, parser, **k):
        return {"hook_type": "bold claim", "cut_cadence": {"avaliacao": "rápido"}}, "openrouter:fake"
    orig = avb.call_llm_json
    avb.call_llm_json = _fake
    try:
        analysis, label = avb.analyze(_sample_brief())
    finally:
        avb.call_llm_json = orig
    assert label == "openrouter:fake"
    assert analysis["hook_type"] == "bold claim"
    # métrica determinística injetada por cima do dict do LLM
    assert analysis["cut_cadence"]["segments"] == 5
    assert analysis["cut_cadence"]["avaliacao"] == "rápido"
    assert "pacing_curve" in analysis


def test_analyze_video_benchmark_requires_transcript():
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump({"media_kind": "video", "transcript": []}, f, allow_unicode=True)
        path = f.name
    try:
        try:
            avb.analyze_video_benchmark(path)
            assert False, "esperava ValueError por falta de transcript"
        except ValueError:
            pass
    finally:
        os.unlink(path)


def test_analyze_video_benchmark_writes_analysis_heuristic():
    # E2E sem rede: força heurística e confere que grava benchmark_analysis no arquivo.
    brief = _sample_brief()
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(brief, f, allow_unicode=True)
        path = f.name
    orig = avb.call_llm_json
    avb.call_llm_json = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("offline"))
    try:
        avb.analyze_video_benchmark(path)
        with open(path, encoding="utf-8") as f:
            out = yaml.safe_load(f)
    finally:
        avb.call_llm_json = orig
        os.unlink(path)
    assert out["benchmark_analysis"]["analyzed_by"] == "heuristic"
    assert "analyzed_at" in out["benchmark_analysis"]


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
