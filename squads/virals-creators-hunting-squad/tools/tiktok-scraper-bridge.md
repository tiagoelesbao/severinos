# Tool: TikTok Scraper Bridge

**Type:** Playwright Scraper
**Script:** `scripts/tiktok-creator-search.js`
**Agents:** @hunter-scout (Mae)
**Status:** v1 (Playwright) — API ready for future migration

## Description

Descoberta de creators via TikTok usando Playwright scraping. Navega pages de hashtags, extrai creator handles e métricas de vídeos.

## Usage

```bash
node scripts/tiktok-creator-search.js --hashtag "#gymtok" --max-results 20
node scripts/tiktok-creator-search.js --niche fitness
```

## Future: TikTok Creator Marketplace API

Quando configurado, migrar para API oficial. Setup guide: `docs/setup-tiktok-api.md`

Endpoints: Creator Search, Creator Analytics, Collaboration Management.
