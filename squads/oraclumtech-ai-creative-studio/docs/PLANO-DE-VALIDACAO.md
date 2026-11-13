# Plano de validação — do squad instalado ao squad provado

> Registro dos testes ponta a ponta que faltam para o squad sair de **capacidade
> instalada** e virar **capacidade provada**.
> Autor: @aiox-master (Orion) · Criado em 2026-08-28
>
> **Por que este arquivo existe:** o squad tem 94 arquivos, 17 agentes e um stack local
> quase completo — e nenhuma peça final saiu ponta a ponta. Todo item marcado
> `a_validar_no_estudio` continua sendo hipótese informada até um job real atravessar
> a cadeia inteira. Estes dois testes são o que converte hipótese em fato.

---

## Estado atual — o que já está provado e o que não está

| Camada | Estado |
|---|---|
| Wan 2.2 I2V (max) | ✅ **validado** — lote "vovós", 6 takes renderizados |
| FLUX.2 klein 4B | ⚠️ instalado, grafo validado contra `/object_info` — **nenhum pixel gerado** |
| TTS-Audio-Suite | ⚠️ instalado — em validação |
| Foley / trilha / SFX | ❌ não instalado |
| Os 17 agentes | ❌ **nunca exercitados num job real** |
| Os 6 workflows de pipeline | ❌ nunca rodados ponta a ponta |
| Templates e gates | ❌ nunca preenchidos com job de verdade |

O buraco maior não é técnico: é que **a inteligência do squad nunca foi usada**. Os
agentes, o Pacote de Direção, os gates, o card de tarefa humana — tudo existe em disco
e nada passou por um job. Os dois testes abaixo existem para isso.

---

## TESTE A — Peça publicitária de hospedagem (Airbnb)

**Pipeline exercitado:** P1 `brand-film` + P6 `image-lab` como sub-rotina
**Cliente:** externo (é caso comercial real, não exercício)

### Insumo
Copiado para dentro do squad em `assets/insumos/airbnb/` (original em
`C:\Users\Pichau\Downloads\airbnb`) — **4 fotos**, 492 KB.

| Arquivo | Dimensão | Orientação |
|---|---|---|
| `01.webp` | 1200×900 | **paisagem** (1,33:1) |
| `02.webp` | 720×960 | retrato (0,75:1) |
| `04.png` | 1440×1920 | retrato (0,75:1) |
| `05.png` | 720×960 | retrato (0,75:1) |

**Dois problemas já resolvidos ou identificados no insumo, antes do job começar:**

1. **AVIF não é legível pelo pipeline.** `04` e `05` vieram em AVIF, que o PIL não abre
   sem plugin e o `LoadImage` do ComfyUI provavelmente também não. **Convertidos para
   PNG com ffmpeg** (originais preservados). Vale como regra: normalizar formato de
   insumo é etapa de `intake`, não descoberta de meio de job.

2. **Proporções misturadas — 1 paisagem contra 3 retratos.** Isso não é detalhe: define
   o formato da peça. Ou a peça é vertical (9:16, e a foto paisagem vira plano de apoio
   ou é recortada/expandida), ou é horizontal (e três das quatro fotos precisam de
   outpaint). É a **primeira decisão do `brief-strategist`**, e ela precede tudo.
   Resolução de `04` (1440×1920) é o dobro das outras — o `dop` também herda desnível
   de qualidade entre as fontes.

### Objetivo
Expandir e recriar takes a partir das 4 fotos e conectá-los numa peça publicitária que
exiba a casa de forma moderna. Não é slideshow: é peça com conceito, ritmo e assinatura.

### Por que este teste vale mais que um teste sintético
1. **É serviço vendável.** Vídeo de listagem para hospedagem e imobiliária é demanda
   real e recorrente — o teste vira portfólio.
2. **A restrição é o exercício.** Quatro fotos para uma peça inteira força exatamente a
   disciplina do `brand-film-playbook`: dois frames-base resolvem 70–80% das cenas,
   o resto é variação. Se o squad não souber fazer isso aqui, não sabe em campanha.
