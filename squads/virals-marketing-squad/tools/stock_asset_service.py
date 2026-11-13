import os
import requests
import logging
import time
from typing import Optional

logger = logging.getLogger("stock-asset-service")

class StockAssetService:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def fetch_broll_image(self, keywords: str) -> Optional[str]:
        """
        Busca uma imagem de estoque usando LoremFlickr (estável para MVPs).
        """
        logger.info(f"Searching B-Roll for: {keywords}")
        
        # LoremFlickr é mais estável que o antigo Unsplash Source para automação
        clean_keywords = keywords.replace(" ", ",")
        url = f"https://loremflickr.com/1080/1920/{clean_keywords}"
        
        # Usar um hash das keywords para evitar nomes de arquivo inválidos e duplicados
        import hashlib
        h = hashlib.md5(keywords.encode()).hexdigest()[:8]
        filename = f"broll_{h}.jpg"
        filepath = os.path.join(self.output_dir, filename)
        
        if os.path.exists(filepath):
            return filepath

        try:
            # Tentar baixar a imagem com retentativas
            for _ in range(3):
                response = requests.get(url, timeout=15, stream=True)
                if response.status_code == 200:
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(1024):
                            f.write(chunk)
                    
                    # Verificar se o arquivo não está vazio
                    if os.path.getsize(filepath) > 1000:
                        logger.info(f"B-Roll downloaded: {filepath}")
                        return filepath
                time.sleep(1)
        except Exception as e:
            logger.error(f"Failed to download B-Roll for '{keywords}': {e}")
            
        return None
