import os
import sys
import json
import logging
from typing import Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools import sam_ffmpeg_service as ffmpeg_svc
from tools import sam_whisper_service as whisper_svc
from scripts.generate_video_overlays import generate_video_assets

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("podcast-to-reel")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
INPUT_VIDEO = r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\assets\20260513-2326-19.4782176.mp4"
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs/podcast-to-reel")

def run_pipeline():
    if not os.path.exists(INPUT_VIDEO):
        logger.error(f"Input video not found: {INPUT_VIDEO}")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    logger.info("Starting Podcast to Reel Pipeline")
    
    # 1. Reformat to Reels (1080x1920)
    logger.info("Step 1: Reformatting to Reels format...")
    reformatted_video = os.path.join(OUTPUT_DIR, "1_reformatted.mp4")
    ffmpeg_svc.reformat(INPUT_VIDEO, preset="reels", reframe_mode="blur-bg", output_path=reformatted_video)
    
    # 2. Audio Correction
    logger.info("Step 2: Applying Audio Correction...")
    audio_corrected_video = os.path.join(OUTPUT_DIR, "2_audio_corrected.mp4")
    ffmpeg_svc.apply_audio_correction(reformatted_video, audio_corrected_video)

    # 3. Transcription & Subtitles
    logger.info("Step 3: Transcribing Audio with Whisper...")
    transcription_result = whisper_svc.transcribe(audio_corrected_video, config={"model": "base", "language": "pt"})
    
    logger.info("Step 4: Generating Pop-up Subtitles...")
    srt_path = os.path.join(OUTPUT_DIR, "popup.srt")
    whisper_svc.generate_popup_srt(transcription_result, srt_path)
    
    # 4. Generate VVS Overlays
    logger.info("Step 5: Generating VVS Overlays...")
    briefing = {
        "hook": {
            "headline": "O SEGREDO DA RETENÇÃO",
            "subHeadline": "VIRALS PODCAST"
        },
        "speaker": {
            "name": "Host",
            "role": "Virals"
        },
        "brand": {
            "accentColor": "#00FFAB"
        },
        "export": {
            "viewport": {"width": 1080, "height": 1920}
        }
    }
    briefing_file = os.path.join(OUTPUT_DIR, "briefing.json")
    with open(briefing_file, "w", encoding="utf-8") as f:
        json.dump(briefing, f)
        
    generate_video_assets(briefing_file, OUTPUT_DIR)
    
    # 5. Hardcode Subtitles
    logger.info("Step 6: Hardcoding Subtitles...")
    captioned_video = os.path.join(OUTPUT_DIR, "3_captioned.mp4")
    whisper_svc.hardcode_subtitles(audio_corrected_video, srt_path, captioned_video)
    
    # 6. Composite Overlays
    logger.info("Step 7: Compositing Overlays...")
    temp_hook_video = os.path.join(OUTPUT_DIR, "4_temp_hook.mp4")
    final_video = os.path.join(OUTPUT_DIR, "5_final_reel.mp4")
    
    # Apply Hook (0-3s)
    ffmpeg_svc.composite_overlay(
        video_path=captioned_video,
        overlay_path=os.path.join(OUTPUT_DIR, "overlay_hook.png"),
        output_path=temp_hook_video,
        start_s=0,
        duration_s=3.0
    )
    
    # Apply Brand Watermark (Continuous)
    ffmpeg_svc.composite_overlay(
        video_path=temp_hook_video,
        overlay_path=os.path.join(OUTPUT_DIR, "overlay_brand.png"),
        output_path=final_video
    )
    
    logger.info(f"Pipeline Complete! Final Video: {final_video}")

if __name__ == "__main__":
    run_pipeline()
