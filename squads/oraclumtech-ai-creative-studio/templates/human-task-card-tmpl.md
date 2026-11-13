<!--
TEMPLATE — CARD DE TAREFA HUMANA
================================
Onde vive:  {job}/_cards/{card-id}.md
Quem emite: o agente dono do estágio (@image-lead, @motion-lead, @sound-designer),
            operacionalizado pelo @exec-producer.
Quem lê:    o operador HUMANO que vai gerar o asset na ferramenta.

POR QUE ESTE ARTEFATO EXISTE (Regra de Ouro — _BLUEPRINT.md §3.1)
O squad NÃO gera a imagem, o vídeo nem a voz. O squad DIRIGE a geração, que é humana.
Este card é o contrato entre o agente que dirige e a pessoa que opera a ferramenta.
O valor do agente está em: escolher a ferramenta certa, escrever o prompt com a técnica
correta, antecipar o que aquele modelo erra, dar o parâmetro exato e dizer como avaliar
o resultado — para o operador acertar na 1ª ou 2ª tentativa, não na 10ª.

REGRAS DE PREENCHIMENTO (o `gate-stills` / `gate-takes` / `gate-audio`, Parte A, reprova
o card antes de ele sair, e um card incompleto NÃO vai ao humano):
  1. Remova TODOS os comentários HTML antes de emitir.
  2. Nenhum campo pode sair com <...>, {{...}}, TODO ou "a definir".
  3. O prompt precisa ser COLÁVEL sem edição.
  4. Critério de aceite precisa ser BINÁRIO (sim/não), nunca "ficar bom".
  5. Onde devolver e com que nome são obrigatórios — sem eles o retorno se perde.
  6. Um card por asset. Lote só quando os assets compartilham o MESMO prompt-base e
     mudam apenas por um parâmetro declarado (e aí liste os assets na seção 1).
-->

---
card_id: "<CARD-{estagio}-{asset-id}>"          # ex.: CARD-stills-p03-produto-close
job_id: "<job-id>"
job_path: "{job}"
estagio: "<stills | takes | audio>"
asset_id: "<asset-id>"                           # bate com o storyboard e o asset_direction
asset_direction: "{job}/<11-stills|12-takes|13-audio>/_direction/<asset-id>.yaml"
emitido_por: "<@image-lead | @motion-lead | @sound-designer>"
emitido_em: "<YYYY-MM-DD HH:MM>"
operador: "<nome de quem vai executar — pessoa, nunca agente>"
prazo: "<YYYY-MM-DD HH:MM>"
status: "aberto"                                 # aberto | devolvido | aceito | retake | cancelado
rodada: 1                                        # incrementa a cada retake dirigido
---

# 🎬 Card de Tarefa — `<asset-id>`

> **Você está gerando o asset. O agente escreveu a direção. Se a direção estiver errada ou
> insuficiente, NÃO improvise em silêncio: devolva o card apontando o que faltou.**

---

## 1. O que fazer

<!-- Uma frase imperativa. O operador precisa entender a tarefa antes do café. -->

**<Gerar N variações da imagem do plano 3: close do produto sobre bancada, luz lateral difusa.>**

| | |
|:---|:---|
| **Ferramenta** | `<nome + modelo/versão exatos>` |
| **Alternativa** | `<nome + modelo>` — usar se: `<motivo em uma frase>` |
| **Variações a gerar** | `<n>` |
| **Tempo estimado** | `<~X min>` |
| **Custo estimado** | `<~N créditos>` |

---

## 2. Por que este asset existe

<!-- Contexto curto. Operador que entende a função do plano toma decisões melhores nas
     escolhas que o prompt não cobre. -->

- **Serve ao plano:** `<beat_n / plano_id>` do `{job}/06-decupagem/storyboard.yaml`
- **Momento da peça:** `<abertura | desenvolvimento | virada | prova | fechamento>`
- **O que este plano precisa comunicar:** `<uma frase>`
- **O que vem antes / depois:** `<plano anterior>` → **este** → `<plano seguinte>`

---

## 3. Insumos anexos

<!-- Tudo que o operador precisa ter aberto. Caminho real, não descrição. -->

