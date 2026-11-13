import os
import sys
import json
import logging
import subprocess
from dotenv import load_dotenv
from typing import Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# Resolver de cliente (MKT-MC2-04). Adicionado o dir de scripts ao path para
# importar como módulo top-level.
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    import yaml as _yaml
except ImportError:
    _yaml = None

from tools import sam_ffmpeg_service as ffmpeg_svc
from tools import sam_whisper_service as whisper_svc
from tools.director_agent_service import DirectorAgentService
from tools.fcpxml_optimizer import FCPXMLOptimizer
from tools.stock_asset_service import StockAssetService
from tools.generate_lut import generate_virals_cube_lut
from scripts.generate_video_overlays import generate_video_assets
from _client_resolver import resolve_client, extract_client_arg

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("export-to-davinci")

# Garantimos PROJECT_ROOT como a raiz do repo. O script vive em
# squads/virals-marketing-squad/scripts/, então sobe 3 níveis.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DEFAULT_INPUT_VIDEO = r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\assets\20260513-2326-19.4782176.mp4"


def _load_brand_accent(brand_config_path: str, fallback: str = "#FF5B3F") -> str:
    """Lê accent color do brand-config do cliente; fallback se ausente."""
    if not _yaml or not os.path.exists(brand_config_path):
        return fallback
    try:
        with open(brand_config_path, "r", encoding="utf-8") as f:
            data = _yaml.safe_load(f) or {}
        palette = data.get("palette") or {}
        return palette.get("accent") or fallback
    except Exception as e:  # pragma: no cover — config corrompido = fallback
        logger.warning(f"Falha ao ler accent color de {brand_config_path}: {e}")
        return fallback


