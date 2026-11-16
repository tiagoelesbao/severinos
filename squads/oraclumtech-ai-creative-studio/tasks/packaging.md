---
task_name: packaging
status: ready
responsible_executor: packaging-lead
execution_type: agent
tipo: estagio
stage_id: packaging
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-013
pipelines: [P5]
ausente_em: >
  P1, P2, P3, P4, P6 — embalagem como estágio próprio existe onde o CTR de
  miniatura é o gargalo. Filme de marca e UGC não competem no feed frio.
input: |
  - {job}/00-intake/pauta.md — a pauta e o ângulo
  - {job}/02-research/fontes.json — o TETO do que pode ser prometido
  - {canal_root}/channel-brief.yaml — avatar, tabus, duração-alvo
  - {canal_root}/thumb-system.yaml — grade, tipografia, cor, regra de rosto
  - {canal_root}/title-patterns.md — o que já foi usado (não repetir)
output: |
  - {job}/06-packaging/fato.json          o fato estruturado, entrada do motor
  - {job}/06-packaging/candidatos.md      todos os candidatos com nota e risco
  - {job}/06-packaging/titulo.md          o escolhido + thumb + PROMESSA
  - {job}/06-packaging/thumb-spec.yaml    especificação para o art-director
gate: checklists/gate-packaging.md
failure_modes: |
  - Prometer no título o que fontes.json não sustenta — o problema é o ângulo, não a fonte
  - Deixar um pilar depois do caractere 55: ele existe no Studio e não existe no feed
  - Thumb que repete o título — metade da vitrine jogada fora
  - Escolher entre variações do mesmo molde em vez de entre estruturas diferentes
  - Repetir um padrão que já está em title-patterns.md — canibaliza o próprio catálogo
  - Deixar passar B3 (fala atribuída sem confirmação) por achar que "é só um título"
acceptance_criteria: |
  - candidatos.md tem no mínimo 3 ESTRUTURAS distintas (não 3 rupturas do mesmo molde)
  - O título escolhido tem nota >= 70 em apps/regra-de-3/pilares.py
  - Os três pilares aparecem antes do caractere 55
  - Repetição da thumb sobre o título < 35%
  - Risco classificado como A, B1 ou B2 — nunca B3
  - titulo.md declara a PROMESSA em uma frase, e ela é rastreável a fontes.json
  - O padrão usado não está entre os 5 últimos de title-patterns.md
---

# packaging — Título, thumb e a promessa que o roteiro vai cumprir

Este estágio roda **antes do roteiro**. É a inversão que define o pipeline de canal
dark: a promessa vem primeiro, e o roteiro é escrito para cumpri-la.

## Comando

```text
@packaging-lead
*packaging {job-id}
*diagnostico "TÍTULO EXISTENTE" --thumb "TEXTO DA THUMB"
```

## Por que a embalagem vem antes

Título escrito depois do roteiro descreve o vídeo. Título escrito antes promete o
que o espectador leva — e descrição não compete com promessa num feed onde tudo
descreve.

A conta que sustenta isso: **70 a 75% da primeira avaliação do algoritmo é o
clique**. Retenção e ação somam o resto. Um roteiro excelente atrás de um título
que ninguém clica é um vídeo que não existe.

E a inversão muda o que o `@head-of-copy` recebe. Em vez de "resuma o assunto", ele
recebe **"entregue esta promessa nos primeiros 45 segundos"** — que é exatamente o
que os canais de plantão fazem ao responder o título aos sete segundos.

## Passos

### 1. Montar o fato

Extrair de `pauta.md` e `fontes.json` a estrutura que o motor consome:

```json
{
  "nicho": "futebol",
  "sujeito": "o STJD",
  "acao": "julgou o caso de apostas de Bruno Henrique",
  "acao_curta": "julga Bruno Henrique",
  "alvo": "o Flamengo",
  "alvo_reage": true,
  "consequencia": "o atacante pode pegar 2 anos de suspensão",
  "verificado": ["falas literais que existem em fontes.json"]
}
```

`verificado` é o que separa citação de invenção. Toda fala entre aspas que aparecer
num candidato é conferida contra essa lista — o que não casa vira risco B3 e é
descartado pelo próprio motor.

`alvo_reage: false` em nicho de utilidade, onde o alvo é o espectador e não alguém
que responde.

### 2. Gerar candidatos

