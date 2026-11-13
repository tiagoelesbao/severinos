---
name: oraclum-studio
description: >
  Executa um job do squad Oraclum Tech · AI Creative Studio do início ao fim —
  classifica o gênero, instancia o pipeline, e conduz os estágios até a entrega.
  Cobre dark room (canal sem rosto), filme de marca, UGC/ads, série de nicho,
  institucional Oraclum e image-lab.
  Use when: vídeo estoico, canal dark, peça de anúncio, filme de marca, gerar
  imagem/narração/trilha do estúdio, montar peça no video-studio, /oraclum-studio,
  *studio, *job.
user-invocable: true
argument-hint: "{o que você quer} [--pipeline=dark-room|brand-film|ugc-ads|nicho-series|oraclum-institucional|image-lab] [--roda=lite|pro]"
agent: studio-chief
---

# oraclum-studio

Estúdio de criação audiovisual e de imagem com IA. **O gênero define o pipeline, o
pipeline define o elenco.**

## Leia primeiro, nesta ordem

| Arquivo | Por quê |
|:---|:---|
| `squads/oraclumtech-ai-creative-studio/MEMORY.md` | **O que existe em disco e já validado.** Evita reabrir investigação feita e repetir erro já pago |
| `squads/oraclumtech-ai-creative-studio/_BLUEPRINT.md` | Regra de ouro §3.1, Pacote de Direção §3.2, cadeia de finalização §3.3 |
| `squads/oraclumtech-ai-creative-studio/_CONVENTIONS.md` | Nomes de pasta, de gate e de artefato. Normativo |
| `data/genre-catalog.yaml` | É ele que decide o pipeline |

**Se o job for do canal de futebol (Bora de Bola) ou da live**, leia antes:

| Arquivo | Por quê |
|:---|:---|
| `MEMORY.md` §6.4 e §6.5 | O índice do canal e da live — o que existe, medido, e a armadilha já paga |
| `apps/canal-futebol/ESTEIRA.md` | **O runbook do episódio**, do fato à publicação. Não improvise a ordem |
| `apps/live-futebol/README.md` | Operação da live: OBS, áudio, chat, `/saude` |

## A regra de ouro que governa tudo

**O squad DIRIGE a geração; o humano GERA.** Nenhum estágio "renderiza" no lugar do
founder. O entregável de um estágio de geração é um **Pacote de Direção** — prompt,
parâmetros, workflow apontado, critério de aceite — e o lote enfileirado.

Na prática isso significa: você monta o job em `run_batch.py`, roda, mede, e devolve
a folha de contato. **Quem escolhe é o founder.**

## Classificação

| O pedido parece | Pipeline | Workflow |
|:---|:---|:---|
| canal sem rosto, VO sobre b-roll, episódio de série | `dark-room` | `workflows/wf-dark-room.yaml` |
| **episódio do Bora de Bola / notícia de futebol** | `dark-room` **variante futebol** | `apps/canal-futebol/ESTEIRA.md` |
| **live de jogo, painel de placar ao vivo** | `live-stats-panel` (backlog) | `apps/live-futebol/README.md` |
| filme de marca, institucional de cliente | `brand-film` | `wf-brand-film.yaml` |
| anúncio, criativo de performance, UGC | `ugc-ads` | `wf-ugc-ads.yaml` |
| série temática recorrente | `nicho-series` | `wf-nicho-series.yaml` |
| Oraclum falando da Oraclum | `oraclum-institucional` | `wf-oraclum-institucional.yaml` |
| só imagem, sem timeline | `image-lab` | `wf-image-lab.yaml` |

Se estiver ambíguo, **pergunte** — instanciar o pipeline errado custa o job inteiro.

## Pré-requisito que bloqueia o dark-room

Canal sem `channel-brief.yaml` **não abre episódio**. O job é convertido em job de
fundação de canal. Ver `wf-dark-room.yaml` → `canal.job_de_fundacao`.

### As duas variantes de dark-room em produção — elas divergem muito

| | `canal-estoico` | `bora-de-bola` |
|:---|:---|:---|
| Pauta | atemporal | **notícia do dia**, morre em ~48 h |
| Imagem | gerada por IA | **acervo + foto de portal + cartela. Zero IA** |
| Corte | contínuo | **seco, ~5 s** |
| Gate dominante | `gate-stills` | **`gate-factcheck`** |

