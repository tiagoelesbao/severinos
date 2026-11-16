"""
Verifica o sinal "Sincronizar agora" do botão na Visão Executiva do BI
(apps/BI/imperio-premios/nav.html + api/solicitar-sync.js) e, se houver
pedido pendente, dispara o MESMO refresh completo do refresh.ps1
(bi_aggregator.py + redeploy) imediatamente, sem esperar o ciclo de 15min.

Rodado via Windows Task Scheduler a cada 1min (BI-Imperio-SyncCheck) —
a checagem em si é barata (1 GET), só vira pesado quando há pedido de
verdade.

MIGRADO 2026-10-24 (pedido do founder) de Edge Config pra Supabase Storage:
o Edge Config (chave "bi_sync") bateu no limite de escrita do plano Free da
Vercel (429 rate_limited, trava 30 dias) — provavelmente só de uso normal
deste botão ao longo do tempo. Storage não tem esse limite, mesmo padrão já
provado em `snapshot_sorteios.py` (catálogo de sorteios) e em
`client_api.py::is_paused()` (flag de pausa). Sinal vive no bucket público
"catalogo", objeto "bi_sync.json":
    {"requested": bool, "requested_at": iso|None, "last_synced_at": iso|None}
"""
import os
import sys
import json
import subprocess
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, "..", "..", "..", ".env"))

SUPABASE_URL = (os.environ.get("IMPERIO_SUPABASE_URL") or "").strip().strip('"').rstrip("/")
SUPABASE_KEY = (os.environ.get("IMPERIO_SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"')
BUCKET = "catalogo"
OBJETO = "bi_sync.json"
BI_DIR = os.path.join(ROOT, "..", "..", "..", "apps", "BI", "imperio-premios")


def ler_sinal():
    r = requests.get(f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{OBJETO}", timeout=15)
    if r.status_code == 404:
        return {"requested": False, "requested_at": None, "last_synced_at": None}
    r.raise_for_status()
    return r.json()


def gravar_sinal(valor):
    r = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{OBJETO}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "x-upsert": "true",
        },
        data=json.dumps(valor),
        timeout=15,
    )
    r.raise_for_status()


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Env vars de sync ausentes (IMPERIO_SUPABASE_URL/IMPERIO_SUPABASE_SERVICE_ROLE_KEY) — abortando.")
        sys.exit(1)

    sinal = ler_sinal()
    if not sinal.get("requested"):
        print("nada pendente")
        return

    print(f"🔄 Sync solicitado às {sinal.get('requested_at')} — rodando refresh agora...")

    aggregator = os.path.join(ROOT, "bi_aggregator.py")
    r1 = subprocess.run([sys.executable, aggregator, "--dias", "14"], cwd=ROOT)
    if r1.returncode != 0:
        print(f"❌ bi_aggregator.py falhou (exit {r1.returncode}) — sinal mantido pendente pra tentar de novo no próximo minuto.")
        sys.exit(1)

    r2 = subprocess.run(["vercel", "--prod", "--yes"], cwd=BI_DIR, shell=True)
    if r2.returncode != 0:
        print(f"❌ vercel --prod falhou (exit {r2.returncode}) — sinal mantido pendente pra tentar de novo no próximo minuto.")
        sys.exit(1)

    agora = datetime.now(timezone.utc).isoformat()
    gravar_sinal({"requested": False, "requested_at": sinal.get("requested_at"), "last_synced_at": agora})
    print(f"✅ Sync manual concluído e sinal limpo ({agora}).")


if __name__ == "__main__":
    main()
