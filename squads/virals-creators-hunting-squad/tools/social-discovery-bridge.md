# Tool: Social Discovery Bridge

**Type:** Script Bridge
**Script:** `../../services/ETL/Extract/scrapers/social-discovery.js`
**Agents:** @hunter-scout (Mae)

## Description

Bridge para o Social Discovery Engine v3 do ETL. Navega TikTok, Instagram, YouTube e LinkedIn via Playwright com stealth cookies e extrai métricas de engagement.

## Usage

```javascript
const SocialDiscovery = require('../../services/ETL/Extract/scrapers/social-discovery.js');
const discovery = new SocialDiscovery();

// TikTok discovery
const results = await discovery.discoverTikTok('#gymtok', { maxResults: 20 });

// Instagram discovery  
const results = await discovery.discoverInstagram('#fitness', { maxResults: 20 });

// Calculate viral score
const score = discovery.calculateScore({ views: 50000, likes: 5000, comments: 200 });
```

## Key Methods

| Method | Purpose |
|:-------|:--------|
| `discoverTikTok(hashtag, options)` | Mine TikTok by hashtag |
| `discoverInstagram(hashtag, options)` | Mine Instagram by hashtag |
| `calculateScore(metrics)` | Viral Score = Views×0.1 + Likes×1 + Comments×5 |

## Integration Point

Used by `scripts/hunt-creators.js` as the underlying scraping engine.
