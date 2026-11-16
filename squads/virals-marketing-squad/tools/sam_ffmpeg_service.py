import os
import subprocess
import json
import logging
from dataclasses import dataclass
from typing import List, Tuple, Optional

# Configuração de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("sam-ffmpeg-service")

@dataclass
class VideoInfo:
    duration_s: float
    codec: str
    resolution: Tuple[int, int]
    fps: float
    bitrate_mbps: float
    audio_channels: int

@dataclass
class CutReport:
    reduction_pct: float
    cuts_count: int
    original_duration: float
    new_duration: float

def probe(video_path: str) -> VideoInfo:
    """Análise completa do vídeo via FFprobe."""
    logger.info(f"Probing video: {video_path}")
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_format', '-show_streams', video_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    
    video_stream = next(s for s in data['streams'] if s['codec_type'] == 'video')
    audio_stream = next((s for s in data['streams'] if s['codec_type'] == 'audio'), None)
    
    format_info = data['format']
    
    # FPS handling
    avg_frame_rate = video_stream.get('avg_frame_rate', '0/0')
    num, den = map(int, avg_frame_rate.split('/'))
    fps = num / den if den != 0 else 0
    
    return VideoInfo(
        duration_s=float(format_info['duration']),
        codec=video_stream['codec_name'],
        resolution=(int(video_stream['width']), int(video_stream['height'])),
        fps=round(fps, 3),
        bitrate_mbps=float(format_info.get('bitrate', 0)) / 1_000_000,
        audio_channels=int(audio_stream['channels']) if audio_stream else 0
    )

def silence_cut(input_path: str, output_path: str, threshold_pct: float = 4.0) -> CutReport:
    """Corte automático de silêncio via auto-editor."""
    logger.info(f"Running silence cut on {input_path} (threshold: {threshold_pct}%)")
    
    # Auto-editor command
    # threshold_pct is converted to auto-editor format (usually 0.04 for 4%)
    margin = "0.1s"
    cmd = [
        'auto-editor', input_path,
        '--silent-threshold', f"{threshold_pct/100}",
        '--frame-margin', margin,
        '--output', output_path
    ]
    
    info_before = probe(input_path)
    subprocess.run(cmd, check=True)
    info_after = probe(output_path)
    
    reduction = ((info_before.duration_s - info_after.duration_s) / info_before.duration_s) * 100
    
    return CutReport(
        reduction_pct=round(reduction, 2),
        cuts_count=0, # Auto-editor doesn't return count easily in CLI mode
        original_duration=info_before.duration_s,
        new_duration=info_after.duration_s
    )

