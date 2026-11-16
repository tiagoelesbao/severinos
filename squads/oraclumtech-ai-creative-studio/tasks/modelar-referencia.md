---
task_name: modelar-referencia
status: ready
responsible_executor: image-lead
colaboradores: [research-scout, art-director, sound-designer, exec-producer]
execution_type: worker
tipo: estagio
stage_id: modelar-referencia
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-024
pipelines: [P5, P7]
entra_antes_de: stills
input: |
  - Um ou mais VÍDEOS de referência já validados por desempenho, em disco
  - {job}/01-intake/brief.yaml — para saber o que o canal quer herdar
output: |
  - docs/referencias/{nicho}/{slug}/transcricao.txt · .srt · segments.json · metricas.json
  - docs/referencias/{nicho}/{slug}/takes/ — frames, únicos, takes.json, contato.jpg
  - data/identidades-visuais.yaml — entrada nova, `procedencia: derivada`
  - {job}/04-modelagem/STORYBOARD.md — os takes propostos, TRÊS variações cada
  - {job}/04-modelagem/comparativo.jpg — frame real x as três variações
gate: checklists/gate-modelagem.md
failure_modes: |
  - Descrever a referência de memória em vez de extrair os takes
  - Entregar UMA variação por take — impede escolha, só permite aceitar
  - Copiar o frame em vez de reproduzir a linguagem
  - Usar detecção de corte numa peça que dissolve (devolve zero cortes)
  - Comparar cada amostra com a primeira do grupo (a deriva do zoom quebra o agrupamento)
  - Dimensionar o pack pelo número de takes únicos em vez de pelo tempo em tela
  - Herdar da referência o que é manobra, e não o que é ofício
acceptance_criteria: |
  - Ritmo (wpm) e densidade de pausa MEDIDOS, não estimados
  - Takes extraídos, com tempo em tela e ponto da primeira reciclagem
  - Identidade visual escrita com `procedencia: derivada` e evidência em disco
  - TRÊS variações por take: fiel, intermediária, autoral
  - Comparativo lado a lado com o frame real entregue ao founder
  - O que foi RECUSADO da referência está listado, com o motivo
---

# modelar-referencia — engenharia reversa de peça validada

Este estágio existe porque **modelar o que já funciona é mais barato que descobrir
do zero.** Uma peça validada por desempenho carrega decisões que custaram views para
serem aprendidas: ritmo de fala, densidade de pausa, quantas imagens o formato exige,
onde ele recicla, que luz ele usa, como a legenda respira.

O que este estágio **não** é: copiar. O entregável é a **linguagem**, não o frame.

---

## 1 · Transcrição integral — nunca amostragem

```bash
python assets/comfyui/transcreve_referencias.py small
```

**Não rodar com o ComfyUI carregado.** São 16 GB de RAM na máquina e os dois juntos
derrubam o ComfyUI. Espere a fila esvaziar.

Sai: transcrição, SRT e `metricas.json` com ritmo, pausas e ritmo por bloco de 5 min.

**Por que integral:** a primeira versão do playbook de estoicismo foi escrita por
amostragem de três trechos de 12 s e registrou *"152 wpm é lei do formato"*. A
transcrição integral mediu **127,5 wpm** naquela peça — o 152 era da outra. Erro de
quase um minuto num roteiro de 600 palavras.

**O que ler nas métricas, e não só o wpm:**

| Sinal | O que significa |
|---|---|
| Pausas > 250 ms em toda a peça | 2 pausas em 34 min não é respiração humana. É indício forte de TTS. |
| wpm por bloco de 5 min | Variação de 8 wpm = entrega contínua. Queda no miolo com recuperação = fala dirigida. |
| Mediana de pausa | Calibra o nosso SRT. Medido: 0,72 s. Acima de 1,0 s vira buraco. |

---

## 2 · Extração de takes

```bash
python assets/comfyui/extrai_takes_referencia.py 2.0
```

**Duas armadilhas que já custaram tempo aqui:**

**Não use detecção de corte.** `select=gt(scene,...)` devolveu **zero cortes** numa
peça de 34 minutos. Ela não corta — **dissolve**. Dissolvência lenta nunca cruza o
limiar de cena. Use amostragem uniforme e deixe o agrupamento decidir onde mudou.

**Compare com a amostra ANTERIOR, não com a primeira do grupo.** O zoom lento faz o
hash **derivar**: comparando com a primeira, a mesma imagem virou 230 "takes" numa
peça que tem 99.