def run_export(input_video_path: str = None, client_slug: str = None):
    load_dotenv()

    client = resolve_client(client_slug)
    logger.info(f"Cliente resolvido: {client.nome_exibicao} ({client.slug})")

    export_dir = os.path.join(PROJECT_ROOT, client.output_dir.rstrip("/\\"), "export-for-davinci")
    accent_color = _load_brand_accent(
        os.path.join(PROJECT_ROOT, client.brand_config),
        fallback="#FF5B3F",
    )

    video_to_process = input_video_path or DEFAULT_INPUT_VIDEO

    if not os.path.exists(video_to_process):
        logger.error(f"Input video not found: {video_to_process}")
        return

    os.makedirs(export_dir, exist_ok=True)
    # Capturamos as variáveis abaixo para uso interno (vão substituir EXPORT_DIR).
    EXPORT_DIR = export_dir  # noqa: N806 — mantém a convenção do legado para o resto da função
    
    # Limpar arquivos antigos para evitar conflitos no Resolve
    for f in ["video_graded.mp4", "timeline_cuts.fcpxml", f"{client.slug}_cinematic.cube"]:
        path = os.path.join(EXPORT_DIR, f)
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Cleaned up old asset: {f}")
    
    # Limpar brolls antigos
    broll_dir = os.path.join(EXPORT_DIR, "broll")
    if os.path.exists(broll_dir):
        for f in os.listdir(broll_dir):
            os.remove(os.path.join(broll_dir, f))
    
    logger.info(f"Starting Industrialization for: {video_to_process}")
    
    # ====================================================================
    # STEP 1: Reformat to Reels (Center Crop 9:16)
    # ====================================================================
    logger.info("Step 1: Reformatting to Reels (Center Crop)...")
    reformatted_video = os.path.join(EXPORT_DIR, "video_center_crop.mp4")
    ffmpeg_svc.reformat(video_to_process, preset="reels", reframe_mode="center", output_path=reformatted_video)
    
    # ====================================================================
    # STEP 2: Audio Correction (Compressor/Limiter)
    # ====================================================================
    logger.info("Step 2: Applying Audio Correction...")
    audio_corrected_video = os.path.join(EXPORT_DIR, "video_audio_corrected.mp4")
    ffmpeg_svc.apply_audio_correction(reformatted_video, audio_corrected_video)

    # ====================================================================
    # STEP 3: Generate .cube LUT (NÃO bake no vídeo!)
    # O vídeo fica LIMPO para auditoria no DaVinci.
    # O LUT é aplicado como Node na aba Color do Resolve.
    # ====================================================================
    logger.info(f"Step 3: Resolving Cinematic LUT for {client.slug}...")
    # LUT canonical do cliente: data/clients/<slug>/luts/cinematic.cube.
    # Se ainda não foi calibrada, gera on-demand a partir do gerador da Virals
    # (placeholder até o dono substituir manualmente).
    client_lut_dir = os.path.join(PROJECT_ROOT, client.lut_dir)
    os.makedirs(client_lut_dir, exist_ok=True)
    canonical_lut = os.path.join(client_lut_dir, "cinematic.cube")
    if not os.path.exists(canonical_lut):
        logger.info(f"LUT canonical ausente — gerando placeholder em {canonical_lut}")
        generate_virals_cube_lut(canonical_lut)
    # Cópia para o EXPORT_DIR com nome amigável por cliente, p/ o DaVinci.
    import shutil
    lut_filename = f"{client.slug}_cinematic.cube"
    lut_path = os.path.join(EXPORT_DIR, lut_filename)
    shutil.copy2(canonical_lut, lut_path)

    # Auto-instalar LUT na pasta do DaVinci Resolve em subpasta por cliente.
    davinci_lut_dir = os.path.join(
        r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT",
        client.nome_exibicao.replace(" ", "-") or client.slug,
    )
    os.makedirs(davinci_lut_dir, exist_ok=True)
    shutil.copy2(lut_path, os.path.join(davinci_lut_dir, lut_filename))
    logger.info(f"✅ LUT installed to DaVinci: {davinci_lut_dir}\\{lut_filename}")
    
    # O vídeo base para a timeline é o áudio-corrigido (sem color bake)
    base_video = audio_corrected_video
    # Criar cópia com nome padrão para o FCPXML
    import shutil
    final_video = os.path.join(EXPORT_DIR, "video_graded.mp4")
    shutil.copy2(base_video, final_video)
    logger.info(f"Base video ready (clean, no baked grade): {final_video}")

    # ====================================================================
    # STEP 4: Silence Removal → FCPXML + Rendered Cut Video
    # ====================================================================
    logger.info("Step 4: Running Silence Removal (Auto-Editor)...")
    fcpxml_cuts = os.path.join(EXPORT_DIR, "timeline_cuts.fcpxml")
    video_cut = os.path.join(EXPORT_DIR, "video_cut.mp4")
    
    # 4a. Gerar FCPXML para DaVinci
    cmd_fcpxml = [
        'auto-editor', final_video,
        '--edit', 'audio:threshold=4%', 
        '--margin', '0.05s',
        '--export', 'resolve',
        '--output', fcpxml_cuts
    ]
    subprocess.run(cmd_fcpxml, check=True)
    logger.info("✅ FCPXML timeline generated.")
    
    # 4b. Gerar vídeo cortado real (para transcrição precisa)
    cmd_cut = [
        'auto-editor', final_video,
        '--edit', 'audio:threshold=4%',
        '--margin', '0.05s',
        '--output', video_cut
    ]
    subprocess.run(cmd_cut, check=True)
    logger.info("✅ Cut video rendered for transcription.")
    
    # ====================================================================
    # STEP 5: Transcription do VÍDEO CORTADO (não o original!)
    # Isso elimina gaps — timestamps batem 100% com a timeline.
    # ====================================================================
    logger.info("Step 5: Transcribing CUT video with Whisper (no remap needed)...")
    transcription_result = whisper_svc.transcribe(video_cut, config={"model": "small", "language": "pt"})
    
    # ====================================================================
    # STEP 6: Director AI Analysis & Transcription Cleanup
    # ====================================================================
    logger.info("Step 6: Running Director AI Analysis...")
    director_svc = DirectorAgentService()
    
    # Corrigir erros de transcrição nos segmentos via IA
    transcription_result.segments = director_svc.clean_transcription(transcription_result.segments)
    
    editing_decisions = director_svc.analyze_transcript(
        transcription_result.text, 
        transcription_result.segments
    )
    
    decisions_file = os.path.join(EXPORT_DIR, "editing_decisions.json")
    with open(decisions_file, "w", encoding="utf-8") as f:
        json.dump(editing_decisions, f, indent=2)
    logger.info(f"✅ Editing decisions saved to: {decisions_file}")

    # ====================================================================
    # STEP 7: Optimize FCPXML (Zooms only) + Download B-Rolls
    # ====================================================================
    logger.info("Step 7: Applying Zooms + Downloading B-Rolls...")
    if os.path.exists(fcpxml_cuts):
        optimizer = FCPXMLOptimizer(fcpxml_cuts)
        stock_svc = StockAssetService(os.path.join(EXPORT_DIR, "broll"))
        
        edits = editing_decisions.get('edits', [])
        
        # Separar: zooms vão para o FCPXML, b-rolls só baixam imagens
        zoom_edits = [e for e in edits if e.get('type') == 'zoom']
        broll_edits = [e for e in edits if e.get('type') == 'b-roll' and 'keywords' in e]
        
        # Baixar B-Rolls para a pasta (sem injetar no XML)
        for edit in broll_edits:
            broll_path = stock_svc.fetch_broll_image(edit['keywords'])
            if broll_path:
                logger.info(f"B-Roll downloaded for '{edit['keywords']}': {broll_path}")
        
        # Aplicar apenas zooms no FCPXML
        optimizer.apply_edits(zoom_edits)
        optimizer.fix_main_asset_path()
        optimizer.save(fcpxml_cuts)
    
    # Legendas JÁ estão sincronizadas — foram transcritas do vídeo cortado!
    logger.info("✅ Subtitles already synced (transcribed from cut video).")

    # ====================================================================
    # STEP 8: Generate Subtitles (Netflix + Popup only)
    # ====================================================================
    logger.info("Step 8: Generating Subtitles...")
    
    srt_netflix = os.path.join(EXPORT_DIR, "subtitles_netflix.srt")
    whisper_svc.generate_srt(transcription_result, srt_netflix, style="netflix")
    
    srt_popup = os.path.join(EXPORT_DIR, "subtitles_popup.srt")
    whisper_svc.generate_srt(transcription_result, srt_popup, style="popup")
    
    # ====================================================================
    # STEP 9: Generate VVS Overlays (Transparent PNGs)
    # ====================================================================
    logger.info("Step 9: Generating Transparent VVS Overlays...")
    briefing = {
        "hook": {"headline": "O SEGREDO DA RETENÇÃO", "subHeadline": "VIRALS PODCAST"},
        "speaker": {"name": "Tiago Elesbão", "role": "Host"},
        "brand": {
            "client": client.slug,
            "clientName": client.nome_exibicao,
            "accentColor": accent_color,  # Resolvido do brand-config do cliente
        },
        "export": {"viewport": {"width": 1080, "height": 1920}}
    }
    briefing_file = os.path.join(EXPORT_DIR, "briefing.json")
    with open(briefing_file, "w", encoding="utf-8") as f:
        json.dump(briefing, f)
        
    generate_video_assets(briefing_file, EXPORT_DIR)
    
    # ====================================================================
    # FINAL REPORT
    # ====================================================================
    logger.info("\n=======================================================")
    logger.info(f"✅ Pipeline Complete! Cliente: {client.nome_exibicao} ({client.slug})")
    logger.info(f"   Assets ready in: {EXPORT_DIR}")
    lut_label = client.nome_exibicao.replace(" ", "-") or client.slug
    logger.info("How to use in DaVinci Resolve:")
    logger.info("1. Import `timeline_cuts.fcpxml` → File > Import > Timeline")
    logger.info(f"2. LUT: Color tab → Node → RClick → LUT → {lut_label} → {client.slug}_cinematic")
    logger.info("   (LUT auto-installed! Restart Resolve if not visible)")
    logger.info("3. Drag `subtitles_netflix.srt` to subtitle track.")
    logger.info("4. Drag overlays (overlay_hook.png, overlay_brand.png) to Track 2.")
    logger.info("=======================================================\n")

if __name__ == "__main__":
    client_slug, _argv_rest = extract_client_arg(sys.argv[1:])
    target = _argv_rest[0] if _argv_rest else None
    try:
        run_export(target, client_slug=client_slug)
    except (FileNotFoundError, ValueError) as e:
        logger.error(f"ERRO: {e}")
        sys.exit(1)
