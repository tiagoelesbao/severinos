import os
from PIL import Image

def physical_crop_logos():
    logo_dir = "apps/creative-design/public/assets/logos"
    logos = ["virals-full.png", "virals-v-star.png"]
    
    for logo_name in logos:
        path = os.path.join(logo_dir, logo_name)
        if os.path.exists(path):
            img = Image.open(path).convert("RGBA")
            width, height = img.size
            
            # O usuário mencionou que a mancha está na parte inferior.
            # Vamos cropar os 15% inferiores e 5% superiores para garantir foco central.
            # E focar na área onde há conteúdo não-transparente.
            
            bbox = img.getbbox() # Captura a área com conteúdo real
            if bbox:
                # Ajustamos o bbox para ser um pouco mais restrito na base
                # (left, top, right, bottom)
                new_bbox = (bbox[0], bbox[1], bbox[2], bbox[3] - 10) 
                cropped = img.crop(new_bbox)
                
                # Salva por cima do original
                cropped.save(path)
                print(f"✅ Logo {logo_name} cropado fisicamente. Novo tamanho: {cropped.size}")

if __name__ == "__main__":
    physical_crop_logos()
