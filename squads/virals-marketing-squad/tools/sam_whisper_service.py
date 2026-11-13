import os
import logging
import whisper
from dataclasses import dataclass
from typing import List, Dict, Any
from datetime import timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sam-whisper-service")

@dataclass
class TranscriptionResult:
    text: str
    segments: List[Dict[str, Any]]
    words: List[Dict[str, Any]]

    def remap_to_fcpxml(self, fcpxml_path: str):
        """
        Remapeia os timestamps da transcrição baseada no FCPXML (timeline cortada).
        Usa detecção por sobreposição com tolerância para não perder segmentos.
        """
        import xml.etree.ElementTree as ET
        tree = ET.parse(fcpxml_path)
        root = tree.getroot()
        
        def parse_time(t):
            if not t: return 0.0
            t = t.replace('s', '')
            if '/' in t:
                n, d = map(float, t.split('/'))
                return n / d
            return float(t)
        
        clips = []
        for clip in root.findall(".//spine/asset-clip"):
            clips.append({
                "offset": parse_time(clip.get('offset')),
                "start": parse_time(clip.get('start')),
                "duration": parse_time(clip.get('duration'))
            })
        
        clips.sort(key=lambda c: c["start"])
        
        TOLERANCE = 0.3  # Segundos de tolerância para bordas de clips

        new_segments = []
        for seg in self.segments:
            seg_start = seg['start']
            seg_end = seg['end']
            
            # Encontrar QUALQUER clip que se sobreponha com este segmento
            # (com tolerância nas bordas)
            best_clip = None
            best_overlap = 0
            
            for clip in clips:
                clip_src_start = clip["start"] - TOLERANCE
                clip_src_end = clip["start"] + clip["duration"] + TOLERANCE
                
                # Calcular sobreposição
                overlap_start = max(seg_start, clip["start"])
                overlap_end = min(seg_end, clip["start"] + clip["duration"])
                overlap = max(0, overlap_end - overlap_start)
                
                # Também considerar segmentos que estão MUITO próximos do clip
                if seg_start >= clip_src_start and seg_start < clip_src_end:
                    if overlap > best_overlap or best_clip is None:
                        best_overlap = overlap
                        best_clip = clip
                elif seg_end > clip["start"] and seg_start < clip["start"] + clip["duration"]:
                    # Segmento cruza a borda do clip
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_clip = clip
            
            if best_clip is not None:
                clip = best_clip
                clip_src_start = clip["start"]
                clip_src_end = clip["start"] + clip["duration"]
                
                # Calcular posição na nova timeline
                # Clamp o segmento dentro do clip
                clamped_start = max(seg_start, clip_src_start)
                clamped_end = min(seg_end, clip_src_end)
                
                new_start = clip["offset"] + (clamped_start - clip_src_start)
                new_end = clip["offset"] + (clamped_end - clip_src_start)
                
                # Garantir duração mínima de 0.1s
                if new_end - new_start < 0.1:
                    new_end = new_start + 0.3
                
                new_seg = dict(seg)
                new_seg['start'] = round(new_start, 3)
                new_seg['end'] = round(new_end, 3)
                new_segments.append(new_seg)
        
        self.segments = new_segments
        logger.info(f"Remapped {len(self.segments)} segments to cut timeline (from {len(self.segments)} original).")

def transcribe(video_path: str, config: Dict[str, Any] = None) -> TranscriptionResult:
    """
    Transcreve áudio de um vídeo usando Whisper.
    Usa modelo 'small' para melhor qualidade em pt-BR.
    """
    if config is None:
        config = {"model": "small", "language": "pt"}
    
    model_name = config.get("model", "small")
    logger.info(f"Transcribing: {video_path}")
    logger.info(f"Loading Whisper model '{model_name}' on cpu")
    
    model = whisper.load_model(model_name)
    result = model.transcribe(
        video_path, 
        language=config.get("language", "pt"), 
        verbose=False, 
        word_timestamps=True,
        condition_on_previous_text=True,  # Melhor coerência entre frases
        no_speech_threshold=0.6,  # Menos falsos positivos
    )
    
    all_words = []
    for segment in result['segments']:
        if 'words' in segment:
            all_words.extend(segment['words'])
            
    return TranscriptionResult(
        text=result['text'],
        segments=result['segments'],
        words=all_words
    )

def generate_srt(result: TranscriptionResult, output_path: str, style: str = "popup"):
    """
    Gera um arquivo SRT limpo, sem tags HTML.
    DaVinci Resolve controla o tamanho da fonte no painel de subtítulos.
    Styles: 'popup' (UPPER bold), 'netflix' (lowercase clean)
    """
    logger.info(f"Generating {style} SRT: {output_path}")
    
    def format_timestamp(seconds: float) -> str:
        ms = int((seconds % 1) * 1000)
        s = int(seconds % 60)
        m = int((seconds // 60) % 60)
        h = int(seconds // 3600)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    segments = result.segments
    with open(output_path, "w", encoding="utf-8-sig") as f:
        for i, segment in enumerate(segments):
            start = format_timestamp(segment['start'])
            end = format_timestamp(segment['end'])
            
            # Netflix: lowercase limpo. Popup: UPPERCASE.
            if style == "netflix":
                text = segment['text'].strip().lower()
            else:
                text = segment['text'].strip().upper()
            
            # Limite de caracteres muito rigoroso para Reels (9:16)
            # 15 chars max garante que fica pequeno e legível
            max_chars = 15 if style == "netflix" else 22
            
            if len(text) > max_chars:
                words = text.split()
                lines = []
                current_line = []
                current_len = 0
                for word in words:
                    if current_len + len(word) + 1 > max_chars:
                        lines.append(" ".join(current_line))
                        current_line = [word]
                        current_len = len(word)
                    else:
                        current_line.append(word)
                        current_len += len(word) + 1
                if current_line:
                    lines.append(" ".join(current_line))
                # Max 2 linhas
                text = "\n".join(lines[:2])

            # SEM tags HTML — DaVinci controla o estilo no subtitle track
            f.write(f"{i+1}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")