Isso também dá um achado de composição de graça: **se a detecção de corte não acha
nada, a transição padrão daquele formato é dissolve, nunca corte seco.**

---

## 3 · Dimensionar o pack pelo TEMPO EM TELA, não pela contagem

O número de takes únicos é a resposta errada para "quantas imagens preciso".

| Medido | v1 (34 min) | v2 (42 min) |
|---|---|---|
| Takes únicos | 99 | 88 |
| **1ª reciclagem** | **8:44** | **6:00** |
| Top 20 cobrem | 32% | 53% |
| Top 30 cobrem | 41% | 63% |

**A cauda é longa e barata.** Dezenas de takes aparecem uma vez, por 20 s. Então:
**acabamento PRO nos ~20 que carregam o vídeo, LITE na cauda.** Duas horas de máquina
em vez de nove, e a diferença não aparece em tela.

---

## 4 · Escrever a identidade visual

Entrada nova em `data/identidades-visuais.yaml`, com `procedencia: derivada` e os
takes em disco como evidência. Sem os takes extraídos é palpite, não derivação.

O que a entrada precisa fixar: **sujeito**, **escala no quadro**, **ambiente**,
**paleta** (chave, sombra, acento, saturação), **acabamento** (grão, vinheta),
**transição**, **movimento** e **legenda** (estilo e cor de destaque).

**O erro que este campo previne:** a descrição antiga do estoicismo dizia "estátua
isolada sobre fundo preto — o padrão dominante". Os takes mostraram que fundo preto é
**minoria**; o padrão é figura dentro de ambiente com profundidade. Um pack inteiro
foi gerado no estilo errado antes de alguém olhar os frames.

---

## 5 · TRÊS variações por take — regra dura

| Nível | O que é | Quando serve |
|---|---|---|
| **Fiel** | Paleta, enquadramento e luz descritos a partir do frame real | Herdar o que já foi validado |
| **Intermediária** | Mesmo corpo, look ajustado ao padrão do nosso canal | O canal já tem identidade e a referência é insumo |
| **Autoral** | Ideia mantida, luz e cor recompostas | Separar-se da referência |

**A semente é FIXA entre as três.** Se a semente variar junto com o prompt, a
comparação não diz nada — não dá para saber se a diferença veio da direção ou do
acaso.

Uma variação só não permite escolher. Permite aceitar.

---

## 6 · Comparativo lado a lado

Frame real na primeira coluna, as três variações depois. É o documento que o founder
lê para decidir, e é onde os desvios aparecem.

**O desvio que apareceu na primeira rodada:** nossas imagens saíam **mais quentes e
mais saturadas** que a referência. Só ficou visível lado a lado — nenhuma delas, vista
sozinha, parecia errada.

---

## 7 · O storyboard de validação

`{job}/04-modelagem/STORYBOARD.md` — um bloco por take, com o frame real, as três
variações, e caixas para o founder marcar **qual variação segue** e o que corrigir.

Este formato foi pedido explicitamente: *"gostei dessa dinâmica de validar com um
documento de storyboard já com os takes para eu apontar correções necessárias em cada
um antes de prosseguir com a etapa de composição"*.

---

## 8 · O que NÃO herdar

Nem tudo numa peça validada é ofício. Separe sempre:

- **Ofício** — ritmo, estrutura de copy, gramática visual, densidade de pausa
- **Escolha daquele canal** — legenda bilíngue, marca d'água, resolução de origem
- **Manobra** — o que é engenharia contra a plataforma ou contra o espectador

O terceiro grupo vai para a lista de recusados **com o motivo escrito**, não é
descartado em silêncio. O padrão `engenharia do artefato de revisão` apareceu em
todas as três aulas do Dark Room e deve ser o primeiro item procurado.

---

## Estado das ferramentas

| Ferramenta | Onde | Estado |
|---|---|---|
| `transcreve_referencias.py` | `assets/comfyui/` | validado nas duas peças de estoicismo |
| `extrai_takes_referencia.py` | `assets/comfyui/` | validado — 99 e 88 takes |
| `modelagem_takes_v1.py` | `assets/comfyui/` | **exemplo de referência**; ao modelar outro nicho, copie a estrutura |
| `identidades-visuais.yaml` | `data/` | 2 identidades derivadas |
