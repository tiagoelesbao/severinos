# Regras ESLint customizadas

Importado de <https://github.com/soumatheusgomes/vibe-coding-toolkit> (`templates/eslint/`) ·
MIT © 2026 Matheus Gomes.

## O que tem aqui

| Arquivo | O que faz |
|---|---|
| `core-rules.cjs` | As regras customizadas. A principal é `max-lines`: teto de linhas por arquivo com mensagem que **ensina onde cortar** (lógica → serviço de domínio, UI repetida → subcomponente, acesso a dados → repositório, helpers → módulo utilitário). Também cobre `console` banido e vazamento de binding de servidor para o cliente. |
| `utils.cjs` | Helpers compartilhados (detecção de arquivo de teste, baseline de ignore). |
| `index.cjs` | Plugin que expõe as regras sob o namespace `quality/`. |
| `next-base.mjs` | Base de configuração para apps Next.js. |
| `verify.mjs` | Verifica que a instalação das regras está de pé. |
| `examples/` | Configs de exemplo: flat config simples, versão com type-checking, e as variantes Next.js. |

## Por que a regra de tamanho importa aqui

Agentes aceleram a entropia: o arquivo de 800 linhas aparece em uma sessão e nunca mais é lido
inteiro por ninguém. O teto é o único gate que torna isso visível antes de virar dívida. A
mensagem da regra existe para o agente não cortar no número de linhas e produzir dois arquivos
que só fazem sentido lidos juntos.

## Adoção — deliberadamente manual

**Nada foi ligado automaticamente.** Os apps `apps/dashboard` e `apps/creative-design` já têm
`eslint.config.mjs` próprio, e ligar um teto de linhas em código existente gera uma enxurrada de
erro que trava o build sem ninguém ter decidido isso.

Para adotar em um app:

1. Leia `examples/eslint.config.mjs.example` (ou a variante Next/typed que corresponde ao app).
2. Instale o plugin apontando para este diretório.
3. Suba o teto **em `warn`** primeiro, meça, e só então promova para `error`.
4. Para derrubar os arquivos que estouraram, use
   `docs/guides/vibe-coding-toolkit/prompts/09-file-size-refactor.md` — um arquivo por commit,
   com teste e typecheck entre cada um.

O caminho completo (instalar + medir) está em
`docs/guides/vibe-coding-toolkit/prompts/08-eslint-quality-gates-install.md`.