def reformat(input_path: str, preset: str, reframe_mode: str, output_path: str) -> str:
    """Reformata vídeo para um preset de plataforma."""
    logger.info(f"Reformatting {input_path} to {preset} (mode: {reframe_mode})")
    
    PRESETS = {
        "reels":       {"w": 1080, "h": 1920, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
        "tiktok":      {"w": 1080, "h": 1920, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
        "shorts":      {"w": 1080, "h": 1920, "fps": 60,  "bitrate": "8M",  "codec": "libx264"},
        "feed-square": {"w": 1080, "h": 1080, "fps": 30,  "bitrate": "6M",  "codec": "libx264"},
        "youtube":     {"w": 1920, "h": 1080, "fps": 60,  "bitrate": "12M", "codec": "libx264"},
        "linkedin":    {"w": 1920, "h": 1080, "fps": 30,  "bitrate": "8M",  "codec": "libx264"},
    }
    
    p = PRESETS.get(preset)
    if not p:
        raise ValueError(f"Unknown preset: {preset}")
        
    # FFmpeg complex filter for reframe
    if reframe_mode == "blur-bg":
        filter_complex = (
            f"[0:v]scale={p['w']}:{p['h']}:force_original_aspect_ratio=decrease,pad={p['w']}:{p['h']}:(ow-iw)/2:(oh-ih)/2:black[fg];"
            f"[0:v]scale={p['w']}:{p['h']},boxblur=20[bg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    elif reframe_mode == "center":
        filter_complex = f"scale={p['w']}:{p['h']}:force_original_aspect_ratio=increase,crop={p['w']}:{p['h']}"
    else:
        filter_complex = f"scale={p['w']}:{p['h']}"

    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-filter_complex', filter_complex,
        '-c:v', p['codec'], '-b:v', p['bitrate'],
        '-g', '1', '-preset', 'fast',  # ALL-I configuration for buttery smooth editing
        '-r', str(p['fps']),
        '-c:a', 'aac', '-b:a', '128k',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def apply_virals_grading(input_path: str, output_path: str) -> str:
    """
    Aplica o 'Virals Look' (Color Grading Profissional) via FFmpeg.
    Ajusta contraste, saturação e aplica um leve Teal & Orange cinemático.
    """
    logger.info(f"Applying Virals Professional Color Grading to {input_path}")
    
    # Filtros:
    # 1. eq: Contraste (1.1) e Saturação (1.3) para dar 'pop'
    # 2. colorbalance: Aumenta levemente Vermelho nos highlights (rh) e Azul nas sombras (bs)
    # 3. unsharp: Nitidez sutil para um visual mais 'crisp'
    filters = (
        "eq=contrast=1.1:saturation=1.25:brightness=0.02,"
        "colorbalance=rh=0.04:gh=0.02:bh=-0.02:rs=-0.02:gs=0.0:bs=0.04,"
        "unsharp=3:3:0.6:3:3:0.0"
    )
    
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-vf', filters,
        '-c:v', 'libx264', '-crf', '18',
        '-pix_fmt', 'yuv420p', # Obrigatório para DaVinci Resolve Free no Windows
        '-profile:v', 'high',
        '-level:v', '4.1',
        '-preset', 'fast',
        '-c:a', 'copy',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def apply_lut(input_path: str, lut_path: str, intensity: float, output_path: str) -> str:
    """Aplica LUT com intensidade configurável."""
    logger.info(f"Applying LUT {lut_path} (intensity: {intensity}) to {input_path}")
    
    # FFmpeg lut3d filter
    # Note: intensity handling is complex in pure FFmpeg, 
    # usually done via mixing original and filtered stream
    filter_string = (
        f"[0:v]lut3d='{lut_path}'[lutted];"
        f"[0:v][lutted]blend=all_expr='A*(1-{intensity})+B*{intensity}'"
    )
    
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-filter_complex', filter_string,
        '-c:v', 'libx264', '-crf', '18',
        '-c:a', 'copy',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def extract_clip(input_path: str, start_s: float, end_s: float, output_path: str) -> str:
    """Extrai um clip sem re-encode."""
    logger.info(f"Extracting clip from {input_path} ({start_s}s to {end_s}s)")
    
    cmd = [
        'ffmpeg', '-y', '-ss', str(start_s), '-to', str(end_s),
        '-i', input_path,
        '-c', 'copy',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def normalize_audio(input_path: str, target_lufs: float = -14.0, output_path: str = None) -> str:
    """Normaliza áudio para loudness alvo (EBU R128)."""
    logger.info(f"Normalizing audio for {input_path} to {target_lufs} LUFS")
    
    if not output_path:
        output_path = input_path.replace(".mp4", "_norm.mp4")

    # Double pass normalization via loudnorm
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-af', f'loudnorm=I={target_lufs}:TP=-1.5:LRA=11',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def validate_integrity(file_path: str, expected_res: Tuple[int, int] = None) -> bool:
    """Valida se o vídeo não está corrompido e possui os metadados esperados."""
    logger.info(f"Validating integrity of {file_path}")
    
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        logger.error(f"File missing or empty: {file_path}")
        return False
        
    # 1. Decoding check
    cmd = ['ffmpeg', '-v', 'error', '-i', file_path, '-f', 'null', '-']
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Corruption detected in {file_path}: {result.stderr}")
        return False
        
    # 2. Metadata check
    try:
        info = probe(file_path)
        if expected_res and info.resolution != expected_res:
            logger.error(f"Resolution mismatch: expected {expected_res}, got {info.resolution}")
            return False
    except Exception as e:
        logger.error(f"Failed to probe file for metadata: {e}")
        return False
        
    logger.info(f"Integrity check passed for {file_path}")
    return True

def composite_overlay(video_path: str, overlay_path: str, output_path: str, start_s: float = 0.0, duration_s: float = None) -> str:
    """Sobrepõe uma imagem (overlay) em um vídeo com transparência."""
    logger.info(f"Compositing overlay {overlay_path} onto {video_path} (start: {start_s}s, duration: {duration_s}s)")
    
    # FFmpeg overlay filter
    enable_str = ""
    if duration_s:
        enable_str = f":enable='between(t,{start_s},{start_s+duration_s})'"
    
    cmd = [
        'ffmpeg', '-y', '-i', video_path, '-i', overlay_path,
        '-filter_complex', f"[0:v][1:v]overlay=0:0{enable_str}",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
        '-c:a', 'copy', # Preservar áudio original
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def apply_audio_correction(input_path: str, output_path: str) -> str:
    """Aplica Compressor e Limiter para voz profissional."""
    logger.info(f"Applying audio correction to {input_path}")
    
    # Compand filter: compressor dinâmico
    # Alimiter: garante que o áudio não clipe (limiter em -1dB)
    audio_filter = "compand=attacks=0.3:decays=0.8:points=-70/-70|-60/-20|0/0:soft-knee=6:gain=0:volume=-90:delay=0.2,alimiter=level_in=1:level_out=1:limit=0.9:attack=5:release=50"
    
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-af', audio_filter,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def mix_background_music(video_path: str, music_path: str, output_path: str, ducking: bool = True) -> str:
    """Mixagem de trilha sonora com Smart Ducking opcional."""
    logger.info(f"Mixing {music_path} into {video_path} (ducking: {ducking})")
    
    if ducking:
        # Sidechain ducking: a música abaixa quando há voz no vídeo (0:a)
        filter_complex = (
            "[1:a]volume=0.2[bg];"
            "[bg][0:a]sidechaincompress=threshold=0.1:ratio=5:attack=50:release=1000[music_ducked];"
            "[0:a][music_ducked]amix=inputs=2:duration=first"
        )
    else:
        filter_complex = "[1:a]volume=0.1[bg];[0:a][bg]amix=inputs=2:duration=first"

    cmd = [
        'ffmpeg', '-y', '-i', video_path, '-i', music_path,
        '-filter_complex', filter_complex,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        output_path
    ]
    
    subprocess.run(cmd, check=True)
    return output_path

def batch_reformat(inputs: List[str], preset: str, reframe_mode: str, output_dir: str) -> List[str]:
    """Reformata lista de vídeos em lote."""
    logger.info(f"Batch reformatting {len(inputs)} videos to {preset}")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    outputs = []
    for inp in inputs:
        filename = os.path.basename(inp)
        out = os.path.join(output_dir, filename)
        try:
            reformat(inp, preset, reframe_mode, out)
            outputs.append(out)
        except Exception as e:
            logger.error(f"Failed to reformat {inp}: {e}")
            
    return outputs
