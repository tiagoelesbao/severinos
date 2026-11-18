---
name: sorteamos-sessao-unica
description: A API da Sorteamos/Império tem sessão única — login novo derruba a sessão do founder; e a flag is_paused() NÃO significa "API proibida"
metadata:
  type: reference
---

A plataforma do Império Prêmios (`api.rapidinhas24hr.com`) tem **sessão única**: autenticar de
novo invalida a sessão aberta. É por isso que cinco jobs agendados relogando em paralelo tiraram
o founder do painel no meio do trabalho (2026-10-24).

**Regra prática:** antes de qualquer chamada autenticada, confirmar que o founder **não** está
com o painel aberto. Não é a flag que decide isso.

## A armadilha de interpretação

`client_api.is_paused()` (lê `bi_paused.json` no Supabase Storage) significa **"os nossos 5 jobs
agendados estão parados"** — tipicamente porque o founder desligou a automação para usar o painel
em paz. **Não** significa que a API está proibida.

Essa semântica já veio **invertida num briefing** em 2026-11-16 ("verifique a flag antes de
qualquer chamada autenticada e respeite-a"), e eu parei o trabalho pela razão errada. O
coordenador corrigiu. A conclusão (não chamar) acabou certa; o motivo era outro.

**Why:** confundir as duas coisas leva a dois erros opostos — paralisar sem necessidade quando a
flag está ativa, ou chamar com a flag desligada enquanto o founder está logado.

**How to apply:** flag ativa diz apenas que a automação está parada. O que decide é a sessão do
founder. Caminho seguro para observar ao vivo: navegação no Chrome **já autenticado** dele, sem
login novo — e leituras públicas sem sessão (loja, `/campanha/{slug}`, nosso bucket público) nunca
foram risco.