3. **Perfil de direitos limpo.** Imóvel próprio ou de cliente, sem pessoa identificável,
   sem marca de terceiro, sem obra protegida. Nenhum gate de direitos deveria travar —
   e se travar, é falso positivo que precisamos consertar.

### O que precisa ser exercitado, agente a agente
| Estágio | Agente | O que a peça exige dele |
|---|---|---|
| `brief` | `brief-strategist` | Nível de produção, avatar (quem aluga), KPI, canal |
| `research` | `research-scout` | Referência de vídeo de hospedagem que funciona, e o que NÃO copiar |
| `concept` | `creative-director` | A big idea — o que essa casa promete além de metros quadrados |
| `script` | `head-of-copy` | Narração ou peça muda? Decisão de formato |
| `decupagem` | `film-director` | Quais planos derivam de quais das 4 fotos; ordem narrativa |
| `look` | `dop` | Paleta e luz coerentes entre fotos tiradas em condições diferentes |
| `design` | `art-director` | Tipografia, assinatura, cartela final |
| `stills` | `image-lead` | **Pacote de Direção** para expandir/recriar os ângulos que faltam |
| `takes` | `motion-lead` | Movimento por plano — `camera-moves.yaml` em uso real |
| `audio` | `sound-designer` | Ambiência, trilha; VO se houver |
| `assembly` | `editor` | Spec de AE/Premiere + o que o video-studio já resolve |
| `factcheck` | `fact-checker` | A peça mostra a casa que existe? Nada inventado que o hóspede não vai encontrar |
| `gate` | `qa-critic` | `gate-brand-film.md` + `gate-transversal-entrega.md` |

### Stack técnico
```
4 fotos → FLUX.2 klein (expandir ângulo, recriar plano faltante)
        → Wan 2.2 I2V max (take por plano, 20 steps cfg 4)
        → RIFE 2x + UltraSharp
        → trilha/ambiência
        → video-studio → After Effects → Premiere
```

### Armadilha específica prevista
As 4 fotos foram tiradas com luz e lente diferentes entre si. O `dop` precisa resolver
coerência ANTES do `stills`, senão os takes não colam na montagem. É o tipo de problema
que só aparece em job real — motivo pelo qual o teste existe.

### Critério de sucesso
- Peça final montada, com conceito legível e assinatura
- Todos os gates atravessados, com veredito escrito
- **E o mais importante:** lista do que quebrou. Um teste que passa liso não ensina nada.

---

## TESTE B — Canal dark ponta a ponta

**Pipeline exercitado:** P5 `dark-room` completo
**Cliente:** perfil próprio (farming)

### Nicho recomendado: estoicismo / motivacional / prosperidade

O founder levantou música, motivacional, prosperidade e estoicismo. **Estoicismo é o
melhor dos quatro para o primeiro teste**, e a razão é dura:

| Critério | Por que estoicismo ganha |
|---|---|
| **Direitos da fonte** | Marco Aurélio, Sêneca e Epicteto são **domínio público**. Não há titular. É o oposto de novela e de música. |
| **O produto é a voz** | Exercita exatamente a lacuna nº 1 (TTS) no seu uso mais exigente: narração longa que precisa prender sem rosto e sem trilha emprestada |
| **Visual é livre** | Não depende de retratar pessoa real nem obra protegida — imagem simbólica e abstrata serve, e é o que o gênero pede |
| **Sem manobra** | Nenhum item da lista de recusados do `lives-niches-playbook.yaml` é necessário. O formato funciona honesto. |

Música fica para depois: o método do curso não depende de fonograma de terceiro (gera
no Suno), mas carrega quatro ressalvas de titularidade que ainda não resolvemos.

### O que precisa ser exercitado
| Estágio | O que valida |
|---|---|
| `intake` → `research` | `channel-brief.yaml` — o artefato persistente que o P5 exige e que nunca foi escrito |
| `script` | Roteiro longo com loop de curiosidade a cada 20–30s (`craft-references.yaml`) |
| `audio` | **TTS local com `Adjusted_SRT`** — a peça que amarra tudo |
| `stills` / `takes` | FLUX.2 klein + Wan, ou procedural sobre still (custo zero) |
| `assembly` | Legenda sincronizada a partir do `Adjusted_SRT` |
| `delivery` | Thumbnail + título — que no dark **são o produto** |

