#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_client_resolver.py — Resolução dinâmica de cliente do pipeline *design-creative.

Lê data/clients/_registry.yaml e devolve os paths de brand-identity e brand-config
do cliente solicitado. Centraliza a única fonte de verdade sobre quais clientes
o pipeline pode produzir.

API:
    resolve_client(slug=None) -> ClientPaths
    extract_client_arg(argv) -> (slug | None, argv_sem_flag)
    persist_client_in_brief(brief, slug) -> None  # mutates in place

Default = "virals" (backward compat com pipelines que rodam sem --client).
Slug inválido = ValueError com lista dos slugs disponíveis.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import List, Optional, Tuple

try:
    import yaml
except ImportError:
    print("ERRO: PyYAML não instalado. Rode: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


REGISTRY_PATH = "squads/virals-marketing-squad/data/clients/_registry.yaml"
DEFAULT_CLIENT = "virals"


@dataclass(frozen=True)
class ClientPaths:
    slug: str
    nome_exibicao: str
    brand_identity: str
    brand_config: str
    output_dir: str
    handle_instagram: str
    tipo: str
    monitoring_dir: str   # data/clients/<slug>/monitoring/
    workspace_dir: str    # workspaces/businesses/<slug>/marketing/
    lut_dir: str          # data/clients/<slug>/luts/


def _load_registry() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        raise FileNotFoundError(
            f"Registry de clientes ausente: {REGISTRY_PATH}. "
            "Crie data/clients/_registry.yaml conforme MKT-MC-01."
        )
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def resolve_client(slug: Optional[str] = None) -> ClientPaths:
    """Resolve o slug de cliente para seus paths canônicos.

    Slug = None ou string vazia → usa o default_client do registry (ou 'virals').
    Slug inválido → ValueError com lista dos disponíveis.
    Paths ausentes em disco → FileNotFoundError com mensagem explícita.
    """
    reg = _load_registry()
    clients = reg.get("clients") or {}
    default = (reg.get("meta") or {}).get("default_client", DEFAULT_CLIENT)

    effective_slug = (slug or "").strip() or default

    if effective_slug not in clients:
        disponiveis = ", ".join(sorted(clients.keys())) or "(nenhum)"
        raise ValueError(
            f"Cliente '{effective_slug}' não existe no registry. "
            f"Disponíveis: {disponiveis}"
        )

    entry = clients[effective_slug]
    if entry.get("status") and entry["status"] != "active":
        raise ValueError(
            f"Cliente '{effective_slug}' está com status={entry['status']} — "
            "ative-o no registry para produzir criativos."
        )

    identity = entry.get("brand_identity")
    config = entry.get("brand_config")
    if not identity or not os.path.exists(identity):
        raise FileNotFoundError(
            f"brand_identity ausente para '{effective_slug}': {identity}"
        )
    if not config or not os.path.exists(config):
        raise FileNotFoundError(
            f"brand_config ausente para '{effective_slug}': {config}"
        )

    monitoring_dir = entry.get(
        "monitoring_dir",
        f"squads/virals-marketing-squad/data/clients/{effective_slug}/monitoring/",
    )
    workspace_dir = entry.get(
        "workspace_dir",
        f"workspaces/businesses/{effective_slug}/marketing/",
    )
    lut_dir = entry.get(
        "lut_dir",
        f"squads/virals-marketing-squad/data/clients/{effective_slug}/luts/",
    )

    return ClientPaths(
        slug=effective_slug,
        nome_exibicao=entry.get("nome_exibicao", effective_slug),
        brand_identity=identity,
        brand_config=config,
        output_dir=entry.get("output_dir", f"outputs/{effective_slug}/"),
        handle_instagram=entry.get("handle_instagram", ""),
        tipo=entry.get("tipo", "marca"),
        monitoring_dir=monitoring_dir,
        workspace_dir=workspace_dir,
        lut_dir=lut_dir,
    )


def extract_client_arg(argv: List[str]) -> Tuple[Optional[str], List[str]]:
    """Extrai --client=<slug> de uma lista de argumentos.

    Retorna (slug ou None, argv sem o flag). Aceita também a forma
    `--client <slug>` (com espaço).
    """
    slug: Optional[str] = None
    remaining: List[str] = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--client="):
            slug = a.split("=", 1)[1].strip() or None
        elif a == "--client" and i + 1 < len(argv):
            slug = argv[i + 1].strip() or None
            i += 1
        else:
            remaining.append(a)
        i += 1
    return slug, remaining


def resolve_from_argv_or_brief(
    argv_slug: Optional[str],
    brief: Optional[dict] = None,
) -> ClientPaths:
    """Resolve cliente com fallback hierárquico:
       1. --client explícito;
       2. client_slug presente no brief (caso o pipeline já tenha rodado deep_modeler);
       3. default do registry.
    """
    if argv_slug:
        return resolve_client(argv_slug)
    if brief and brief.get("client_slug"):
        return resolve_client(brief["client_slug"])
    return resolve_client(None)


def persist_client_in_brief(brief: dict, paths: ClientPaths) -> None:
    """Grava o client_slug e nome de exibição na raiz do brief (auditoria + reuso)."""
    brief["client_slug"] = paths.slug
    brief["client_nome"] = paths.nome_exibicao


def list_active_clients() -> List[ClientPaths]:
    """Retorna a lista de clientes ativos do registry (para UIs / checkboxes)."""
    reg = _load_registry()
    clients = reg.get("clients") or {}
    out: List[ClientPaths] = []
    for slug, entry in clients.items():
        if entry.get("status", "active") != "active":
            continue
        try:
            out.append(resolve_client(slug))
        except (FileNotFoundError, ValueError):
            continue
    return out


if __name__ == "__main__":
    # CLI utilitário: `python _client_resolver.py [slug]` imprime os paths.
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    try:
        cp = resolve_client(arg)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"slug:           {cp.slug}")
    print(f"nome_exibicao:  {cp.nome_exibicao}")
    print(f"brand_identity: {cp.brand_identity}")
    print(f"brand_config:   {cp.brand_config}")
    print(f"output_dir:     {cp.output_dir}")
    print(f"monitoring_dir: {cp.monitoring_dir}")
    print(f"workspace_dir:  {cp.workspace_dir}")
    print(f"lut_dir:        {cp.lut_dir}")
    print(f"handle:         {cp.handle_instagram}")
