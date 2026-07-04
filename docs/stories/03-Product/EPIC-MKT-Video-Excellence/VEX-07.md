# VEX-07: Design system do Studio — de protótipo a produto profissional

**Status:** InProgress — inc.1 (fundação+Storybook) e inc.2 (splitters 3-eixos + bin com abas + tokenização do inspector + AC1 nos controles) entregues; falta inc.3 (tokens da timeline + piso de fonte ≥11px, a calibrar no dev)
**Epic:** EPIC-MKT-Video-Excellence (F3 — Paridade NLE + estética)
**Prioridade:** **P2** — base estética/estrutural de todas as stories de UI seguintes
**Complexidade:** L (Standard — 12 pontos)
**Criada por:** Claude (auditoria) · 2026-07-02

## Story
**Como** dono do produto oferecendo o Studio a um pool de clientes
**Eu quero** uma UI moderna, impactante e consistente — design system com tokens, componentes de qualidade, layout profissional redimensionável e microinterações
**Para que** o app transmita o nível do produto (referência: CapCut desktop / Premiere) em vez de parecer protótipo interno.

## Contexto (evidência da auditoria — `studio/page.tsx`, `components/Timeline.tsx`)
- **Tudo em inline styles ad-hoc** (objetos `box`/`btn` repetidos); zero tokens; cores mágicas (#0a0a12, #1a1a24...).
- Tipografia 9–11px em quase toda a UI (fadiga em uso prolongado); emoji como ícones (🗑 ✂ 💾 ♪ ▦).
- `alert()`/`confirm()` nativos; sem toasts; tooltips só via `title`.
- Layout fixo `230px / 1fr / 320px` sem splitters; timeline de altura fixa; sem estados hover/focus consistentes; sem context menu.
- Não há Tailwind/biblioteca de componentes no app (CSS global mínimo).

## Decisão de arquitetura (proposta)
- **Stack:** Tailwind CSS v4 + shadcn/ui (Radix primitives) + lucide-react (ícones) + sonner (toasts). Fonte de UI: Inter/Geist (a fonte de RENDER do vídeo permanece a do brand — não confundir).
- **Tokens:** escala de superfícies frias (zinc/slate custom), espaçamento, raios, tipografia (UI base 13–14px; labels 11–12px), z-index map. **Accent dinâmico por cliente** via CSS var alimentada pelo `brand-config.yaml` (o editor "veste" a marca do cliente ativo — identidade e diferencial).
- **Layout de referência (CapCut desktop):**
  - Esquerda: bin com abas (Criativos / Mídia / Áudio / Texto) — substitui a pilha atual.
  - Centro: preview com transport integrado no rodapé do palco.
  - Direita: inspector contextual (só mostra o painel do que está selecionado).
  - Baixo: timeline com altura redimensionável (drag no divisor).
  - Splitters arrastáveis nos 3 eixos (persistidos em localStorage).
- **Componentes novos:** Button/IconButton, Select, Slider, Dialog (substitui confirm), Tooltip real, Tabs, ContextMenu, Toast, Badge de status. Migração incremental: página → componentes; timeline mantém render custom (canvas de clipes) mas adota tokens.
- **Microinterações:** hover/active/focus visíveis, transições 120–160ms, skeleton no load, focus rings acessíveis (a11y básica: navegação por teclado nos menus, aria-labels nos icon buttons).

## Tarefas (Checklist)
- [x] Setup Tailwind v4 (@tailwindcss/postcss) + Radix (Dialog/Tooltip) + lucide + sonner + react-resizable-panels — build Next e composições Remotion intactos (estilos de render seguem inline).
- [x] **Storybook 10 (decisão do dono, 2026-07-04):** `npm run storybook` — documentação VIVA do design system: story de Tokens (superfícies, semânticas, tipografia, controles) com **switcher de accent por cliente** + story do kit de componentes (estados/variantes). `build-storybook` validado.
- [x] Tokens em `globals.css` (@theme): superfícies frias, fg em 3 níveis, semânticas, raios/sombras, fonte de UI 13px; `--accent` dinâmico (ranges/checkboxes nativos herdam via accent-color).
- [x] Accent por cliente em runtime: o Studio seta `--accent` do `fxPlan.brand.accent` ao carregar — o editor "veste" a marca.
- [x] Kit de componentes (`src/components/ui.tsx`): Button (5 variantes), IconButton, Section, Badge, Tip (Radix), ConfirmDialog (Radix) — com focus rings e estados.
- [x] `alert()`/`confirm()` ELIMINADOS: remover criativo, resetar edição e guard do auto-cut agora usam ConfirmDialog; sucesso/erro de export/remoção/reset viram toasts (sonner) com Toaster global no layout.
- [x] Transport bar redesenhada: ícones lucide + tooltips com atalhos + dot de não-salvo no Salvar + export com progresso.
- [x] Shell com splitters redimensionáveis persistidos (react-resizable-panels **v4** — `Group`/`Panel`/`Separator`; 3 eixos; layout persistido em localStorage via `defaultLayout`/`onLayoutChanged`).
- [x] Migrar sidebar esquerda para bin com abas (Criativos/Mídia/Áudio) + empty states desenhados.
- [x] Tokenizar blocos internos do inspector: `box`/`btn` puxam das CSS vars (@theme) — ~40 usos migrados de uma vez; superfícies do preview/inspector via `--color-surface-*`.
- [x] AC1 nos controles: emoji-como-ícone eliminados no inspector/bin (🗑→Trash2, ▶→Play, ✂→Scissors, ＋→Plus) + aria-labels nos icon buttons do transporte.
- [ ] Timeline: adotar tokens nas réguas/playhead (cores de papel já centralizadas em roleColor) — pendente.
- [ ] Piso de fonte global ≥ 11px (labels em 9–10px no inspector) — **calibrar no `npm run dev` antes do passe** (pedido do dono).

## Critérios de Aceite
- [ ] **AC1:** Zero `alert()`/`confirm()` nativos; zero emoji-como-ícone nos controles; nenhum texto de UI < 11px.
- [ ] **AC2:** Trocar de cliente muda o accent de TODA a UI (tokens), sem reload.
- [ ] **AC3:** Splitters funcionam nos 3 eixos e persistem entre sessões.
- [ ] **AC4:** Todos os fluxos existentes (editar, salvar, auto-cut, camadas, legendas, export) funcionam idênticos após a migração — sem regressão funcional (checklist manual + testes existentes verdes).
- [ ] **AC5:** Build Next + render headless Remotion continuam limpos (estilos de UI não vazam para as composições).

## Escopo
**IN:** design system, layout shell, migração dos painéis/controles, microinterações, a11y básica.
**OUT:** thumbnails/filmstrip e track headers (VEX-08); command palette (VEX-10); página inicial `/` (pode receber um passe leve, mas não é o foco).

## Dependências
- Nenhuma técnica; recomendado APÓS o F1 (não bloquear os P0 com refactor visual). **Habilita:** VEX-08, VEX-09, VEX-10.

## Riscos
- **[Médio] Regressão funcional na migração:** mitigar migrando painel a painel com o app utilizável em cada commit (não big-bang).
- **[Baixo] Conflito Tailwind × Remotion bundling:** estilos de UI ficam fora de `src/remotion/` (as composições continuam com estilos inline próprios — correto para render).

## Dev Agent Record

### Agent Model Used
claude-fable-5 (Claude no papel @dev)

### Decisões
- **Storybook 10 + react-vite** (pedido do dono) em vez de páginas de doc estáticas: o Vite do Storybook lê o MESMO `postcss.config.mjs` (Tailwind v4) do app — tokens e componentes renderizam idênticos ao produto. A story de Tokens tem o switcher de accent que reproduz o mecanismo runtime do Studio.
- **Componentes hand-rolled sobre Radix** (Dialog/Tooltip) em vez do CLI do shadcn: mesmo padrão, menos boilerplate, controle total dos tokens.
- **Fonte de render ≠ fonte de UI**: as composições Remotion seguem com estilos inline próprios (correto para render headless); o design system cobre só a UI do app.

### File List (incremento 1 — fundação)
- `postcss.config.mjs`, `src/app/globals.css` (novos — Tailwind v4 + @theme tokens)
- `src/app/layout.tsx` (globals + Toaster sonner)
- `src/components/ui.tsx` (novo — kit: Button/IconButton/Section/Badge/Tip/ConfirmDialog)
- `.storybook/main.ts`, `.storybook/preview.ts` (novos) + `src/components/Tokens.stories.tsx`, `UiKit.stories.tsx` (novos)
- `src/app/studio/page.tsx` (accent por cliente; transport com lucide+Tip; confirm()→ConfirmDialog ×3; toasts de export/remoção/reset)
- `package.json` (scripts storybook/build-storybook; deps), `.gitignore` (storybook-static)

### File List (incremento 2 — shell + tokenização)
- `src/app/studio/page.tsx` (shell `Group`/`Panel`/`Separator` v4 nos 3 eixos + persistência localStorage; `loadLayout`/`saveLayout`; bin com abas Criativos/Mídia/Áudio + empty states; `box`/`btn` via CSS vars; preview/inspector em `--color-surface-*`; emoji-controle→lucide; aria-labels)

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
- 2026-07-04 — Claude (@po) — Validada (GO 9/10) + **aditivo do dono: Storybook para tokenizar/documentar o design system**. Draft → Ready.
- 2026-07-04 — Claude (@dev) — Incremento 1 (fundação): tokens+accent dinâmico+kit+Storybook+transport+dialogs/toasts. Build Next, Storybook build, 102/102 testes e typecheck limpos. Ready → InProgress (splitters/abas/inspector/empty-states pendentes).
- 2026-07-04 — Claude (@dev) — Incremento 2 (shell + tokenização): splitters redimensionáveis nos 3 eixos com persistência em localStorage (**react-resizable-panels v4** — a API antiga `PanelGroup`/`PanelResizeHandle`/`autoSaveId` não existe mais; migrado para `Group`/`Panel`/`Separator` + persistência manual). Bin com abas + empty states. `box`/`btn` do inspector tokenizados via CSS vars. Emoji-como-controle eliminados no inspector/bin + aria-labels no transporte. Typecheck, `next build` (/studio OK) e 102/102 testes limpos. **Pendente (inc. 3):** tokens da timeline + piso de fonte ≥11px (a calibrar no dev).
- 2026-07-04 — Claude (@dev) — **Fix runtime (tela preta):** o parser de tamanho da v4 trata `number` como **px** (`case "number": return [e,"px"]`), então `defaultSize={17}` virava 17px e colapsava os painéis; além disso o `onLayoutChanged` disparava na montagem e persistia o layout quebrado. Corrigido: todos os tamanhos como **porcentagem** (`"17%"`…), `preview` com `defaultSize` explícito, persistência só em `meta.isUserInteraction`, e chave do localStorage bumpada para `v2` (ignora o layout px salvo). Dev server compila e serve `/studio` 200.
- 2026-07-04 — Claude (@dev) — **Fix runtime 2 (altura 0):** larguras corrigidas mas painéis com `height:0` — a classe `h-screen` perdia para o stylesheet que a v4 injeta via `adoptedStyleSheets` (constructable sheets ganham de classes de autor). Altura forçada por **inline style** (máxima prioridade): grupo vertical `100vh`, horizontal `100%`. **Verificado via Playwright headless:** painéis top 1600×592 / bin 271 / preview 940 / inspector 383 / timeline 1600×305; conteúdo, accent do cliente (âmbar/Tiago) e controles renderizam corretos.