```bash
python apps/regra-de-3/gerador.py --json {job}/06-packaging/fato.json --quantos 12
```

Qualquer candidato, venha de onde vier, é julgado pelo mesmo pontuador:

```bash
python apps/regra-de-3/gerador.py --diagnostico "CANDIDATO" --thumb "TEXTO"
```

### 2b. Fasear os copywriters — só quando o nicho pede

**A geração muda com o nicho; o julgamento nunca muda.**

Em nicho de **notícia** o gerador por molde basta: o fato já tem sujeito, ação e
consequência, que é a forma de uma manchete.

Em nicho de **utilidade** — estoicismo, saúde, produtividade — não há evento, e os
moldes produzem emendas mecânicas. Aí os copywriters dos squads Virals entram, e
entram **em fases**, porque pedir tudo de uma vez devolve frase bonita sobre nada:

| Fase | Agente | O que se pede | O que NÃO se pede |
|---|---|---|---|
| 1 · Ângulo | `@mrbeast-mk` | qual tensão faz alguém parar de rolar | redação |
| 2 · Headline | `@ladeira` | 3 a 5 frases curtas, por nível de consciência | conceito |
| 3 · Gancho | `@georgi` | a primeira frase do vídeo, cumprindo o título | título |
| 4 · Juízo | `apps/regra-de-3/pilares.py` | nota, corte, thumb, risco | — |

A ordem não é decorativa. O conceito precede a redação porque headline sem ângulo
é ornamento; o gancho vem por último porque ele existe para **cumprir** o título
que já foi escolhido — é o mesmo mecanismo dos canais de plantão, que respondem o
título nos primeiros segundos.

Peça sempre **candidatos curtos e comparáveis**, nunca um ensaio. E passe cada um
pelo pontuador antes de comparar: o que vem de agente entra na mesma régua do que
vem de molde, e é justamente isso que torna a régua útil.

### 3. Escolher por ESTRUTURA, não por interjeição

`candidatos.md` precisa oferecer estruturas diferentes:

| Estrutura | Exemplo |
|---|---|
| **A** afirma | `A CASA CAIU! STJD dá o veredito do caso apostas` |
| **B1** pergunta | `STJD julga Bruno Henrique mesmo?! Entenda o que muda` |
| **B2** insinua | `STJD julga e o Flamengo não passou batido` |

Doze variações de `BOMBA!` / `AGORA!` / `URGENTE!` na frente da mesma frase são uma
opção só. O motor já deduplica por molde por causa disso.

### 4. Especificar a thumb

A thumb diz **o que o título não disse**. `thumb-spec.yaml`:

```yaml
texto_principal: 'É VERDADE?'        # 2 a 5 palavras, nunca mais
texto_secundario: '2 ANOS FORA'      # opcional, canto oposto
elemento_visual: 'escudo do clube + martelo de tribunal'
emocao: 'tensão'
sistema: '{canal_root}/thumb-system.yaml'   # grade, cor e tipografia do canal
```

O `@art-director` executa dentro do sistema do canal. Thumb fora do sistema quebra
o reconhecimento que o canal acumulou — e reconhecimento é o único ativo que se
constrói com o tempo.

### 5. Declarar a promessa

`titulo.md` fecha com a linha que vira contrato:

```markdown
## Promessa
Em 45 segundos o espectador sabe qual foi o veredito do STJD e o que muda para o
Flamengo nas próximas rodadas.

## Âncora
fontes.json → id 3 (súmula do julgamento), id 5 (tabela de jogos)
```

O `@head-of-copy` escreve para cumprir essa frase. O `@fact-checker` confere, no
fim, se ela foi cumprida. Sem essa linha o estágio não passa no gate.

### 6. Registrar

Depois do gate, `*registrar {job-id}` grava o padrão usado em `title-patterns.md`.
Repetir padrão entre episódios próximos canibaliza o próprio catálogo: os dois
vídeos disputam a mesma impressão.

## O que este estágio NÃO faz

- **Não apura.** O teto da promessa é `fontes.json`. Se a promessa mais forte não
  cabe no que foi apurado, o ângulo volta para `research` — não se suaviza a fonte.
- **Não gera imagem.** Entrega especificação; a arte é do `art-director` e a
  geração é humana (Regra de Ouro §3.1).
- **Não escreve roteiro.** Entrega a promessa que o roteiro terá de cumprir.
