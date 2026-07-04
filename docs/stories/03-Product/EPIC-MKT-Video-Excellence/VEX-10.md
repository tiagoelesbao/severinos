# VEX-10: Preview pro — safe-zones de plataforma, grade, medidores de áudio e command palette

**Status:** Draft
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
- [ ] `lib/safeZones.ts` (IG/TikTok/genérico) + overlay com toggle e seletor de plataforma.
- [ ] Grade de terços/centro + snap de handles às guias.
- [ ] VU meter no transporte (nível + peak + clipping) durante o playback.
- [ ] Registro central de comandos + palette Ctrl+K + popover de atalhos alimentado pelo mesmo registro.
- [ ] Zoom/pan do palco.
- [ ] Aviso de composição: legenda/texto dentro de zona coberta → warning na auditoria E1 (usa as mesmas zonas).

## Critérios de Aceite
- [ ] **AC1:** Toggle "Safe-zone: Instagram" desenha as áreas cobertas; as legendas default ficam FORA delas (e o número mágico 430 passa a derivar de `safeZones`).
- [ ] **AC2:** VU mostra atividade durante o play e acende clipping quando SFX a volume 1.0 estoura (caso de teste real).
- [ ] **AC3:** Ctrl+K → digitar "export" aciona o export (VEX-01); toda ação do registro é acionável pela palette.
- [ ] **AC4:** Elemento de texto posicionado dentro da zona do botão de like gera warning E1 com sugestão de reposicionamento.
- [ ] **AC5:** Overlays/grade nunca aparecem no mp4 exportado.

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
