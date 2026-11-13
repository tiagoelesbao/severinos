<!--
TEMPLATE — DOSSIÊ DE REFERÊNCIA
Onde vive:  {job}/02-research/reference-dossier.md
Quem preenche: @research-scout
Validado por:  checklists/gate-research.md

PARA QUE SERVE: transformar "achei umas referências legais" em MECANISMO REPLICÁVEL.
Uma referência sem explicação do porquê funciona não é insumo de produção — é pinterest.

TRÊS REGRAS QUE O GATE COBRA:
  1. Mínimo 3 referências, cada uma com análise completa (RS-01).
  2. Cada análise aponta o MECANISMO concreto, não o efeito. "É envolvente" reprova;
     "abre um open loop de custo aos 15s e só paga aos 49s" passa (RS-03).
  3. Toda referência tem a seção "o que NÃO copiar" (RS-04) — é ela que impede o
     pipeline de importar o problema junto com a solução.

REGRA DE FRONTEIRA: material daqui é REFERÊNCIA, nunca insumo de produção. Nenhum
frame, áudio ou trecho deste dossiê pode migrar para a peça (RS-05).
Remova estes comentários antes de emitir.
-->

# Dossiê de Referência — `<job-id>`

| | |
|:---|:---|
| **Job / gênero** | `<job-id>` · `<pipeline-id>` |
| **Cliente** | `<slug>` |
| **Pesquisado por** | `@research-scout` |
| **Data** | `<YYYY-MM-DD>` |
| **Brief** | `{job}/01-brief/brief.yaml` |
| **Moodboard** | `{job}/02-research/moodboard/` |
| **Benchmark ETL** | `<caminho da saída, ou "não executado">` |

---

## 1. Pergunta de pesquisa

<!-- O que este dossiê precisava descobrir. Sem isso, a pesquisa vira coleta. -->

> `<Ex.: como peças de institucional técnico sustentam autoridade sem depoimento de
> cliente, num formato de até 45s para feed?>`

---

## 2. Referências analisadas

<!-- Repita o bloco por referência. Mínimo 3. -->

### Ref 01 — `<título ou descrição curta>`

| | |
|:---|:---|
| **Link** | `<url>` |
| **Autor / veículo** | `<quem publicou>` |
| **Data da peça** | `<YYYY-MM-DD>` |
| **Data de captura** | `<YYYY-MM-DD>` — link verificado neste dia |
| **Gênero / canal** | `<gênero>` · `<canal>` |
| **Duração / formato** | `<n s>` · `<9:16>` |
| **Desempenho observado** | `<métrica pública, ou "não disponível" — nunca estimar>` |

**Por que funciona — mecanismo:**

<!-- O COMO, não o efeito. Aponte o dispositivo e onde ele acontece. -->

1. `<mecanismo 1 — ex.: o hook mostra o resultado final antes de explicar o processo (00:00-00:03)>`
2. `<mecanismo 2 — ex.: abre open loop de custo aos 00:15 e só paga aos 00:49>`
3. `<mecanismo 3 — ex.: b-roll é funcional, demonstra o passo enquanto a fala explica>`

**Estrutura em beats:**

| Beat | Janela | Função | O que acontece |
|:---|:---|:---|:---|
| 1 | `<00:00-00:06>` | hook | `<...>` |
| 2 | `<00:06-00:20>` | build | `<...>` |
| 3 | `<...>` | `<...>` | `<...>` |

**Decisões de ofício observáveis:**

| Eixo | O que a peça faz |
|:---|:---|
| Luz | `<qualidade, direção, temperatura>` |
| Enquadramento | `<escala predominante, altura de câmera>` |
| Paleta | `<cores dominantes>` |
| Cadência | `<duração média de plano>` |
| Tipografia / legenda | `<estilo, posição, tratamento>` |
| Som | `<trilha, SFX, uso de silêncio>` |

**⛔ O que NÃO copiar desta referência:**

<!-- Obrigatório. Mínimo 1 item, com motivo. -->

| Não copiar | Motivo |
|:---|:---|
| `<ex.: o CTA "comenta IA que eu te mando o link">` | está em `cta_estilo.exemplos_proibidos` do cliente |
| `<ex.: o número "custo total: $400" exibido no final>` | é dado da fonte, não nosso — copiar seria fabricação (C-NUM) |
| `<ex.: a marca da ferramenta em destaque no frame>` | marca de terceiro sem uso nominativo justificado (D-MAR) |
| `<ex.: o handle do criador visível na peça>` | identificador de terceiro (D-NOM) |

**Identificadores de terceiro presentes nesta referência** *(não reutilizáveis — RS-06)*:
`<@handle, nome do autor, marcas visíveis>`

---

### Ref 02 — `<título>`

<!-- Repita a estrutura completa da Ref 01. -->

---

### Ref 03 — `<título>`

<!-- Repita a estrutura completa da Ref 01. -->

---

## 3. Anti-referências

<!-- O que existe no mercado e que este job NÃO quer parecer. Tão útil quanto o que copiar. -->

| Peça / padrão | Por que evitar |
|:---|:---|
| `<descrição>` | `<motivo — clichê do nicho, fora do arquétipo, saturado>` |

---

## 4. Síntese — o que é replicável **neste** job

<!-- A seção que conecta a pesquisa às restrições reais. Sem ela o dossiê descreve o
     mundo sem dizer o que serve aqui (RS-09). -->

| Mecanismo | Origem | Cabe no brand-lock? | Cabe no orçamento? | Recomendação |
|:---|:---|:---|:---|:---|
| `<mecanismo>` | Ref 01 | `<sim / não — por quê>` | `<sim / não — n assets>` | `<adotar / adaptar / descartar>` |
| `<mecanismo>` | Ref 02 | `<...>` | `<...>` | `<...>` |

**Adaptações obrigatórias:**

- `<ex.: o open loop funciona, mas o "custo em dólar" precisa virar "tempo economizado",
  porque não temos o dado de custo e inventá-lo é fabricação>`

---

## 5. Moodboard

<!-- Agrupado por eixo, não em pilha (RS-08). -->

| Eixo | Arquivos | O que observar |
|:---|:---|:---|
| Luz | `moodboard/luz/*` | `<...>` |
| Paleta | `moodboard/paleta/*` | `<...>` |
| Enquadramento | `moodboard/enquadramento/*` | `<...>` |
| Tipografia | `moodboard/tipografia/*` | `<...>` |
| Ritmo / montagem | `moodboard/ritmo/*` | `<...>` |

---

## 6. Benchmark ETL (quando executado)

| | |
|:---|:---|
| **Executado?** | `<sim / não>` |
| **Diretório de saída** | `<caminho>` |
| **Packs completos** | `<n>` |
| **Packs degradados** | `<n>` — motivo técnico: `<...>` |

---

## 7. Lacunas

<!-- Honestidade sobre o que a pesquisa NÃO conseguiu responder. Lacuna declarada é
     informação; lacuna escondida vira suposição no roteiro. -->

- `<o que não foi possível verificar, e o impacto disso na decisão criativa>`

---

## 8. Fronteira de uso

- [ ] Nenhum arquivo deste dossiê será usado como asset de produção (RS-05)
- [ ] Todos os identificadores de terceiro estão sinalizados acima (RS-06)
- [ ] Todo dado numérico citado aqui pertence à **fonte**, e só pode entrar na peça
      se for reancorado em fonte própria e registrado no `claim-ledger`
