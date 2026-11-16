# -*- coding: utf-8 -*-
"""Testes VEX-04 — visão do benchmark + cadência real."""
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vision_video_benchmark import normalize_visual_analysis, sample_frames  # noqa: E402
from analyze_video_benchmark import compute_cut_cadence  # noqa: E402


# ── sample_frames ────────────────────────────────────────────────────────────
def _mk_shots(tmp, names):
    d = os.path.join(tmp, "Screenshots")
    os.makedirs(d)
    for n in names:
        with open(os.path.join(d, n), "wb") as f:
            f.write(b"x")


def test_sample_frames_cap_e_ordem():
    with tempfile.TemporaryDirectory() as tmp:
        _mk_shots(tmp, [f"frame_{i:02d}.jpg" for i in range(1, 13)])
        picked = sample_frames(tmp, max_frames=5)
        assert len(picked) == 5
        names = [os.path.basename(p) for p in picked]
        assert names == sorted(names)  # ordem cronológica preservada
        assert names[0] == "frame_01.jpg" and names[-1] == "frame_12.jpg"  # pontas


def test_sample_frames_menos_que_o_cap_e_sem_pasta():
    with tempfile.TemporaryDirectory() as tmp:
        _mk_shots(tmp, ["a.jpg", "b.png"])
        assert len(sample_frames(tmp, max_frames=8)) == 2
    assert sample_frames("/nao/existe") == []


# ── normalize_visual_analysis ────────────────────────────────────────────────
def test_normalize_estrutura_e_defaults():
    raw = {
        "frames": [
            {"file": "f1.jpg", "shot_type": "talking_head", "on_screen_text": "OI", "has_captions": True},
            {"file": "f2.jpg", "shot_type": "invalido", "on_screen_text": None},
            "lixo",
        ],
        "shot_mix": {"talking_head": 0.5, "screen_capture": "0.5"},
        "broll_density": "ALTO",  # inválido → medium
        "palette": ["#FFB800", "azul", "#00ff00", 123],
        "visual_hook_device": "zoom no rosto",
    }
    out = normalize_visual_analysis(raw, ["a", "b"])
    assert out["frames"][0]["shot_type"] == "talking_head"
    assert out["frames"][1]["shot_type"] == "broll"  # inválido → default
    assert len(out["frames"]) == 2  # "lixo" descartado
    assert out["shot_mix"]["screen_capture"] == 0.5
    assert out["broll_density"] == "medium"
    assert out["palette"] == ["#FFB800", "#00ff00"]  # só hex válidos
    assert out["frames_sent"] == 2


def test_normalize_inutilizavel_vira_none():
    assert normalize_visual_analysis({}, []) is None
    assert normalize_visual_analysis("não é dict", []) is None
    assert normalize_visual_analysis({"frames": [], "palette": []}, []) is None


# ── compute_cut_cadence (fonte real vs fallback) ─────────────────────────────
def _brief(cuts=None, n_segments=6, duration=36):
    return {
        "metadata": {"duration_seconds": duration, "cut_timestamps": cuts},
        "transcript": [{"start": i * 6, "end": i * 6 + 6, "text": f"s{i}"} for i in range(n_segments)],
    }


def test_cadence_prioriza_scene_detect():
    c = compute_cut_cadence(_brief(cuts=[1.5, 3.0, 5.2, 8.9, 20.0]))
    assert c["source"] == "scene-detect"
    assert c["shots"] == 6  # 5 cortes = 6 shots
    assert c["avg_segment_s"] == 6.0
    assert c["meets_retention_checkpoint"] is False


def test_cadence_scene_detect_ritmo_viral():
    cuts = [round(x * 1.8, 2) for x in range(1, 19)]  # corte a cada 1,8s
    c = compute_cut_cadence(_brief(cuts=cuts))
    assert c["source"] == "scene-detect"
    assert c["meets_retention_checkpoint"] is True


def test_cadence_fallback_rotulado():
    c = compute_cut_cadence(_brief(cuts=None))
    assert c["source"] == "transcript-segments"
    assert c["segments"] == 6
    # cortes fora da duração são descartados → fallback
    c2 = compute_cut_cadence(_brief(cuts=[999.0]))
    assert c2["source"] == "transcript-segments"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
