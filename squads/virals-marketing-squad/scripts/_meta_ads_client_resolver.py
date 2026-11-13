#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_meta_ads_client_resolver.py — Resolução de cliente do pipeline de tráfego
pago Meta Ads (tipo "cliente_trafego_pago" no registry).

Paralelo deliberado a `_client_resolver.py` (pipeline de criativo) — NÃO o
reaproveita porque os campos são diferentes (sem brand_identity/brand_config,
com meta_ads_dir). Ambos leem o mesmo _registry.yaml, cada um só enxerga o
tipo de cliente que sabe resolver.

API:
    resolve_meta_ads_client(slug) -> MetaAdsClientPaths
    list_meta_ads_clients() -> List[MetaAdsClientPaths]
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import List

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML não instalado. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows cp1252 console quebra acentos

REGISTRY_PATH = "squads/virals-marketing-squad/data/clients/_registry.yaml"


@dataclass(frozen=True)
class MetaAdsClientPaths:
    slug: str
    nome_exibicao: str
    meta_ads_dir: str
    brief_path: str
    bm_map_path: str
    gates_status_path: str
    audiences_dir: str
    utm_convention_path: str


def _load_registry() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        raise FileNotFoundError(f"Registry de clientes ausente: {REGISTRY_PATH}")
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def resolve_meta_ads_client(slug: str) -> MetaAdsClientPaths:
    """Resolve um cliente de tráfego pago pelo slug. Exige tipo
    'cliente_trafego_pago' e status 'active' — não tem default implícito
    (diferente do _client_resolver.py de criativo), já que cada cliente de
    Ads tem brief/orçamento/compliance totalmente diferentes."""
    reg = _load_registry()
    clients = reg.get("clients") or {}

    if slug not in clients:
        disponiveis = ", ".join(
            s for s, e in clients.items() if e.get("tipo") == "cliente_trafego_pago"
        ) or "(nenhum)"
        raise ValueError(f"Cliente '{slug}' não existe. Clientes de tráfego pago disponíveis: {disponiveis}")

    entry = clients[slug]
    if entry.get("tipo") != "cliente_trafego_pago":
        raise ValueError(f"Cliente '{slug}' não é do tipo cliente_trafego_pago (é '{entry.get('tipo')}').")
    if entry.get("status") != "active":
        raise ValueError(f"Cliente '{slug}' está com status={entry.get('status')} — não ativo.")

    meta_ads_dir = entry.get("meta_ads_dir") or f"squads/virals-marketing-squad/data/clients/{slug}/meta-ads/"
    if not os.path.isdir(meta_ads_dir):
        raise FileNotFoundError(f"meta_ads_dir ausente para '{slug}': {meta_ads_dir}")

    return MetaAdsClientPaths(
        slug=slug,
        nome_exibicao=entry.get("nome_exibicao", slug),
        meta_ads_dir=meta_ads_dir,
        brief_path=os.path.join(meta_ads_dir, "brief.yaml"),
        bm_map_path=os.path.join(meta_ads_dir, "bm-map.yaml"),
        gates_status_path=os.path.join(meta_ads_dir, "gates-status.yaml"),
        audiences_dir=os.path.join(meta_ads_dir, "audiences"),
        utm_convention_path=os.path.join(meta_ads_dir, "utm-convention.md"),
    )


def list_meta_ads_clients() -> List[MetaAdsClientPaths]:
    """Lista todos os clientes de tráfego pago ativos (para UIs/checkboxes do
    marketing-chief). Ignora silenciosamente entradas malformadas, mesmo
    padrão defensivo do list_active_clients() do pipeline de criativo."""
    reg = _load_registry()
    clients = reg.get("clients") or {}
    out: List[MetaAdsClientPaths] = []
    for slug, entry in clients.items():
        if entry.get("tipo") != "cliente_trafego_pago":
            continue
        try:
            out.append(resolve_meta_ads_client(slug))
        except (FileNotFoundError, ValueError):
            continue
    return out


def load_gates_status(paths: MetaAdsClientPaths) -> dict:
    with open(paths.gates_status_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_brief(paths: MetaAdsClientPaths) -> dict:
    with open(paths.brief_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if not arg:
        print("Uso: python _meta_ads_client_resolver.py <slug>", file=sys.stderr)
        clientes = list_meta_ads_clients()
        if clientes:
            print("Clientes de tráfego pago disponíveis:", ", ".join(c.slug for c in clientes), file=sys.stderr)
        sys.exit(1)
    try:
        cp = resolve_meta_ads_client(arg)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"slug:                {cp.slug}")
    print(f"nome_exibicao:       {cp.nome_exibicao}")
    print(f"meta_ads_dir:        {cp.meta_ads_dir}")
    print(f"brief_path:          {cp.brief_path}")
    print(f"bm_map_path:         {cp.bm_map_path}")
    print(f"gates_status_path:   {cp.gates_status_path}")
    print(f"audiences_dir:       {cp.audiences_dir}")
    print(f"utm_convention_path: {cp.utm_convention_path}")
