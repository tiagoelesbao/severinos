import os
import sys
import json
import time
import base64
import urllib.parse
from playwright.sync_api import sync_playwright

class VVSRenderService:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.environ.get(
            "RENDER_BASE_URL", "http://localhost:3001"
        )

    def _build_render_url(self, props):
        """
        Constrói a URL de renderização com props codificadas em Base64.
        """
        json_str = json.dumps(props)
        b64_str = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        return f"{self.base_url}/render?data={urllib.parse.quote(b64_str)}"

    # Padrão 4:5 (1080x1350) — formato vertical recomendado pela grade do
    # Instagram (a grade do perfil exibe em 3:4, recortando levemente o topo/base).
    def render_component(self, component_id, props, output_path, viewport=(1080, 1350)):
        # Storybook ID ignorado nesta versão, usamos a rota /render direta
        with sync_playwright() as p:
            print(f"--- Renderizando Slide {props.get('slideNumber')} ---")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': viewport[0], 'height': viewport[1]},
                device_scale_factor=2
            )
            
            page = context.new_page()
            url = self._build_render_url(props)
            
            # Navegação
            print(f"Acessando: {url[:100]}...")
            page.goto(url, wait_until="networkidle", timeout=60000)
            
            # Espera o container de renderização
            page.wait_for_selector("#render-target", timeout=10000)
            
            # Delay para imagens/fontes
            time.sleep(2.5) 
            
            # Forçar fundo transparente em TODOS os elementos de fundo
            page.evaluate("""() => {
                document.body.style.background = 'transparent';
                document.documentElement.style.background = 'transparent';
                const root = document.getElementById('root') || document.getElementById('__next');
                if (root) root.style.background = 'transparent';
                // Remove fundos de containers wrapper
                document.querySelectorAll('[class*="background"], [class*="wrapper"], [class*="container"]').forEach(el => {
                    el.style.background = 'transparent';
                });
            }""")
            # Esconde o indicador de dev do Next.js — não pode vazar na captura.
            page.add_style_tag(content=(
                "nextjs-portal,[data-next-badge-root],"
                "[data-nextjs-dev-tools-button],#__next-build-watcher"
                "{display:none!important;opacity:0!important}"
            ))
            time.sleep(0.5)
            
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            page.screenshot(path=output_path, type="png", omit_background=True)
            
            # Otimização WebP
            from PIL import Image
            webp_path = output_path.replace('.png', '.webp')
            img = Image.open(output_path)
            img.save(webp_path, "WEBP", quality=85)
            
            browser.close()
            print(f"Finalizado: {output_path}")
            return output_path

if __name__ == "__main__":
    service = VVSRenderService()
    service.render_component("", {"headline": "TESTE ROTA DIRETA"}, "outputs/vvs-test/direct-route.png")
