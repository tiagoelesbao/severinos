# Setup: Meta Ads Library API

> **Status:** Não configurado. Usando Playwright scraping (v1 — recomendado).
> **Decisão pendente:** API oficial vs manter scraping.

## Recomendação: Manter Scraping

A Meta Ads Library é de acesso público. O scraping via Playwright é mais flexível e não requer credenciais. Migrar para API apenas se:
- Rate limiting se tornar problema
- Volume de queries exceder 100/dia
- Precisar de dados estruturados mais ricos

## Se Optar por API

1. Acessar [developers.facebook.com](https://developers.facebook.com/)
2. Criar app tipo "Business"
3. Solicitar acesso à Ads Library API
4. Obter credenciais:
   - `META_ADS_APP_ID`
   - `META_ADS_APP_SECRET`
   - `META_ADS_ACCESS_TOKEN`
5. Salvar no `.env`:
   ```
   META_ADS_APP_ID=xxx
   META_ADS_APP_SECRET=xxx
   META_ADS_ACCESS_TOKEN=xxx
   ```
6. Endpoint: `graph.facebook.com/ads_archive`
7. Limitações: filtros mais restritivos que scraping, rate limits

## Referência

- [Meta Ad Library](https://www.facebook.com/ads/library/)
- [Meta Ad Library API Docs](https://developers.facebook.com/docs/marketing-api/reference/ad-library/)
