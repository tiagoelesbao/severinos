import os
import requests
import io
import time
import base64
from PIL import Image, ImageDraw
from dotenv import load_dotenv

# Carrega do .env local
load_dotenv()

class GenerationResult:
    def __init__(self, image, model_used, seed, time_s):
        self.image = image
        self.model_used = model_used
        self.seed = seed
        self.time_s = time_s

def generate(prompt, config=None):
    if config is None:
        config = {}
    
    start_time = time.time()
    width = config.get("width", 1024)
    height = config.get("height", 1024)
    seed = config.get("seed", int(time.time()))
    max_retries = 5 # Persistência aumentada
    
    # Lista de endpoints gratuitos e confiáveis (Ordem de qualidade/estabilidade)
    providers = [
        # 1. Pollinations Flux (Estado da arte, sem chave)
        {
            "name": "pollinations-flux",
            "url": lambda p: f"https://image.pollinations.ai/prompt/{requests.utils.quote(p)}?width={width}&height={height}&seed={seed}&nologo=true&model=flux"
        },
        # 2. Pollinations Default (Backup do Flux)
        {
            "name": "pollinations-standard",
            "url": lambda p: f"https://image.pollinations.ai/prompt/{requests.utils.quote(p)}?width={width}&height={height}&seed={seed}&nologo=true"
        }
    ]

    for provider in providers:
        print(f"Tentando Provedor: {provider['name']}...")
        for attempt in range(max_retries):
            try:
                url = provider["url"](prompt)
                # Timeout de 50s para garantir imagens pesadas
                response = requests.get(url, timeout=50)
                
                if response.status_code == 200 and len(response.content) > 5000: # Mínimo 5KB para não ser erro/vazio
                    image = Image.open(io.BytesIO(response.content))
                    print(f"✅ Sucesso com {provider['name']} na tentativa {attempt + 1}")
                    return GenerationResult(image, provider["name"], seed, time.time() - start_time)
                
                print(f"⚠️ Tentativa {attempt + 1} falhou (Status {response.status_code})...")
                time.sleep(5) # Espera 5s entre tentativas
                
            except Exception as e:
                print(f"❌ Erro na tentativa {attempt + 1}: {e}")
                time.sleep(5)

    # 3. FALLBACK DE EMERGÊNCIA: Se TUDO falhar, gera um visual de marca Virals aceitável
    print("🚨 TODAS as tentativas de IA falharam. Gerando visual de emergência Virals.")
    # Fundo de marca degradê elegante
    canvas = Image.new("RGBA", (width, height), (26, 26, 46, 255)) # Virals Primary
    draw = ImageDraw.Draw(canvas)
    # Adiciona um gradiente sutil
    for i in range(height):
        alpha = int(255 * (i / height))
        draw.line([0, i, width, i], fill=(233, 69, 96, int(alpha * 0.1)))
    
    return GenerationResult(canvas, "virals-emergency-fallback", seed, time.time() - start_time)

if __name__ == "__main__":
    res = generate("A professional luxury car commercial photo, high-end photography")
    res.image.save("outputs/vvs-test/persistent-ai-test.png")
    print(f"Finalizado. Modelo: {res.model_used}")
