# Setup: TikTok Creator Marketplace API

> **Status:** Não configurado. Usando Playwright scraping (v1).
> **Quando configurar:** Quando o volume de hunting justificar API oficial.

## Passos

1. Acessar [developers.tiktok.com](https://developers.tiktok.com/)
2. Criar conta de desenvolvedor (se não tiver)
3. Criar nova app: tipo "Business", categoria "Creator Marketing"
4. Solicitar acesso à Creator Marketplace API
5. Aguardar aprovação (pode levar dias)
6. Após aprovação, obter credenciais:
   - `TIKTOK_APP_KEY`
   - `TIKTOK_APP_SECRET`
   - `TIKTOK_ACCESS_TOKEN`
7. Salvar no `.env` na raiz do projeto:
   ```
   TIKTOK_APP_KEY=xxx
   TIKTOK_APP_SECRET=xxx
   TIKTOK_ACCESS_TOKEN=xxx
   ```
8. Atualizar `config/clickup-ids.yaml` → `intelligence_layer.tiktok.api_ready: true`
9. Atualizar `scripts/tiktok-creator-search.js` para usar API quando credenciais disponíveis

## Endpoints-chave

| Endpoint | Propósito |
|:---------|:----------|
| Creator Search | Buscar por categoria, followers, engagement, keywords |
| Creator Analytics | Audience demographics, performance history, growth |
| Collaboration | Gestão de parcerias e tracking |

## Referência

- [TikTok for Business API Docs](https://developers.tiktok.com/)
- [TikTok Shop Partner API](https://partner.tiktokshop.com/)
