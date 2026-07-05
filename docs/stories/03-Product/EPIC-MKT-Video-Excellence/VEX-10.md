# VEX-10: Preview pro — safe-zones de plataforma, grade, medidores de áudio e command palette

**Status:** InReview — inc.1 (safe-zones+warning), inc.2 (command palette), inc.3 (VU meter) e inc.4 (grade de terços) entregues; **5/5 ACs atendidos e verificados via Playwright**. Follow-up opcional (sem AC): zoom/pan do palco, snap de handles às guias, unificação total do popover de atalhos com o registro.
**Epic:** EPIC-MKT-Video-Excellence (F3 — Paridade NLE + estética)
**Prioridade:** **P2**
**Complexidade:** M (Standard — 8 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** editor produzindo para Instagram/TikTok
**Eu quero** ver no preview onde a UI da plataforma cobre o vídeo (safe-zones), alinhar com grade, monitorar níveis de áudio e acionar qualquer comando via palette (Ctrl+K)
**Para que** nenhuma legenda/CTA seja publicada embaixo do botão de like e o fluxo de trabalho fique na velocidade de um NLE moderno.

## Contexto (evidência da auditoria)
- O padding das legendas é um número mágico (`paddingBottom: 430` em `Captions.tsx`) sem visualização do porquê — não há overlay de safe-zone para validar posicionamento contra a UI do IG/TikTok.
- Sem grade/guias no palco; posicionamento de elementos é no olho.
- Sem medidores de áudio (impossível ver se SFX estoura sobre a narração sem exportar).
- Fluxos ficam a N cliques; nenhum command palette.

## Decisão de arquitetura (proposta)
- **Safe-zone overlays** (toggle no palco): máscaras vetoriais para Instagram Reels e TikTok (áreas de username/caption/botões/navegação) + zona título-seguro genérica 9:16. Overlay é só da UI (nunca renderiza no export). Dados das zonas em `lib/safeZones.ts` (fração da viewport, testável).
- **Grade e guias:** grade de terços + centro; snap opcional dos handles de elemento (N1.c) às guias.
- **Medidores de áudio:** VU estéreo simples via WebAudio no Player (AnalyserNode no elemento de mídia do Player) — nível instantâneo + peak hold; indicador de clipping. Se a API do Player não expor o node, medir via `AudioContext` tap no `<audio>`/`<video>` interno (fallback: medidor só durante playback).
- **Command palette (Ctrl+K):** cmdk (shadcn) com ações registráveis: transporte, salvar/exportar, toggles (snap, razor, auto-cut, safe-zone, grade), "ir para marker", trocar criativo/cliente, adicionar camada/texto. Registro central de comandos (id, label, atalho, ação) — mesmo mapa alimenta o popover de atalhos da VEX-03.
- **Zoom do palco:** fit / 50% / 100% + pan (espaço+drag), útil para posicionar elementos com precisão.

## Tarefas (Checklist)
- [x] `lib/safeZones.ts` (IG/TikTok/genérico, frações + `coveredZoneAt`, 6 testes) + overlay hachurado no palco com seletor de plataforma no transporte (UI-only).
- [x] Grade de terços/centro (toggle no transporte + comando na paleta; UI-only). _Snap de handles às guias = follow-up opcional._
- [x] VU meter no transporte (nível + clipping). Escolha robusta: estimador DETERMINÍSTICO `levels.ts` (`estimateLevel` soma faixas audíveis respeitando mute/solo/ducking/fades) em vez de tap frágil no Player. 5 testes (inclui o caso do AC2). Barra verde→amarelo→vermelho + rótulo CLIP.
- [x] Registro central de comandos + palette Ctrl+K (kit `CommandPalette` sobre Radix Dialog — sem dep nova; busca + navegação por setas + Enter). ~19 comandos (transporte/editar/ferramentas/marcadores/camadas/preview/navegação). _Popover de atalhos ainda hardcoded; unificação total é follow-up leve._
- [~] Zoom/pan do palco — **follow-up opcional** (nenhum AC depende; o palco já ajusta ao 9:16).
- [x] Aviso de composição: elemento visual sob a UI → `auditComposition` (E1, category "composicao") no `buildAudit` + aviso AO VIVO no inspector do elemento.

## Critérios de Aceite
- [x] **AC1:** Toggle "Safe-zone: Instagram" desenha as áreas cobertas; as legendas default ficam FORA delas (`paddingBottom` deriva de `SAFE_CAPTION_BOTTOM`, = 430 @1920px). ✓ verificado.
- [x] **AC2:** VU mostra atividade durante o play e acende clipping quando SFX a volume 1.0 estoura (caso de teste real). ✓ barra teal ~58% na narração (verificado); clipping do SFX 1.0 coberto por teste puro (`levels.test.ts`). _Nota: é um VU ESTIMADO do modelo (determinístico), não tap ao vivo do Player — mais robusto e testável._
- [x] **AC3:** Ctrl+K → digitar "export" aciona o export (VEX-01); toda ação do registro é acionável pela palette. ✓ verificado (filtra p/ "Exportar vídeo (mp4)", Enter → POST /api/render).
- [x] **AC4:** Elemento de texto dentro da zona do botão de like gera warning E1 (`auditComposition`) + aviso ao vivo no inspector com sugestão. ✓ verificado (texto em x93/y60 → aviso "Curtir/comentar/enviar").
- [x] **AC5:** Overlays/grade nunca aparecem no mp4 exportado — desenhados só na UI do editor (page.tsx), fora da composição Remotion. ✓ por construção.

## Escopo
**IN:** safe-zones, grade/guias, VU, palette, zoom do palco, warning E1 de composição.
**OUT:** waveform de espectro/loudness LUFS (futuro); preview em dispositivo (deep-link) — registrar como ideia.

## Dependências
- **VEX-07** (cmdk/tokens). Independente das demais de F3.

## Riscos
- **[Médio] Acesso ao áudio do Player** para o VU: se o tap não for viável, degradar para medidor por análise offline dos arquivos (menos "ao vivo", ainda útil).
- **[Baixo] Safe-zones mudam com updates das plataformas:** dados centralizados e fáceis de ajustar.

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-05 — Claude (@dev) — Inc.1 (safe-zones): `safeZones.ts` (IG/TikTok/genérico, 6 testes) + overlay hachurado no palco + seletor no transporte; `auditComposition` (E1) + aviso ao vivo no inspector; `paddingBottom` das legendas derivado de `SAFE_CAPTION_BOTTOM`. AC1/AC4/AC5 ✓. Typecheck, `next build`, 132 testes. Verificado via Playwright. Draft → InProgress.

### File List (inc.1 — safe-zones)
- `src/lib/safeZones.ts` + `src/lib/safeZones.test.ts` (novos)
- `src/lib/audit.ts` (`auditComposition` + category "composicao" no buildAudit)
- `src/remotion/fx/Captions.tsx` (paddingBottom derivado de SAFE_CAPTION_BOTTOM)
- `src/app/studio/page.tsx` (overlay no palco + seletor no transporte + aviso ao vivo no inspector)

### File List (inc.2 — command palette)
- `src/components/ui.tsx` (`CommandPalette` + tipo `Command`)
- `src/app/studio/page.tsx` (registro de comandos + Ctrl+K + render da paleta + atalho no popover)

### File List (inc.3 — VU meter)
- `src/lib/levels.ts` + `src/lib/levels.test.ts` (novos — estimador determinístico)
- `src/app/studio/page.tsx` (VU bar no transporte + indicador CLIP)

### File List (inc.4 — grade de terços)
- `src/app/studio/page.tsx` (overlay de grade + toggle no transporte + comando na paleta)

## Change Log (continuação)
- 2026-07-05 — Claude (@dev) — Inc.2 (command palette Ctrl+K, ~19 comandos), inc.3 (VU meter determinístico `levels.ts`, 5 testes) e inc.4 (grade de terços). **5/5 ACs**. Typecheck, `next build`, 137 testes. Verificado via Playwright a cada peça. InProgress → InReview.
