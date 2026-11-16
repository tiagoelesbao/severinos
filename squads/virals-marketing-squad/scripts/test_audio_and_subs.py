import os
import sys
import logging
from dataclasses import dataclass

# Adicionar caminhos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools import sam_whisper_service as whisper_svc
from tools import sam_ffmpeg_service as ffmpeg_svc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audio-subs-test")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
INPUT_VIDEO = os.path.join(PROJECT_ROOT, "tmp/test_video/test_reels.mp4")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs/audio-subs-test")

def run_test():
    if not os.path.exists(INPUT_VIDEO):
        logger.error("Input video not found.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Testar Audio Correction & Mixing (Ducking)
    # Criar um arquivo de áudio de fundo (música)
    music_path = os.path.join(OUTPUT_DIR, "background_music.mp3")
    logger.info("Generating dummy background music...")
    cmd_music = [
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=10',
        '-c:a', 'libmp3lame', music_path
    ]
    import subprocess
    subprocess.run(cmd_music, check=True, capture_output=True)

    logger.info("Step 1: Applying Audio Correction and Mixing with Ducking...")
    corrected_audio_video = os.path.join(OUTPUT_DIR, "audio_corrected.mp4")
    mixed_video = os.path.join(OUTPUT_DIR, "audio_mixed.mp4")
    
    ffmpeg_svc.apply_audio_correction(INPUT_VIDEO, corrected_audio_video)
    ffmpeg_svc.mix_background_music(corrected_audio_video, music_path, mixed_video, ducking=True)

    # 2. Testar Transcrição (Mocked Words for testing Popup Subs)
    logger.info("Step 2: Testing Subtitle Generation (Popup Style)...")
    
    # Mock result
    mock_result = whisper_svc.TranscriptionResult(
        text="Este é um teste de legendas automáticas.",
        segments=[{"start": 0.0, "end": 5.0, "text": "Este é um teste de legendas automáticas."}],
        words=[
            {"word": "Este", "start": 0.5, "end": 0.8},
            {"word": "é", "start": 0.8, "end": 1.0},
            {"word": "um", "start": 1.0, "end": 1.2},
            {"word": "teste", "start": 1.2, "end": 1.8},
            {"word": "de", "start": 1.8, "end": 2.0},
            {"word": "legendas", "start": 2.0, "end": 3.0},
            {"word": "automáticas", "start": 3.0, "end": 4.5},
        ],
        language="pt",
        duration_s=5.0
    )
    
    srt_path = os.path.join(OUTPUT_DIR, "popup.srt")
    whisper_svc.generate_popup_srt(mock_result, srt_path)
    
    final_video = os.path.join(OUTPUT_DIR, "final_branded_captioned.mp4")
    whisper_svc.hardcode_subtitles(mixed_video, srt_path, final_video)
    
    logger.info(f"✅ Audio and Subs test complete! Final video at: {final_video}")

if __name__ == "__main__":
    run_test()
