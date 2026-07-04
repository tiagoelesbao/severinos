# VEX-07: Design system do Studio — de protótipo a produto profissional

**Status:** Draft
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
- [ ] Setup Tailwind v4 + shadcn/ui + lucide + sonner no app (sem quebrar o build Remotion — escopo de estilos fora das composições de render).
- [ ] Arquivo de tokens (CSS vars) + accent por cliente via brand-config.
- [ ] Shell do layout: 3 colunas + timeline com splitters redimensionáveis persistidos.
- [ ] Migrar sidebar esquerda para bin com abas (Criativos/Mídia/Áudio/Texto) com ícones lucide.
- [ ] Migrar inspector para painéis contextuais shadcn (clip / elemento / legendas / áudio).
- [ ] Substituir todos os `alert/confirm` por Dialog + toasts sonner; status do header (Salvando/Salvo/Erro) via toast + badge.
- [ ] Transport bar redesenhada (ícones, tooltips com atalhos, indicador não-salvo da VEX-03).
- [ ] Timeline: adotar tokens (cores de papel/track, réguas, playhead) sem mudar a mecânica.
- [ ] Empty states desenhados (sem criativos / sem materiais / preparação em andamento).
- [ ] Passe de acessibilidade básico (focus, aria, contraste AA nos textos de UI).

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

## Change Log
- 2026-07-02 — Claude — Story criada a partir da auditoria (Draft).
