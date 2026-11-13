import os
import time
import subprocess
import logging
from moviepy import VideoFileClip

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("benchmark-video")

TEST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../tmp/test_video"))
INPUT_VIDEO = os.path.join(TEST_DIR, "sample_input.mp4")
OUTPUT_FFMPEG = os.path.join(TEST_DIR, "bench_ffmpeg.mp4")
OUTPUT_MOVIEPY = os.path.join(TEST_DIR, "bench_moviepy.mp4")

def setup():
    if not os.path.exists(INPUT_VIDEO):
        logger.error("Input video not found. Run test_video_engine.py first.")
        return False
    return True

def bench_ffmpeg():
    logger.info("Starting FFmpeg Benchmark...")
    start_time = time.time()
    
    # Simular uma operação comum: resize + overlay simples
    cmd = [
        'ffmpeg', '-y', '-i', INPUT_VIDEO,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
        '-c:a', 'aac',
        OUTPUT_FFMPEG
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)
    end_time = time.time()
    duration = end_time - start_time
    logger.info(f"FFmpeg Duration: {duration:.2f}s")
    return duration

def bench_moviepy():
    logger.info("Starting MoviePy Benchmark...")
    start_time = time.time()
    
    clip = VideoFileClip(INPUT_VIDEO)
    # Simular mesma operação
    clip_resized = clip.resized(height=1920) # Simplificado
    clip_resized.write_videofile(OUTPUT_MOVIEPY, codec="libx264", audio_codec="aac", fps=30, logger=None)
    
    end_time = time.time()
    duration = end_time - start_time
    logger.info(f"MoviePy Duration: {duration:.2f}s")
    return duration

def run_benchmark():
    if not setup(): return
    
    results = {}
    results['ffmpeg'] = bench_ffmpeg()
    results['moviepy'] = bench_moviepy()
    
    report_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../docs/qa/video-engine-benchmark.md"))
    report_dir = os.path.dirname(report_path)
    if not os.path.exists(report_dir):
        os.makedirs(report_dir)
        
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Video Engine Render Benchmark\n\n")
        f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("| Engine | Duration (s) | Efficiency |\n")
        f.write("| --- | --- | --- |\n")
        f.write(f"| FFmpeg (CLI) | {results['ffmpeg']:.2f}s | 100% (Base) |\n")
        f.write(f"| MoviePy (Python) | {results['moviepy']:.2f}s | { (results['ffmpeg']/results['moviepy'])*100 :.1f}% |\n\n")
        f.write("## Observations\n")
        f.write("- FFmpeg direct CLI is generally faster due to lower overhead.\n")
        f.write("- MoviePy is better for complex procedural editing but slower for simple transforms.\n")
        
    logger.info(f"Benchmark report generated: {report_path}")

if __name__ == "__main__":
    run_benchmark()
