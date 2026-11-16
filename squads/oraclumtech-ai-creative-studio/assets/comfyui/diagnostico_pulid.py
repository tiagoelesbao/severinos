"""
Diagnóstico rápido — verifica:
1. Se o ComfyUI está vivo (API responde)
2. Se o nó PulidFluxModelLoader foi registrado
3. Lista todos os nós instalados relacionados a PuLID/identity
"""
import json, urllib.request, urllib.error, sys, time

API = "http://127.0.0.1:8188"

def check_api(tentativas=5):
    print(f"Verificando se ComfyUI está rodando em {API}...")
    for i in range(tentativas):
        try:
            resp = urllib.request.urlopen(API + "/system_stats", timeout=10)
            data = json.loads(resp.read())
            print(f"  [OK] ComfyUI respondeu! Python: {data.get('system', {}).get('python_version', '?')}")
            return True
        except urllib.error.URLError as e:
            print(f"  [tentativa {i+1}/{tentativas}] Sem resposta: {e.reason}")
            time.sleep(3)
        except Exception as e:
            print(f"  [tentativa {i+1}/{tentativas}] Erro: {e}")
            time.sleep(3)
    return False

def check_pulid():
    print("\nBuscando nós do PuLID no /object_info...")
    try:
        resp = urllib.request.urlopen(API + "/object_info", timeout=60)
        objinfo = json.loads(resp.read())
        
        # busca qualquer nó com "pulid" ou "PuLID" no nome
        pulid_nodes = [k for k in objinfo.keys() if "pulid" in k.lower() or "PuLID" in k]
        
        if pulid_nodes:
            print(f"  [OK] Nós do PuLID encontrados:")
            for n in pulid_nodes:
                print(f"       - {n}")
        else:
            print("  [ERRO] Nenhum nó de PuLID encontrado no ComfyUI.")
            print("         O custom node 'ComfyUI-PuLID-Flux' NÃO está instalado/ativo.")
            
            # mostra nós de identity que podem existir como alternativa
            identity_nodes = [k for k in objinfo.keys() if any(
                x in k.lower() for x in ["identity", "reactor", "faceswap", "face_id", "photomaker", "ipadapter"]
            )]
            if identity_nodes:
                print("\n  Nós de identidade/face encontrados (alternativas):")
                for n in identity_nodes:
                    print(f"       - {n}")
                    
        return pulid_nodes
    except Exception as e:
        print(f"  [ERRO] Falha ao buscar /object_info: {e}")
        return []

if __name__ == "__main__":
    if not check_api():
        print("\n[DIAGNÓSTICO] ComfyUI não está respondendo.")
        print("  → Abra o arquivo .bat e aguarde a mensagem 'To see the GUI go to: http://127.0.0.1:8188' no terminal.")
        sys.exit(1)
    
    pulid_nodes = check_pulid()
    
    if pulid_nodes:
        print("\n[DIAGNÓSTICO] Tudo pronto! Rode: python testa_identidade_piloto.py")
    else:
        print("\n[DIAGNÓSTICO] Instale o custom node ComfyUI-PuLID-Flux e reinicie o ComfyUI.")
        sys.exit(1)