| Insumo | Caminho | Obrigatório? |
|:---|:---|:---|
| Still de origem (I2V) | `{job}/11-stills/entregues/<arquivo>` | `<sim/não>` |
| Imagem-âncora do personagem | `squads/oraclumtech-ai-creative-studio/data/characters/<character-id>/canon.png` | `<sim/não>` |
| Bloco de prompt do personagem | `data/characters/<character-id>/prompt-block.md` | `<sim/não>` |
| Referência de produto | `{job}/01-brief/insumos/<arquivo>` | `<sim/não>` |
| Frame de referência de look | `{job}/02-research/moodboard/<arquivo>` | `<sim/não>` |
| Look-book | `{job}/07-look/look-book.md` | consulta |
| Art-spec | `{job}/08-design/art-spec.yaml` | consulta |

---

## 4. Pacote de Direção

<!-- Espelha o schema asset_direction do _BLUEPRINT.md §3.2. O YAML canônico fica em
     _direction/<asset-id>.yaml; aqui ele aparece em forma legível para o operador. -->

### 4.1 Prompt — copie e cole exatamente

```text
<PROMPT COMPLETO, PRONTO PARA COLAR. Sem placeholder, sem "adapte conforme necessário".
Se o personagem tem prompt-block no registry, ele entra aqui LITERALMENTE, palavra por
palavra, para não haver variação entre gerações.>
```

### 4.2 Prompt negativo

```text
<Texto do prompt negativo. Se a ferramenta não suporta, escreva: n/a — a ferramenta não
suporta prompt negativo.>
```

### 4.3 Parâmetros

<!-- Preencha as linhas do tipo de asset e apague as demais. Valor concreto sempre:
     "mais ou menos 5 segundos" não é parâmetro. -->

| Parâmetro | Valor |
|:---|:---|
| Proporção (aspect) | `<9:16 / 1:1 / 4:5 / 16:9>` |
| Resolução-alvo | `<1080x1920>` |
| Seed | `<valor exato | livre — e por quê>` |
| **[vídeo]** Duração | `<n s>` |
| **[vídeo]** FPS | `<24 / 30 / 60>` |
| **[vídeo]** Intensidade de movimento | `<valor/escala da ferramenta>` |
| **[vídeo]** Rota | `<I2V a partir do still X | T2V — justificativa>` |
| **[voz]** Voz / preset | `<id do preset>` |
| **[voz]** Idioma / velocidade | `<pt-BR / valor>` |
| Outros | `<steps, cfg, guidance, style…>` |

### 4.4 Técnica — como extrair o máximo desta ferramenta

<!-- Procedimento, em ordem. Cada item começa com um verbo executável.
     "Cinematográfico" não é técnica; "gerar o still-chave primeiro e usar como referência
     nos demais" é. Mínimo 2 itens. -->

1. `<passo 1>`
2. `<passo 2>`
3. `<passo 3>`

### 4.5 Armadilhas conhecidas deste modelo

<!-- Mínimo 2, específicas DESTE modelo e DESTE plano, cada uma com o contorno.
     É a seção que economiza as 8 tentativas do meio. -->

| O que costuma dar errado | Como evitar |
|:---|:---|
| `<ex.: mão em primeiro plano deforma>` | `<enquadrar acima do punho ou esconder a mão atrás do produto>` |
| `<ex.: inventa texto na embalagem>` | `<pedir embalagem sem rótulo; a tipografia entra na composição depois>` |

---

## 5. Quantas variações e como escolher

- **Gerar:** `<n>` variações. <!-- ≥ 2 sempre; ≥ 3 em peça de destaque -->
- **O que faz uma variação vencer:** `<critério concreto de desempate — ex.: "a que tiver
  a luz mais lateral e o rótulo mais legível", não "a mais bonita">`
- **Guarde as descartadas.** Elas vão para `descartes/` com o motivo (seção 10).

---

## 6. Critério de aceite

> Responda **sim** ou **não** para cada linha, olhando o arquivo. Se alguma for **não**,
> o asset não passa — gere de novo ou devolva o card.

- [ ] `<critério binário 1 — ex.: o produto aparece inteiro, sem corte de borda>`
- [ ] `<critério binário 2 — ex.: o rótulo é legível a 100% de zoom>`
- [ ] `<critério binário 3 — ex.: a luz principal vem da esquerda>`
- [ ] `<critério binário 4 — ex.: nenhuma mão visível no quadro>`

**Sempre válidos, em todo card:**

- [ ] Sem marca d'água, selo ou assinatura da ferramenta (confira bordas e cantos)
- [ ] Sem logo, marca ou texto inventado no cenário
- [ ] Resolução entregue ≥ resolução-alvo da seção 4.3
- [ ] **[com pessoa]** Mãos, olhos e dentes corretos — sem dedo a mais, sem assimetria
- [ ] **[com personagem]** Os traços âncora do registry estão visíveis e corretos
- [ ] **[vídeo]** Sem derretimento ao longo do movimento, principalmente no último terço
- [ ] **[vídeo]** A identidade do personagem é a mesma do primeiro ao último frame
- [ ] **[voz]** Toda palavra compreensível sem legenda; termos críticos bem pronunciados

