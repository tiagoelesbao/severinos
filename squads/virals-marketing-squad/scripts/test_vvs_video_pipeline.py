import os
import sys
import logging

# Adicionar caminhos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools import sam_ffmpeg_service as sam
from scripts.generate_video_overlays import generate_video_assets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vvs-video-test")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
INPUT_VIDEO = os.path.join(PROJECT_ROOT, "tmp/test_video/test_reels.mp4")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "outputs/vvs-video-test")
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "branded_video.mp4")

def run_pipeline_test():
    if not os.path.exists(INPUT_VIDEO):
        logger.error(f"Input video not found at {INPUT_VIDEO}. Run STORY-VIDEO-01 tests first.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Briefing fictício
    briefing = {
        "hook": {
            "headline": "A ERA DO MARKETING AGÊNTICO",
            "subHeadline": "Virals Intelligence"
        },
        "speaker": {
            "name": "Alex Hormozi",
            "role": "Chief Systems Architect"
        },
        "brand": {
            "accentColor": "#FFD700"
        },
        "export": {
            "viewport": {"width": 1080, "height": 1920}
        }
    }

    import json
    briefing_file = os.path.join(OUTPUT_DIR, "briefing.json")
    with open(briefing_file, "w", encoding="utf-8") as f:
        json.dump(briefing, f)

    # 2. Gerar Overlays VVS
    logger.info("Step 1: Generating VVS Overlays...")
    generate_video_assets(briefing_file, OUTPUT_DIR)

    # 3. Aplicar Overlays via FFmpeg
    logger.info("Step 2: Compositing Hook Overlay (0-3s)...")
    temp_video = os.path.join(OUTPUT_DIR, "temp_hook.mp4")
    sam.composite_overlay(
        video_path=INPUT_VIDEO,
        overlay_path=os.path.join(OUTPUT_DIR, "overlay_hook.png"),
        output_path=temp_video,
        start_s=0,
        duration_s=3.0
    )

    logger.info("Step 3: Compositing Brand Overlay (Continuous)...")
    sam.composite_overlay(
        video_path=temp_video,
        overlay_path=os.path.join(OUTPUT_DIR, "overlay_brand.png"),
        output_path=FINAL_VIDEO,
        start_s=0
    )

    logger.info(f"✅ Pipeline complete! Final video at: {FINAL_VIDEO}")

if __name__ == "__main__":
    run_pipeline_test()