### Critério de sucesso
- Um episódio completo publicável
- `channel-brief.yaml` escrito e reutilizável para o episódio seguinte
- Tempo real de produção medido — é o que permite ao `exec-producer` orçar de verdade

---

## TESTE C — Faixa musical autoral (nicho dark de música)

**Pipeline exercitado:** P5 `dark-room`, variante `live-music-loop`
**Cliente:** perfil próprio (monetização)

### Por que este teste é diferente dos outros dois
Nos testes A e B a música é **apoio**. Aqui ela é **o produto** — e é o único caso em
que o ativo entregue é o áudio, não o vídeo.

### O que valida
- **ACE-Step** gerando faixa completa: letra, vocal e estrutura
- O fluxo de dois artefatos que a aula 3 ensinou: letra escrita à parte + prompt de
  estilo curto (~200 caracteres), em campos distintos
- Concatenação de ~10 faixas num loop longo sobre imagem em movimento

### O ganho de direitos que motiva o teste
A mineração da aula 3 registrou quatro ressalvas sobre gerar no Suno. A primeira —
**a titularidade vem dos termos de uso da plataforma, não de lei** — desaparece com
geração local sob Apache 2.0: não há plataforma entre o founder e o arquivo.

Continuam de pé as outras três, e o teste **não as resolve**: proteção contestada de
obra puramente gerada, possibilidade de reivindicação de Content ID por semelhança, e
política própria de distribuidora sobre IA. Registrar isso é parte do teste.

### Critério de sucesso
- Faixa autoral gerada local, aproveitável num loop
- Comparação honesta de qualidade contra o que o Suno entregaria
- Tempo de geração medido por faixa — define se o formato escala

---

## Música como capacidade transversal — correção de desenho

O `local-generation-stack.yaml` classificava trilha como **P4, última prioridade**.
Estava errado, e a correção veio do founder: **o teste do Airbnb acontece antes do
teste de música, e ele precisa de trilha para existir.** Peça publicitária sem trilha
não é peça — é sequência de takes.

A reclassificação:

| Uso | Onde | Modelo |
|---|---|---|
| **Produto** — a faixa é o ativo vendido/monetizado | Teste C, nicho dark de música | ACE-Step |
| **Apoio** — guia sensação, preenche vazio, sustenta o ritmo do corte | Testes A e B, e toda peça comercial | Stable Audio Open |
| **SFX** — whoosh, ambiência, impacto | Todos | Stable Audio Open |

Consequência para os testes A e B: **os dois passam a exigir trilha no `audio`**, e o
`sound-designer` deixa de ser figurante nesses jobs.

---

## Ordem e janela

1. **TESTE B primeiro** (dark estoicismo). É mais barato, exercita a lacuna que acabou
   de ser instalada (TTS) e produz um ativo publicável. Serve de aquecimento para o A.
2. **TESTE A depois** (Airbnb). Mais caro, mobiliza 13 agentes, e é o que vira
   portfólio comercial.
3. **TESTE C quando houver folga.** É o único que não depende dos outros — pode rodar
   isolado numa noite qualquer, porque não mobiliza a cadeia de vídeo.

**Janela:** ambos na madrugada. A máquina tem 16 GB de RAM e o encoder do FLUX sozinho
pede 7,49 GB — com sessão aberta não roda. O modo noturno não é preferência, é requisito.

---

## O que fazer com o que quebrar

Todo item que falhar vira entrada em um dos três lugares, nunca em conversa solta:
- Falha de **modelo ou parâmetro** → `data/local-generation-stack.yaml`
- Falha de **método ou prompt** → `data/prompt-architectures.yaml` ou `brand-film-playbook.yaml`
- Falha de **agente, gate ou artefato** → o arquivo do agente, ou o checklist

E os itens `a_validar_no_estudio` que sobreviverem viram `validado`, **com a evidência
do job anexada** — no padrão que o Wan já tem ("lote vovós, 6 takes").
