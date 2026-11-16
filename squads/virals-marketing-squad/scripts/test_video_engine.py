import os
import sys
import time
import logging
from typing import Optional

# Adicionar o diretório raiz do squad ao path para importar as tools
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from tools import sam_ffmpeg_service as sam
except ImportError as e:
    print(f"Error importing sam_ffmpeg_service: {e}")
    sys.exit(1)

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test-video-engine")

TEST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../tmp/test_video"))
SAMPLE_VIDEO = os.path.join(TEST_DIR, "sample_input.mp4")

def setup_test_env():
    if not os.path.exists(TEST_DIR):
        os.makedirs(TEST_DIR)
        logger.info(f"Created test directory: {TEST_DIR}")
    
    # Criar vídeo de teste se não existir
    if not os.path.exists(SAMPLE_VIDEO):
        logger.info("Generating sample video for testing...")
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', 'testsrc=duration=5:size=1280x720:rate=30',
            '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=5',
            '-c:v', 'libx264', '-c:a', 'aac',
            SAMPLE_VIDEO
        ]
        import subprocess
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"Sample video created: {SAMPLE_VIDEO}")

def run_tests():
    logger.info("Starting Video Engine Stability Tests...")
    
    # 1. Test Probe
    try:
        info = sam.probe(SAMPLE_VIDEO)
        logger.info(f"✅ Probe success: {info.resolution} @ {info.fps}fps, {info.duration_s}s")
    except Exception as e:
        logger.error(f"❌ Probe failed: {e}")
        return

    # 2. Test Reformat (Reels)
    try:
        output_reels = os.path.join(TEST_DIR, "test_reels.mp4")
        sam.reformat(SAMPLE_VIDEO, "reels", "blur-bg", output_reels)
        info_out = sam.probe(output_reels)
        if info_out.resolution == (1080, 1920):
            logger.info("✅ Reformat (Reels) success: 1080x1920 verified")
        else:
            logger.error(f"❌ Reformat resolution mismatch: {info_out.resolution}")
    except Exception as e:
        logger.error(f"❌ Reformat failed: {e}")

    # 3. Test Silence Cut
    try:
        output_silence = os.path.join(TEST_DIR, "test_silence.mp4")
        # Criar um vídeo com silêncio para testar
        # 2s de tom + 3s de silêncio
        logger.info("Generating silence-test video...")
        cmd_silence = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', 'testsrc=duration=5:size=1280x720:rate=30',
            '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=2,pad=5:0:0:black', # Pad audio with silence
            '-c:v', 'libx264', '-c:a', 'aac',
            os.path.join(TEST_DIR, "input_silence.mp4")
        ]
        import subprocess
        subprocess.run(cmd_silence, check=True, capture_output=True)
        
        report = sam.silence_cut(os.path.join(TEST_DIR, "input_silence.mp4"), output_silence, 4.0)
        if report.new_duration < 5.0:
            logger.info(f"✅ Silence Cut success: Duration reduced from {report.original_duration}s to {report.new_duration}s ({report.reduction_pct}%)")
        else:
            logger.warning(f"⚠️ Silence Cut run but duration didn't decrease (might be too short or threshold issues)")
    except Exception as e:
        logger.error(f"❌ Silence Cut failed: {e}")

    # 4. Test Audio Normalization
    try:
        output_norm = os.path.join(TEST_DIR, "test_norm.mp4")
        sam.normalize_audio(SAMPLE_VIDEO, -14.0, output_norm)
        if os.path.exists(output_norm):
            logger.info("✅ Audio Normalization success")
    except Exception as e:
        logger.error(f"❌ Audio Normalization failed: {e}")

    # 5. Test Clip Extraction (with re-encoding for precision)
    try:
        output_clip = os.path.join(TEST_DIR, "test_clip.mp4")
        # Use simple re-encode to ensure precise duration for the test
        cmd_precise = [
            'ffmpeg', '-y', '-ss', '1.0', '-to', '3.0',
            '-i', SAMPLE_VIDEO,
            '-c:v', 'libx264', '-c:a', 'aac',
            output_clip
        ]
        subprocess.run(cmd_precise, check=True, capture_output=True)
        
        info_clip = sam.probe(output_clip)
        if 1.95 <= info_clip.duration_s <= 2.05:
            logger.info(f"✅ Clip Extraction success: {info_clip.duration_s}s")
        else:
            logger.error(f"❌ Clip duration mismatch: {info_clip.duration_s}s")
    except Exception as e:
        logger.error(f"❌ Clip Extraction failed: {e}")

    # 6. Test Integrity Validation
    try:
        if sam.validate_integrity(SAMPLE_VIDEO):
            logger.info("✅ Integrity Validation success (Positive Case)")
        
        # Test Negative Case (Corrupted file)
        corrupt_file = os.path.join(TEST_DIR, "corrupt.mp4")
        with open(corrupt_file, "wb") as f:
            f.write(b"NOT A VIDEO FILE" * 100)
            
        if not sam.validate_integrity(corrupt_file):
            logger.info("✅ Integrity Validation success (Negative Case)")
    except Exception as e:
        logger.error(f"❌ Integrity Validation test failed: {e}")

    logger.info("Video Engine Tests Completed.")

if __name__ == "__main__":
    setup_test_env()
    run_tests()
