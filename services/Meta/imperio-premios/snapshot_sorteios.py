"""
Grava no Supabase um snapshot dos sorteios ATIVOS, para a página /catalogo
da pressel (imperiorapidinhas.com.br/catalogo) consumir.

POR QUE ESTE SCRIPT EXISTE (achado 2026-10-11, causa raiz provada):
a função `apps/imperio-premios-lp/api/sorteios.js` chamava a API do cliente
direto da Vercel e recebia 403 — com corpo de página de desafio do
**Cloudflare** (`server: cloudflare`). O Cloudflare do cliente barra IP de
datacenter. Não era header: a função já mandava User-Agent/Origin/Referer
completos de navegador e continuou 403. Do IP residencial local, o mesmo
login devolve 200.

Então o caminho é não chamar a API do cliente a partir da nuvem: este job
roda LOCAL (IP residencial, que o Cloudflare aceita), busca os ativos e
grava o snapshot no Supabase. A Vercel apenas lê de lá.

Por que o catálogo importa (achado 2026-10-10, validado no browser):
a home (`/`) e a lista (`/campanhas`) do site do cliente NÃO carregam o GTM
e ainda descartam a query string — é a origem do UTM 0% nos pedidos. Já
`/campanha/{friendlyURL}` carrega GTM-58RGNFCK, dispara `view_item` no
dataLayer e grava o cookie `ic_origem`. O catálogo é a ponte que leva o
tráfego pago direto para a página rastreável.

Uso:
    python snapshot_sorteios.py            # grava o snapshot
    python snapshot_sorteios.py --dry-run  # mostra o que gravaria, sem gravar
"""
import os
import sys
import json
import argparse
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"))

from client_api import SorteiosAPIClient  # noqa: E402

SUPABASE_URL = (os.environ.get("IMPERIO_SUPABASE_URL") or "").strip().strip('"').rstrip("/")
SUPABASE_KEY = (os.environ.get("IMPERIO_SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"')

# Guardamos o snapshot como OBJETO no Supabase Storage, não como linha de
# tabela. Razão prática: criar tabela exige DDL, e a service role key de
# runtime não tem essa permissão — dependeria do founder rodar SQL no painel
# (foi o que aconteceu em apps/link-garantido/supabase-schema.sql). A API de
# Storage, por outro lado, aceita a mesma key para criar bucket e gravar
# objeto, então o pipeline sobe inteiro sem ação manual.
# Bônus: o bucket é público, então a leitura do lado da Vercel é um GET sem
# credencial. O conteúdo é a lista de sorteios abertos — informação que já
# está pública no site do cliente, sem nenhum dado pessoal.
BUCKET = "catalogo"
OBJETO = "sorteios.json"

# Quantas páginas de /products varrer. O endpoint é 0-indexado (achado de
# 2026-10-07: começar em page=1 pulava os ~25 sorteios mais recentes, que é
# justamente onde os ativos estão). 2 páginas cobrem com folga — hoje há
# ~6 ativos entre os mais novos.
PAGINAS = 2


def montar_item(p):
    """Converte o objeto bruto do sorteio no shape que catalogo.html consome.

    O slug vem de `friendlyURL`, NUNCA derivado do título: o padrão é
    irregular de verdade — "R$ 27.000,00" vira "r-2700000" num sorteio e
    "R$1.000" vira "1-1000" noutro, e há slug que preserva acento
    ("...-na-tampa-2-edição"). Slug errado leva o usuário para
    "Erro 404 - Campanha não encontrada", ou seja, clique pago queimado.
    Sorteio sem friendlyURL simplesmente não entra no catálogo.

    Achado 2026-10-15: `status == "active"` NÃO significa "tem número à
    venda". Confirmado ao vivo: um sorteio com `drawDate` já vencido ainda
    reportava `status: "active"`. O sinal real de disponibilidade é
    `numbersConfig.qtyFree` (números livres) — quando chega a 0, o sorteio
    esgotou mas o backend do cliente pode demorar a virar o status pra
    "done" (mesma classe de atraso que já corrigimos no `collector.py`).
    Sem este filtro, o catálogo oferece clique pago pra sorteio esgotado,
    que cai em erro/sold-out na página de destino. Também exigimos
    `privacy == "public"`: achado o mesmo dia um sorteio `private` (de
    teste/interno) com `status: "active"` que não deveria aparecer aqui.
    """
    if (p.get("status") or "").lower() != "active":
        return None
    if (p.get("privacy") or "").lower() != "public":
        return None
    qty_free = (p.get("numbersConfig") or {}).get("qtyFree")
    if qty_free is None or qty_free <= 0:
        return None
    slug = p.get("friendlyURL")
    if not slug:
        return None
    imagens = p.get("imageUrls")
    return {
        "id": p.get("_id"),
        "slug": slug,
        "titulo": p.get("title") or "",
        "chamada": p.get("statusText") or "",
        "imagem": imagens[0] if isinstance(imagens, list) and imagens else None,
        "preco": (p.get("numbersConfig") or {}).get("price"),
        "destaque": bool(p.get("highlight")),
    }


def coletar_ativos():
    api = SorteiosAPIClient()
    if not api.login():
        raise RuntimeError("falha no login da API do cliente")
    sorteios = api.get_sorteios(days=2)
    ativos = []
    for p in sorteios:
        item = montar_item(p)
        if item:
            ativos.append(item)
    return ativos


def gravar(sorteios):
    """Sobe o snapshot inteiro como UM objeto JSON (troca atômica).

    O envelope carrega `atualizado_em` dentro do próprio arquivo: o Storage
    expõe cabeçalhos de data, mas depender deles obrigaria o consumidor a ler
    metadados do objeto. Com o carimbo embutido, `api/sorteios.js` decide
    sozinho se o dado ainda é confiável, lendo só o corpo.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "IMPERIO_SUPABASE_URL / IMPERIO_SUPABASE_SERVICE_ROLE_KEY não configurados no .env"
        )
    envelope = {
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
        "sorteios": sorteios,
    }
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{OBJETO}"
    r = requests.post(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            # x-upsert: sobrescreve o objeto existente em vez de falhar com
            # "Duplicate". É o que torna a atualização de 5 em 5 min possível.
            "x-upsert": "true",
            "Cache-Control": "max-age=30",
        },
        data=json.dumps(envelope, ensure_ascii=False).encode("utf-8"),
        timeout=20,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase Storage {r.status_code}: {r.text[:300]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ativos = coletar_ativos()
    print(f"📋 {len(ativos)} sorteio(s) ativo(s) com friendlyURL válido")
    for s in ativos[:5]:
        print(f"   • {s['slug']}")

    if args.dry_run:
        print("\n[dry-run] nada gravado. Payload:")
        print(json.dumps(ativos, ensure_ascii=False, indent=2)[:1500])
        return

    # Guarda contra apagar o catálogo por falha transitória da API: se a
    # coleta voltar vazia, é mais provável que a API tenha oscilado do que
    # o cliente ter encerrado TODOS os sorteios ao mesmo tempo. Preferimos
    # manter o snapshot anterior (levemente velho ainda converte) a zerar a
    # página. O guard de idade em api/sorteios.js cobre o caso de o job
    # ficar realmente parado.
    if not ativos:
        print("⚠️ coleta vazia — snapshot anterior preservado, nada gravado.")
        return

    gravar(ativos)
    print(f"✅ snapshot gravado no Supabase Storage ({len(ativos)} sorteios).")
    print(f"   {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{OBJETO}")


if __name__ == "__main__":
    main()
