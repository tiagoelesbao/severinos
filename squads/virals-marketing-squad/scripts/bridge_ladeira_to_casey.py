import os
import re
import yaml
import sys

def parse_ladeira_copy(md_path):
    if not os.path.exists(md_path):
        print(f"Erro: Arquivo {md_path} não encontrado.")
        return None
    
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex para extrair campos
    headline_match = re.search(r'\*\*Headline:\*\*\s*(.*)', content)
    body_match = re.search(r'\*\*Body:\*\*\s*(.*)', content)
    cta_match = re.search(r'\*\*CTA:\*\*\s*(.*)', content)
    ai_prompt_match = re.search(r'\*\*AI Prompt:\*\*\s*(.*)', content)
    slug_match = re.search(r'# Copy:\s*(.*)', content)
    
    data = {
        "slug": slug_match.group(1).strip().lower().replace(" ", "-") if slug_match else "automated-post",
        "headline": headline_match.group(1).strip() if headline_match else "",
        "body_text": body_match.group(1).strip() if body_match else "",
        "cta_text": cta_match.group(1).strip() if cta_match else "",
        "ai_prompt": ai_prompt_match.group(1).strip() if ai_prompt_match else None
    }
    
    return data

def create_casey_brief(ladeira_data, type="post"):
    slug = ladeira_data["slug"]
    
    if type == "post":
        brief = {
            "post_brief": {
                "slug": slug,
                "tema": "Automated from Ladeira",
                "objetivo": "conversão",
                "headline": ladeira_data["headline"],
                "body_text": ladeira_data["body_text"],
                "cta_text": ladeira_data["cta_text"],
                "layout": "texto-over-imagem",
                "ai_prompt": ladeira_data["ai_prompt"],
                "formatos": ["1:1", "4:5"],
                "brand_config": "squads/virals-marketing-squad/data/clients/virals/brand-config.yaml",
                "aplicar_logo": True
            }
        }
    else: # carousel
        brief = {
            "carousel_brief": {
                "slug": slug,
                "tema": "Automated Carousel from Ladeira",
                "objetivo": "educar",
                "slide_count": 3, # Default
                "brand_config": "squads/virals-marketing-squad/data/clients/virals/brand-config.yaml"
            },
            "content_data": [
                {
                    "slide_n": 1,
                    "tipo": "hook",
                    "headline": ladeira_data["headline"],
                    "visual": "imagem",
                    "ai_prompt": ladeira_data["ai_prompt"]
                },
                {
                    "slide_n": 2,
                    "tipo": "valor",
                    "headline": "O Valor da Automação",
                    "body_text": ladeira_data["body_text"],
                    "visual": "cor-de-marca"
                },
                {
                    "slide_n": 3,
                    "tipo": "cta",
                    "headline": ladeira_data["cta_text"],
                    "visual": "cor-de-marca"
                }
            ]
        }
        
    output_path = f"squads/virals-marketing-squad/data/brief-{slug}.yaml"
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(brief, f, allow_unicode=True, sort_keys=False)
    
    print(f"Briefing Casey gerado com sucesso em: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python bridge_ladeira_to_casey.py <path_to_ladeira_md> [post|carousel]")
        sys.exit(1)
    
    md_path = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "post"
    
    ladeira_data = parse_ladeira_copy(md_path)
    if ladeira_data:
        create_casey_brief(ladeira_data, mode)
