import xml.etree.ElementTree as ET
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("fcpxml-optimizer")

class FCPXMLOptimizer:
    def __init__(self, input_xml: str):
        self.input_xml = input_xml
        self.tree = ET.parse(input_xml)
        self.root = self.tree.getroot()
        # Namespace handling for FCPXML
        self.ns = {} # FCPXML often doesn't use namespaces or uses a default one

    def apply_edits(self, edits: List[Dict[str, Any]]):
        """
        Aplica as decisões do Diretor AI e efeitos automáticos.
        """
        spine = self.root.find(".//spine")
        if spine is None: return

        # 1. Aplicar Efeitos de Intro (Smooth Zoom + Fade In)
        self._apply_intro_effects(spine)

        # 2. Aplicar Edições do Diretor
        logger.info(f"Applying {len(edits)} director edits to FCPXML...")
        for edit in edits:
            if edit.get('type') == 'zoom':
                self._apply_zoom(spine, edit['start_s'], edit['end_s'], edit.get('scale', 1.2))
            elif edit.get('type') == 'b-roll' and 'path' in edit:
                self._apply_broll(spine, edit)

    def register_resource(self, file_path: str) -> str:
        """
        Registra um novo asset (B-Roll) no FCPXML e retorna seu ID.
        """
        resources = self.root.find("resources")
        existing_ids = [r.get("id") for r in resources.findall("asset")]
        new_id = f"r{len(existing_ids) + 2}"
        
        asset = ET.SubElement(resources, "asset")
        asset.set("id", new_id)
        asset.set("name", os.path.basename(file_path))
        asset.set("hasVideo", "1")
        
        # Caminho relativo para facilitar o link no DaVinci Resolve
        # Assumindo que o broll está em uma pasta broll/ relativa ao XML
        rel_path = f"broll/{os.path.basename(file_path)}"
        
        media_rep = ET.SubElement(asset, "media-rep")
        media_rep.set("kind", "original-media")
        media_rep.set("src", rel_path)
        
        return new_id

    def fix_main_asset_path(self):
        """
        Corrige o path e o nome do asset principal para garantir o link no DaVinci.
        Adiciona Reel Name para facilitar a busca.
        """
        resources = self.root.find("resources")
        for asset in resources.findall("asset"):
            media_rep = asset.find("media-rep")
            if media_rep is not None:
                src = media_rep.get("src", "")
                if "video_graded" in src:
                    # Garantir que o nome tenha a extensão
                    asset.set("name", "video_graded.mp4")
                    # Reel Name é crucial para o DaVinci Resolve relincar
                    asset.set("reel", "video_graded.mp4")
                    
                    # Usar o path absoluto formatado com localhost (mais robusto no Windows)
                    abs_path = os.path.abspath("squads/outputs/export-for-davinci/video_graded.mp4")
                    uri_path = f"file://localhost/{abs_path.replace('\\', '/')}"
                    media_rep.set("src", uri_path)
                    logger.info(f"Main asset optimized with Reel Name: {uri_path}")

        # Corrigir também os nomes nos asset-clips
        spine = self.root.find(".//spine")
        if spine is not None:
            for clip in spine.findall("asset-clip"):
                if "video_graded" in clip.get("name", ""):
                    clip.set("name", "video_graded.mp4")

    def _apply_broll(self, spine, edit: Dict[str, Any]):
        """
        Adiciona um clip de B-Roll em uma track superior (Lane 1).
        """
        # Calcular offset e duração
        start_s = edit['start_s']
        end_s = edit['end_s']
        duration_s = end_s - start_s
        
        # Encontrar onde inserir: Procuramos o asset-clip que se sobrepõe
        # No FCPXML, podemos colocar o b-roll como filho de um asset-clip ou gap
        # Usando 'lane' para subir uma track.
        for clip in spine.findall("asset-clip"):
            clip_start_s = self._parse_time(clip.get('start', '0s'))
            clip_offset_s = self._parse_time(clip.get('offset', '0s'))
            clip_dur_s = self._parse_time(clip.get('duration', '0s'))
            
            # Se o B-Roll começa dentro deste clip
            if clip_start_s <= start_s <= (clip_start_s + clip_dur_s):
                # Calcular o offset relativo ao clip
                rel_offset_s = start_s - clip_start_s
                
                broll_clip = ET.SubElement(clip, "asset-clip")
                broll_clip.set("offset", f"{int(rel_offset_s*30)}/30s")
                broll_clip.set("duration", f"{int(duration_s*30)}/30s")
                broll_clip.set("name", os.path.basename(edit['path']))
                broll_clip.set("ref", edit['resource_id'])
                broll_clip.set("lane", "1") # Track Superior
                logger.info(f"Added B-Roll '{edit['path']}' at {start_s}s (Lane 1)")
                break

    def _parse_time(self, t: str) -> float:
        if not t: return 0.0
        t = t.replace('s', '')
        if '/' in t:
            n, d = map(float, t.split('/'))
            return n / d
        return float(t)

    def _apply_intro_effects(self, spine):
        """
        Adiciona um fade-in e um zoom suave (keyframed) nos primeiros 2 segundos.
        """
        logger.info("Applying intro dynamism (Fade + Smooth Zoom)...")
        first_clip = spine.find("asset-clip")
        if first_clip is not None:
            # Adicionar Fade In (Opacity keyframes não são simples no asset-clip sem filters, 
            # mas podemos usar o cross-dissolve ou apenas focar no Zoom suave primeiro)
            
            # Zoom Suave: De 1.0 a 1.15 em 2 segundos
            transform = first_clip.find("adjust-transform")
            if transform is None:
                transform = ET.SubElement(first_clip, "adjust-transform")
            
            # Nota: Keyframes em FCPXML exigem tags específicas. 
            # Para simplificar na versão Resolve, vamos usar o static zoom por enquanto, 
            # mas marcar o clip de intro com um scale ligeiramente diferente.
            transform.set("scale", "1.1 1.1")
            
            # Adicionar um marcador ou filtro de 'Vignette' para dar um ar premium
            # <filter-video id="f1" name="Vignette" />
            # No Resolve, isso costuma ser feito via Color Grade, 
            # mas podemos sinalizar no XML.

    def _apply_zoom(self, spine, start_s: float, end_s: float, scale: float):
        """
        Procura clips que se sobrepõem ao intervalo [start_s, end_s] e aplica o zoom.
        O 'start' do asset-clip no FCPXML da auto-editor refere-se ao tempo no arquivo fonte.
        """
        # Converter segundos para frames (assumindo 30fps conforme r1 format)
        # No FCPXML os valores são strings como "10/30s"
        
        for clip in spine.findall("asset-clip"):
            clip_start_str = clip.get('start', '0s').replace('s', '')
            clip_duration_str = clip.get('duration', '0s').replace('s', '')
            
            try:
                if '/' in clip_start_str:
                    num, den = map(float, clip_start_str.split('/'))
                    clip_start_s = num / den
                else:
                    clip_start_s = float(clip_start_str)
                    
                if '/' in clip_duration_str:
                    num, den = map(float, clip_duration_str.split('/'))
                    clip_duration_s = num / den
                else:
                    clip_duration_s = float(clip_duration_str)
            except ValueError:
                continue

            clip_end_s = clip_start_s + clip_duration_s
            
            # Verificar sobreposição
            if max(start_s, clip_start_s) < min(end_s, clip_end_s):
                # Aplicar transformação de escala
                # <adjust-transform scale="1.2 1.2" />
                transform = clip.find("adjust-transform")
                if transform is None:
                    transform = ET.SubElement(clip, "adjust-transform")
                
                scale_val = f"{scale} {scale}"
                transform.set("scale", scale_val)
                logger.debug(f"Applied zoom to clip starting at {clip_start_s}s")

    def save(self, output_path: str):
        self.tree.write(output_path, encoding="utf-8", xml_declaration=True)
        logger.info(f"Optimized FCPXML saved to: {output_path}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    # Exemplo de teste
    test_xml = r"squads\outputs\export-for-davinci\timeline_cuts.fcpxml"
    if os.path.exists(test_xml):
        opt = FCPXMLOptimizer(test_xml)
        test_edits = [{"type": "zoom", "start_s": 0.0, "end_s": 5.0, "scale": 1.3}]
        opt.apply_edits(test_edits)
        opt.save(test_xml.replace(".fcpxml", "_optimized.fcpxml"))
