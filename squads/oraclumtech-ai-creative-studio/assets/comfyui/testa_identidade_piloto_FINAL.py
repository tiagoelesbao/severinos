import os
import sys
import json
import shutil
import time
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import run_batch

WORKFLOW_FILE = os.path.join(SCRIPT_DIR, "workflows", "flux2-identity-t2i.json")
if not os.path.exists(WORKFLOW_FILE):
    WORKFLOW_FILE = os.path.join(SCRIPT_DIR, "workflows", "flux2-identity-t2i.json")

BOARD_FILENAME = "character_board.png"
BOARD_PATH_INPUT = os.path.join(run_batch.COMFY_INPUT, BOARD_FILENAME)

PROMPT_BASE_GERACAO = (
    'vertical 9:16 professional studio portrait photo of a 27 year old Brazilian woman creator, '
    'warm light-brown skin with natural texture, oval face, high cheekbones, '
    'dark-brown almond eyes, dark eyebrows, straight dark-brown shoulder-length hair, exact center part, '
    'full lips, soft neutral expression, small gold hoop earrings, one subtle beauty mark on left cheek, '
    'clean white studio background, soft professional lighting, 8k resolution'
)

WIDTH = 1080
HEIGHT = 1920

JOBS_PILOTO = [
    {
        "id": "praia", 
        "prompt": "standing outdoors on a sunny tropical beach, white sand, clear turquoise ocean background, wearing a simple white linen dress, bright daylight photography, professional color grading"
    },
    {
        "id": "escritorio", 
        "prompt": "sitting indoors at a modern minimalist office desk, typing on a sleek laptop, large glass windows with soft city daylight in background, wearing a casual black blazer, corporate aesthetic"
    },
    {
        "id": "neon", 
        "prompt": "standing indoors in a dark cyberpunk studio, vibrant pink and cyan neon rim lighting reflections on clothing, wearing a streetwear black hoodie, moody atmospheric contrast"
    }
]

def gerar_workflow_etapa0(workflow_in):
    """Gera o workflow para criar a imagem base (Character Board / Canon) contornando o PuLID"""
    with open(workflow_in, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    seed_base = random.randint(100000, 9999999)
    nodes_list = data.get("nodes", []) if isinstance(data, dict) else data
    
    for node in nodes_list:
        if not isinstance(node, dict):
            continue
        nid = node.get("id")
        if nid == 4:
            node["widgets_values"] = [PROMPT_BASE_GERACAO]
        elif nid == 6:
            node["widgets_values"] = [WIDTH, HEIGHT, 1]
        elif nid == 7:
            node["widgets_values"] = [4, WIDTH, HEIGHT]
        elif nid == 9:
            node["widgets_values"] = [seed_base, "randomize"]
        elif nid == 13:
            node["widgets_values"] = ["image/piloto/base/canvas"]
        elif nid == 10:
            # Redireciona a entrada 'model' do CFGGuider para ignorar o PuLID e pegar direto do Unet (Link 3)
            for inp in node.get("inputs", []):
                if inp.get("name") == "model":
                    inp["link"] = 3
                    
    out_file = os.path.join(SCRIPT_DIR, "temp_workflow_base.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    return out_file

def injetar_valores_variacao(workflow_in, job_id, prompt_ext):
    """Gera os workflows de cenário aplicando o Character Board gerado via PuLID"""
    with open(workflow_in, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    seed_unica = random.randint(100000, 9999999)
    nodes_list = data.get("nodes", []) if isinstance(data, dict) else data
    
    for node in nodes_list:
        if not isinstance(node, dict):
            continue
        nid = node.get("id")
        if nid == 4:
            node["widgets_values"] = ['vertical 9:16 professional editorial photography, cinematic lighting, small gold hoop earrings, one subtle beauty mark on left cheek, ' + prompt_ext]
        elif nid == 6:
            node["widgets_values"] = [WIDTH, HEIGHT, 1]
        elif nid == 7:
            node["widgets_values"] = [4, WIDTH, HEIGHT]
        elif nid == 9:
            node["widgets_values"] = [seed_unica, "randomize"]
        elif nid == 13:
            node["widgets_values"] = [f"image/piloto/{job_id}/take"]
        elif nid == 103:
            node["widgets_values"] = [BOARD_FILENAME, "image"]
        elif nid == 104:
            node["widgets_values"] = [0.95]
        elif nid == 10:
            # Garante que na variação o modelo volte a puxar o link corrigido do PuLID (Link 104)
            for inp in node.get("inputs", []):
                if inp.get("name") == "model":
                    inp["link"] = 104
            
    out_file = os.path.join(SCRIPT_DIR, f"temp_workflow_{job_id}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    return out_file

if __name__ == "__main__":
    print("--- INICIANDO PIPELINE COMPLETA: ETAPA 0 (BASE) + VARIAÇÕES ---")
    
    if not run_batch.esperar_api():
        print("ERRO: ComfyUI não está respondendo na API.")
        exit(1)
        
    objinfo = run_batch.get("/object_info")
    
    # --- ETAPA 0: Gerar a imagem base de referência ---
    print("\n>> [Etapa 0] Gerando Character Board / Base da Influencer...")
    wf_base = gerar_workflow_etapa0(WORKFLOW_FILE)
    job_base = {"id": "geracao-base-influencer", "workflow": wf_base, "overrides": {}}
    
    run_batch.rodar(job_base, objinfo, [])
    time.sleep(3)
    
    if os.path.exists(wf_base):
        os.remove(wf_base)
        
    output_dir = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\output\image\piloto\base"
    if not os.path.exists(output_dir):
        output_dir = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\output"
        
    print(f"[setup] Buscando imagem base gerada em {output_dir}...")
    time.sleep(3)
    
    try:
        arquivos = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith(('.png', '.jpg'))]
        if arquivos:
            latest_file = max(arquivos, key=os.path.getctime)
            shutil.copy2(latest_file, BOARD_PATH_INPUT)
            print(f"[setup] Character Board estabelecido com sucesso em: {BOARD_PATH_INPUT}")
        else:
            print("[ERRO CRÍTICO] A imagem base não foi encontrada na pasta de output.")
            exit(1)
    except Exception as e:
        print(f"[ERRO] Falha ao definir o Character Board automático: {e}")
        exit(1)

    # --- ETAPAS SEGUINTES: Rodar os cenários usando a base gerada ---
    for job in JOBS_PILOTO:
        print(f"\n>> [Pipeline] Renderizando cenário estruturado: {job['id']}")
        
        temp_wf = injetar_valores_variacao(WORKFLOW_FILE, job["id"], job["prompt"])
        
        job_dit = {
            "id": f"piloto-influencer-{job['id']}",
            "workflow": temp_wf,
            "overrides": {} 
        }
        
        run_batch.rodar(job_dit, objinfo, [])
        time.sleep(2)
        
        if os.path.exists(temp_wf):
            os.remove(temp_wf)

    print("\n--- PIPELINE COMPLETA CONCLUÍDA COM SUCESSO ---")
    