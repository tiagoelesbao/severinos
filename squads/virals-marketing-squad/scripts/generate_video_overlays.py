import os
import sys
import json
import logging

# Adicionar caminhos para importar o service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools.vvs_render_service import VVSRenderService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("generate-overlays")

def generate_video_assets(briefing_path, output_dir):
    """
    Lê um briefing de vídeo e gera os overlays VVS correspondentes.
    """
    logger.info(f"Loading briefing from {briefing_path}")
    with open(briefing_path, 'r', encoding='utf-8') as f:
        briefing = json.load(f)

    service = VVSRenderService()
    os.makedirs(output_dir, exist_ok=True)

    # 1. Generate Hook Overlay
    if "hook" in briefing:
        logger.info("Generating Hook Overlay...")
        hook_props = {
            "templateId": "video-hook",
            "headline": briefing["hook"]["headline"],
            "subHeadline": briefing["hook"].get("subHeadline", ""),
            "accentColor": briefing.get("brand", {}).get("accentColor", "#FF5B3F"),
            "viewport": briefing.get("export", {}).get("viewport", {"width": 1080, "height": 1920})
        }
        service.render_component(
            "video-hook", 
            hook_props, 
            os.path.join(output_dir, "overlay_hook.png"),
            viewport=(hook_props["viewport"]["width"], hook_props["viewport"]["height"])
        )

    # 2. Generate Brand/Lower Third Overlay
    if "speaker" in briefing:
        logger.info("Generating Brand Overlay...")
        brand_props = {
            "templateId": "video-brand",
            "name": briefing["speaker"]["name"],
            "role": briefing["speaker"].get("role", ""),
            "accentColor": briefing.get("brand", {}).get("accentColor", "#FF5B3F"),
            "showWatermark": True,
            "viewport": briefing.get("export", {}).get("viewport", {"width": 1080, "height": 1920})
        }
        service.render_component(
            "video-brand", 
            brand_props, 
            os.path.join(output_dir, "overlay_brand.png"),
            viewport=(brand_props["viewport"]["width"], brand_props["viewport"]["height"])
        )

    logger.info(f"All overlays generated in {output_dir}")

if __name__ == "__main__":
    # Test execution
    test_briefing = {
        "hook": {
            "headline": "ESTE É O SEGREDO DO CRESCIMENTO",
            "subHeadline": "Viral Strategy 2026"
        },
        "speaker": {
            "name": "Tiago Elesbão",
            "role": "Head of Growth"
        },
        "brand": {
            "accentColor": "#00FFAB"
        },
        "export": {
            "viewport": {"width": 1080, "height": 1920}
        }
    }
    
    tmp_briefing = "tmp_video_briefing.json"
    with open(tmp_briefing, "w", encoding="utf-8") as f:
        json.dump(test_briefing, f)
        
    generate_video_assets(tmp_briefing, "outputs/video-vvs-test")
    os.remove(tmp_briefing)