No futebol a **embalagem vem antes do roteiro** — o roteiro cumpre a promessa do
título. Inverter produz vídeo que entrega coisa diferente da que foi clicada.
As skills `/pauta-futebol` (etapa 0) e `/packaging` (etapa 1) resolvem esses dois
estágios e rodam **antes** do resto da esteira.


## Modelar uma referência validada

Quando o pedido for "modelar esse vídeo", "quero igual a esse canal" ou "criar novo
modelo a partir de benchmark", a task SOT é
`squads/oraclumtech-ai-creative-studio/tasks/modelar-referencia.md`. **Leia antes de
começar** — ela carrega armadilhas que já custaram tempo.

O fluxo, em resumo:

1. **Transcrição integral**, nunca amostragem. Ritmo e pausa MEDIDOS.
2. **Extração de takes** por amostragem uniforme — detecção de corte não funciona em
   peça que dissolve, e já devolveu zero cortes em 34 minutos.
3. **Dimensionar o pack pelo tempo em tela**, não pela contagem de takes únicos.
4. **Escrever a identidade visual** em `data/identidades-visuais.yaml`, com
   `procedencia: derivada`.
5. **TRÊS variações por take** — fiel, intermediária, autoral — com **semente fixa**
   entre elas.
6. **Storyboard de validação** com o frame real ao lado das três. Quem escolhe é o
   founder.


## Execução de geração — o stack local

Tudo roda no ComfyUI local, por `run_batch.py`. Nunca edite o JSON de workflow à mão:
os de acabamento são gerados por `gera_workflows_refino.py`.

```bash
cd squads/oraclumtech-ai-creative-studio/assets/comfyui

python run_batch.py --list              # o que está registrado
python run_batch.py --only <filtro>     # roda o subconjunto
```

### As duas rodas de acabamento de imagem

| Roda | Cadeia | Custo | Quando |
|:---|:---|:---|:---|
| **LITE** | cru → upscale 2× | ~175 s | volume, teste, thumbnail, prova de conceito |
| **PRO** | cru → detailer → upscale 3× | ~360 s | peça final |

A mesma imagem crua alimenta as duas. **A escolha de roda acontece depois da escolha
de semente** — nada é regerado.

## Avisos que você DEVE dar antes de rodar

- **Custo de tempo.** Diga o total estimado. 12 imagens na roda PRO = ~72 min.
- **A máquina é o limite.** RTX 4060 Ti 8 GB e 16 GB de RAM. Rodar transcrição ou
  outro modelo grande em paralelo **derruba o ComfyUI**. Sequencie.
- **Ordem de validação do founder:** locução → música → imagem → **vídeo por último**,
  porque o vídeo é o mais pesado e fica para a madrugada.

## Gates que não podem ser pulados

| Gate | Regra |
|:---|:---|
| `gate-stills` | **Inspeção estrutural antes de textura.** Contar membros, contar elementos repetidos, perguntar de cada objeto "isto tem função na cena?" |
| `gate-factcheck` | NÃO-DISPENSÁVEL quando houver imagem ou voz de pessoa real |
| `gate-audio` AU-A-07 | Origem de voz licenciada ou autorizada. **Há contradição aberta aqui** — a voz embutida do ChatterBox não é nenhuma das duas. Escalar ao founder, não contornar |
| Escolha de semente | O método é volume + escolha humana. Não escolha por ele |
| Três variações | Modelagem entrega fiel + intermediária + autoral. Entregar uma só impede a escolha |

## Erros que já custaram caro — não repita

1. **Adjetivo atmosférico vira ruído.** `dust motes`, `haze`, `particles`, `grain`
   contra fundo preto viram sujeira depois do codec.
2. **Objeto não nomeado é objeto inventado.** Diga em que a estátua se apoia.
3. **Estado não substitui forma.** `unrolled scroll` produziu um tubo oco.
4. **Nunca peça superfície escrita.** Texto de IA é a única anomalia que o
   espectador consegue *ler*. Tipografia entra depois, de verdade.
5. **O detector YOLO de mão não dispara em mármore.** Não prometa conserto
   automático de mão em estética não-fotográfica.
6. **`stretch_to_fit` está proibido** no timing de SRT. Rejeitado pelo founder.
7. **O guard `if __name__` fica no fim do `run_batch.py`.** Bloco de jobs depois
   dele não existe quando `main()` roda.

## Relato final

Leia o **disco**, não os logs. Diga: job, pipeline instanciado, estágios concluídos,
artefatos em caminho absoluto, vereditos de gate, e **o que ficou pendente de decisão
do founder**. Se mediu algo, dê o número — e se o número contrariar a sua hipótese,
diga isso.