---

## 7. Pós-processamento

<!-- Se não houver, escreva "nenhum". Ausência silenciosa faz o operador inventar ou pular. -->

`<upscale 2× → corte para 9:16 mantendo o produto no terço inferior → nenhum ajuste de cor>`

---

## 8. Se falhar

- **Plano B:** `<rota concreta e DIFERENTE — outra ferramenta, ou outra abordagem, ex.:
  "se o I2V derreter, animar o still em After Effects com parallax">`
- **Quando parar:** após **3 rodadas** sem aceite, **pare**. Devolva o card com o que você
  observou. O agente troca a rota do plano — o plano não é abandonado, a rota é.
- **Não faça:** insistir na mesma direção queimando crédito. Se três tentativas com o mesmo
  prompt falharam, o problema é a direção, não a sorte.

---

## 9. Onde devolver e com que nome

> **Sem isto o trabalho se perde.** Devolva exatamente aqui, exatamente com este nome.

| | |
|:---|:---|
| **Pasta de devolução** | `{job}/<11-stills|12-takes|13-audio>/entregues/` |
| **Descartadas** | `{job}/<...>/descartes/` |
| **Padrão de nome** | `<asset-id>_v<n>.<ext>` |
| **Exemplo real** | `p03-produto-close_v1.png`, `p03-produto-close_v2.png` |
| **Formato do arquivo** | `<PNG sem compressão / MP4 H.264 / WAV 48kHz>` |

**Proibido no nome do arquivo:** espaço, acento, `@handle`, nome de terceiro, nome de
marca de concorrente, `final`, `final2`, `versao_boa`.

---

## 10. O que registrar ao devolver

> Preencha e devolva junto. **Isto não é burocracia:** é o que permite reproduzir o acerto
> no próximo lote e o que torna a Regra de Ouro auditável. O `gate` reprova asset sem
> rastreabilidade, mesmo que a imagem esteja perfeita.

```yaml
rastreabilidade:
  asset_id: "<asset-id>"
  ferramenta: "<nome + modelo/versão exatos>"
  prompt_usado: |
    <O PROMPT QUE VOCÊ REALMENTE COLOU. Se você ajustou alguma palavra na hora,
    registre o texto AJUSTADO, não o original do card. A diferença entre o prompt
    planejado e o usado é a informação mais valiosa que este estúdio produz.>
  parametros:
    seed: "<valor>"
    aspect: "<valor>"
    resolucao: "<valor>"
    outros: "<...>"
  operador: "<seu nome>"            # pessoa, sempre
  data_hora: "<YYYY-MM-DD HH:MM>"
  variacoes_geradas: <n>
  escolhida: "<arquivo>"
  descartes:
    - arquivo: "<arquivo>"
      motivo: "<mão deformada | wardrobe mudou | logo alucinado | movimento derreteu>"
  observacoes: "<o que o modelo fez de inesperado — vira armadilha conhecida no próximo card>"
```

---

## 11. Prazo e comunicação

- **Prazo:** `<YYYY-MM-DD HH:MM>`
- **Se travar, avise:** `<@image-lead | @motion-lead | @sound-designer>` e o `@exec-producer`
- **Não trave em silêncio.** Card parado sem aviso segura o pipeline inteiro: o estágio
  seguinte não começa enquanto este não fechar.

---

## Regra de ouro deste card

1. **A geração é sua.** Nenhum agente vai gerar este asset por você, e nenhum agente pode
   simular que gerou. Se o asset não existe, o estágio não avança.
2. **A direção é do agente.** Se ela estiver vaga, devolva o card em vez de adivinhar —
   o card incompleto é falha do agente, não sua.
3. **O registro é obrigatório.** Asset sem rastreabilidade não entra no master.

<!--
FECHAMENTO (preenchido por quem avalia, não pelo operador)
---------------------------------------------------------
avaliado_por: <@agente>
avaliado_em: <YYYY-MM-DD HH:MM>
resultado: ACEITO | RETAKE DIRIGIDO | CANCELADO
criterios_reprovados: [<lista>]
o_que_mudou_na_direcao: <obrigatório em retake — reemitir card com a MESMA direção é proibido>
-->
