#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pexels_service.py — Provider de imagens reais via Pexels API.

Busca vários resultados, CURA o melhor por contexto (texto `alt` x query) e
baixa na orientação correta do placeholder. Usado pelo orchestrate_carousel
no modo --image-mode=pexels.

Chave: PEXELS_API_KEY no .env.
"""

import os
import re
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"
RESULTS_PER_SEARCH = 15  # busca larga para permitir curadoria
_STOPWORDS = {"the", "a", "of", "and", "for", "with", "in", "on", "to"}


def _pick_best(photos, query):
    """Cura o melhor resultado: maior match entre o `alt` da foto e a query.

    Empate → mantém a ordem de relevância do Pexels.
    """
    terms = {
        t for t in re.findall(r"[a-zA-ZÀ-ÿ]{3,}", query.lower())
        if t not in _STOPWORDS
    }
    if not terms:
        return photos[0]

    def score(idx_photo):
        idx, photo = idx_photo
        alt = (photo.get("alt") or "").lower()
        matches = sum(1 for t in terms if t in alt)
        return (-matches, idx)  # mais matches primeiro; empate → menor índice

    return min(enumerate(photos), key=score)[1]


def search_and_download(query, dest_dir, filename_stem, orientation="landscape"):
    """Busca na Pexels, cura o melhor resultado e baixa para dest_dir.

    `orientation`: 'landscape' | 'portrait' | 'square' — casa com o placeholder.
    Retorna o caminho local .jpg, ou None se nada for encontrado.
    Lança RuntimeError se a PEXELS_API_KEY estiver ausente.
    """
    key = os.getenv("PEXELS_API_KEY", "").strip()
    if not key:
        raise RuntimeError("PEXELS_API_KEY ausente no .env.")

    query = (query or "").strip() or "abstract background"

    resp = requests.get(
        PEXELS_SEARCH_URL,
        headers={"Authorization": key},
        params={"query": query, "per_page": RESULTS_PER_SEARCH,
                "orientation": orientation},
        timeout=30,
    )
    resp.raise_for_status()
    photos = resp.json().get("photos", [])
    if not photos:
        return None

    best = _pick_best(photos, query)
    src = best.get("src", {})
    img_url = src.get("large2x") or src.get("large") or src.get("original")
    if not img_url:
        return None

    img = requests.get(img_url, timeout=45)
    img.raise_for_status()

    os.makedirs(dest_dir, exist_ok=True)
    path = os.path.join(dest_dir, f"{filename_stem}.jpg")
    with open(path, "wb") as f:
        f.write(img.content)
    return path


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "marketing creative"
    orient = sys.argv[2] if len(sys.argv) > 2 else "landscape"
    result = search_and_download(q, "outputs/pexels-test", "test", orient)
    print(f"Baixado: {result}" if result else f"Nada encontrado para '{q}'.")
