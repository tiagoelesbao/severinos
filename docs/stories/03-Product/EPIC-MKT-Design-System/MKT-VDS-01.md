# MKT-VDS-01: Setup do Storybook & Design Tokens

## Story
**Como** Diretor de Arte
**Eu quero** ter um ambiente de Storybook configurado com os tokens da marca Virals
**Para que** possamos construir componentes visuais consistentes e reutilizáveis para todas as nossas mídias.

## Contexto
Atualmente a marca está dispersa em arquivos YAML e scripts Python. Precisamos centralizar isso em um Design System profissional usando React e Tailwind, documentado via Storybook no repositório `apps/dashboard`.

## Tarefas (Checklist)
- [x] Criar aplicação dedicada `apps/creative-design` para o Design System.
- [x] Instalar `@storybook/nextjs` e dependências relacionadas em `apps/creative-design`.
- [x] Configurar o Storybook para suportar Tailwind CSS v4.
- [x] Definir tokens de design (cores, tipografia, espaçamento) no `globals.css` via CSS variables e Tailwind theme.
- [x] Criar componentes atômicos básicos: `BrandingLogo`, `BrandTypography`, `AccentElement`.
- [x] Validar o funcionamento do Storybook localmente (Rodar `npm run storybook`). (Storybook rodando em http://localhost:6006).

## Dev Agent Record
### Debug Log
- [2026-05-12] Inicialização do app `creative-design` e setup do Storybook.
- [2026-05-12] Configuração de tokens de marca Virals baseados no brand-config original.
- [2026-05-12] Implementação dos primeiros 3 átomos React com Stories documentados.
- [2026-05-12] Storybook validado com sucesso (Local: http://localhost:6006).

## Critérios de Aceite
- [x] Storybook inicializa sem erros em `apps/creative-design`.
- [x] Design Tokens (paleta Virals) disponíveis como variáveis CSS ou Tailwind classes.
- [x] Pelo menos 3 componentes atômicos documentados no Storybook com suporte a variantes.

## Referências
- `squads/virals-marketing-squad/data/casey-brand-config.yaml`
- `apps/dashboard/package.json`
