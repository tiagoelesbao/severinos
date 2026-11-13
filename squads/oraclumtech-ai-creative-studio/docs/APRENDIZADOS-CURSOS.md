# Aprendizados de curso — procedência e o que mudou no squad

> Registro de onde veio cada conhecimento incorporado ao
> `oraclumtech-ai-creative-studio` a partir do estudo de material externo.
> Autor: @aiox-master (Orion) · Iniciado em 2026-08-27
>
> **Por que este arquivo existe:** conhecimento sem procedência vira folclore. Daqui
> a seis meses, quando uma ferramenta mudar de comportamento, é preciso saber se a
> regra veio de teste nosso, de curso, ou de suposição — e revisar só o que perdeu
> validade. Cada item abaixo tem origem rastreável e um estado de validação.

---

## 1. Corpus ingerido

| Curso | Aulas | Vídeo | Material escrito |
|---|---:|---:|---|
| AI Image Creator PRO — Human Academy | 104 | 13h50m | — |
| Filmboss (IA Boss + IA Skills Upscale) | 52 | 21h20m | 20 `.md`, ~31k palavras |
| Dark Room — Método Lives (turma BLACK) | 3 | 5h49m | — |
| ComfyUI — Local TTS (avulso) | 1 | 0h06m | — |
| **Total** | **160** | **41h05m** | |

**Pipeline usado:** `services/ETL/Transform/course-etl.js` — Whisper local (modelo
`base`), extração de frames dirigida por análise do transcript, dossiê markdown por
aula. 29.367 segmentos e 904 frames, zero falhas, processado em 10h50m (3,3x realtime).

**Saída:** `services/ETL/outputs/courses/{ai-image-creator-pro,filmboss,dark-room-metodo-lives,comfyui-tts}/`

> **Os números acima são do ETL, não do conteúdo.** Uma verificação em 2026-08-30
> encontrou **15 pares de aulas duplicadas** no AI Image Creator PRO — o Módulo 14 é uma
> remontagem de outros módulos. O corpus tem **145 aulas únicas**, não 160. Ver §5.

> **Sobre o corpus adicionado em 2026-08-28.** As 3 aulas do Dark Room (60 frames) e a
> aula avulsa de TTS (4 frames) foram transcritas com o mesmo pipeline e o mesmo modelo
> `base`. A qualidade da transcrição, porém, é **muito inferior** à dos dois primeiros
> cursos: são lives ao vivo, com ruído de fundo, gíria pesada, áudio de chat e — na aula
> de TTS — locução em inglês transcrita como se fosse português. Trecho mal transcrito
> foi tratado como **indício, não como fato**, e cada item minerado carrega um campo
> `confianca`. Onde a degradação impediu conclusão, isso está dito, não preenchido.

> ### ⚠️ Este corpus é a ÚNICA cópia
>
> Os arquivos `.mp4` de origem dos dois cursos foram **excluídos em 2026-08-27**,
> depois de verificado que toda aula tinha dossiê e frames em disco. O que restou
> aqui — transcrição, frames e os materiais escritos do Filmboss — é tudo o que
> existe do conteúdo.
>
> **Consequência prática:** não é mais possível extrair frames novos de uma aula.
> A cobertura visual está congelada em ~6 frames por aula (904 no total). Se uma
> frente de mineração futura precisar de mais imagem de um módulo específico, o
> caminho é rebaixar a expectativa para o que o transcript descreve, ou readquirir
> o curso.
>
> Não apagar `services/ETL/outputs/courses/` sem backup.

**Escolha do modelo:** `tiny` foi descartado no benchmark por corromper justamente o
que interessa — devolveu "AI e Medcorator" para "AI Image Creator". O `base` acerta
nomes de ferramenta a 3,4x realtime; `small` custaria 28h para ganho marginal na prosa.

---

## 2. O que mudou no squad

### 2.1 `data/model-routing.yaml` — rota de upscale deixou de ser um vazio

**Antes:** `upscale_finishing` marcado `status: a_validar` com a nota "o repositório
NÃO tem upscaler de acabamento" e a instrução de não prometer alta resolução a cliente.

**Depois:** rota completa em três níveis.

| Nível | Ferramenta | Razão |
|---|---|---|
| Preferido | **Nano Banana Pro / 2** | Mesmo modelo que já gerou a imagem (sem troca de plataforma), custo de uma geração comum, e inteligência de contexto |
| Alternativa | **Magnific AI / Lupa AI** | Upscalers dedicados. Mais caros nos dois eixos (mensalidade + geração), exigem config manual e 1–3 tentativas |
| Vídeo | **Topaz** | Problema diferente do de imagem; tem módulo próprio |

**Duas armadilhas incorporadas:**
- *Entrada ruim vira detalhe inventado.* Quanto pior a origem, menos consistente a
  saída — o modelo precisa inventar o que não existe. Fica mais nítido e mais errado
  ao mesmo tempo. Quando a identidade do personagem importa, **regerar em alta vence
  upscalar material fraco**.
- *Upscale não conserta composição.* Só nas imagens finais já selecionadas.

**Técnica incorporada:** com figura pública, lugar ou época reconhecíveis, incluir um
parágrafo de contexto no prompt (quem, que época, que data, que idade) — é o que
ancora as referências certas em vez de deixar o modelo inventar.

*Fonte: Filmboss · IA Skills Upscale, aulas 02 e 03.*

### 2.2 `data/camera-moves.yaml` (novo) — vocabulário controlado de 36 movimentos

Cada movimento com: `prompt_en` (o termo literal que vai no prompt), `faz` (efeito
narrativo), `usar_quando`, `risco_ia` e `custo` em tentativas esperadas.

**Cinco princípios estruturais:**
- **Trajetória, não substantivo.** "Dolly in" é ambíguo; posição inicial + direção +
  velocidade + relação com o sujeito + enquadramento final não é.
- **Movimento revela.** Conectar aproximação a revelação visual em vez de dizer "zoom in".
- **Não proibir o que se quer.** O negative prompt padrão contém `dolly, pan, tilt`.
  Se o plano pede dolly, o termo precisa sair do negativo — senão o modelo recebe
  ordem contraditória e devolve câmera parada ou tremida.
- **Positivo vence negativo** para travar câmera estática.
- **Um movimento por take.** Movimentos compostos têm taxa de erro alta; decompor em
  dois takes sai mais barato que gastar 6 gerações.

**Padrões por pipeline**, sendo o mais contraintuitivo o do P2: em UGC, **movimento
sofisticado denuncia que não é UGC real** — handheld e estático vendem mais. E o
`static` foi documentado como a escolha mais subestimada em I2V: sem movimento de
câmera, todo o orçamento de coerência do modelo vai para o sujeito.

*Fonte: Filmboss · IA Boss Módulo 04, "Lista dos Principais movimentos" (36 itens),
cruzado com os presets VEO 3 e Kling 2.1.*

### 2.3 `data/prompt-architectures.yaml` (novo) — estrutura de prompt por ferramenta

Cinco ferramentas com ordem de leitura própria: **Veo 3**, **Kling 2.1**,
**Midjourney**, **Flux Kontext** e **Nano Banana**. O mesmo conteúdo na ordem errada
produz resultado errado.

**A distinção que mais importa para o squad — Flux Kontext vs. ChatGPT:**

| | Comportamento |
|---|---|
| ChatGPT | **Recria 100%** da imagem tentando imitar a referência. Altera traço facial, muda posição de mão e dedo, modifica tom de pele, perde detalhe sutil |
| Flux Kontext | **Preserva tudo** e altera só o solicitado. É um Photoshop operado por linguagem natural |

Quando a identidade precisa sobreviver — personagem de série, creator sintético de
UGC, produto com logo — a rota é Flux Kontext. **Esta é a razão técnica de o
`character-lead` existir**, e agora está escrita.

**Seis princípios transversais**, dos quais dois viraram regra dura do Pacote de Direção:
- *Degradação por iteração* — editar sucessivamente sobre a última saída degrada de
  forma visível a partir da 3ª ou 4ª rodada. O campo `insumos[]` deve apontar sempre
  a **imagem-âncora original**, nunca a última derivada.
- *Lote antes de gerar* — escrever a lista completa de variações antes de gerar. É
  exatamente o que os campos `quantas_variacoes` + `criterio_de_escolha` já forçavam;
  agora tem justificativa registrada.

**Workflow de consistência** (Módulo 03) confirmou a ordem que o squad já tinha —
roteiro → planejamento de cenas → referências → frame perfeito → consistência — e
mapeia 1:1 nos nossos estágios `script → decupagem → research → stills → character`.
A lição central, que vale citar inteira: *"o processo é mais importante que o prompt
individual"*. Um prompt excelente na ordem errada produz peça incoerente; um prompt
mediano dentro do workflow certo produz peça vendável. É a justificativa de existir
do `film-director` e do `exec-producer`.

### 2.4 `data/brand-film-playbook.yaml` (novo) — o P1 desmontado

Uma campanha publicitária real desmontada passo a passo. É o pipeline mais caro do
squad e o mais fácil de estourar orçamento; este arquivo existe para a equipe não
descobrir na terceira campanha o que já se sabia antes da primeira.

**O achado que mais muda orçamento.** A campanha de referência inteira custou **15
frames únicos para 7 cenas**. E o motivo é estrutural: campanha publicitária tem
frames muito repetidos — **duas imagens-base (uma aberta e uma fechada) resolvem
70–80% das cenas**, o resto são variações de ângulo e movimento.

> Consequência direta: o `exec-producer` **não deve orçar uma geração por cena**.
> Deve orçar 2 frames-base caros e bem-feitos + N variações baratas. Errar isso
> infla a estimativa em 3–4x e faz um job viável parecer inviável.

**A regra de ouro da consistência facial** — vale para P1, P2 e P3:

> Crie **sempre primeiro a versão com o rosto de frente**, olhando para a câmera.
> A partir de uma frontal a IA gera perfil, três-quartos e outros ângulos mantendo o
> rosto. O caminho inverso **não funciona**: partindo de um perfil, a IA cria um rosto
> *diferente*, porque não tem informação do lado que nunca apareceu — então inventa.

Isso virou requisito de reference sheet do `character-lead`, com reprovação no
`gate-character.md`. O frame-base frontal existe para alimentar as variações, mesmo
que nenhum plano do roteiro seja frontal e ele nunca entre no corte.

**Uma limitação real, testada em três plataformas:** IA **não muda lente**. Pedir
grande-angular fez o Nano Banana apenas afastar a câmera, o Flux Kontext não alterar
nada e o Midjourney aplicar olho-de-peixe. Conclusão prática: lente é decisão do
frame-base, especificada na geração original — não é editável depois. Economiza
gerações desperdiçadas.

**Quatro armadilhas de linguagem**, todas com caso real:

| Pediu | A IA entendeu | Solução |
|---|---|---|
| "close no MacBook" | **Fechar** o MacBook — deletou o objeto da cena | "super close-up nas costas de metal, com ela em segundo plano" |
| "em plano desfocado" | Desfoque excessivo, apagou o sujeito | "em segundo plano" |
| "não está sorrindo" | Ignorou a negativa, continuou sorrindo | "boca fechada mas com um sorrisinho" |
| Objeto que o modelo não conhece | Trocou por outro objeto parecido | Gerar com substituto reconhecível e trocar por edição dirigida |

A terceira confirma, no rosto, o mesmo princípio que já tínhamos em câmera:
**instrução negativa quase nunca funciona; descreva positivamente o estado desejado.**

**Uma exceção que corrige uma regra nossa.** Tínhamos "prompt sempre em inglês". O
correto é: **inglês na geração** (Midjourney, Veo, Kling), **português na edição**
(Nano Banana, Flux Kontext, Seedream) — essas entendem português perfeitamente, e o
operador escreve mais rápido e com mais precisão na própria língua.

**Escolha de modelo de vídeo vira regra de decisão, não preferência:**

| | Kling 2.1 Professional | Kling 2.5 Turbo |
|---|---|---|
| Frames | Start **+ End** | Só Start |
| Créditos | 35 / 5s | 25 / 5s |
| Movimento | Mais previsível | Mais natural |

A pergunta do `motion-lead` não é "qual é melhor", é **"este plano precisa de frame
final travado?"**. Se sim, 2.1. Se não, 2.5 e economize — foi ~30% de crédito na
campanha de referência, com as duas entregando resultado utilizável.

**Um ajuste no desenho do card humano:** cada geração de vídeo leva 2–3 min e não se
deve esperar uma terminar para começar a próxima. Portanto o card de `takes` precisa
entregar **todos os prompts do lote de uma vez**, para o operador enfileirar — não um
por vez, como estava implícito.

**Níveis de produção** (profissional / intermediário / iniciante) entraram como
primeira pergunta do `brief-strategist`: muita técnica deste playbook só se paga no
nível profissional. Aplicar conferência frame a frame num sketch de nicho é queimar
tempo do founder.

*Fonte: Filmboss · IA Boss, Projeto Prático Apple (10 aulas + 2 materiais escritos).*

### 2.5 `data/lives-niches-playbook.yaml` (novo) — o formato de transmissão contínua, separado do que nele não presta

Mineração das aulas 2 (esportes) e 3 (músicas) do curso **Dark Room — Método Lives**,
somada ao que já havia sido extraído da aula 1 (novelas). O formato descrito ali não
existe em nenhum pipeline do squad: **um arquivo curto rodando em loop dentro do OBS,
transmitido como live contínua**. O P5 dark-room é episódico; isto é canal no ar.

> ### ⚠️ Este arquivo tem duas listas por nicho, e a segunda é o ativo
>
> Cada nicho está partido em `aproveitavel` e `recusado`. A lista de recusados não
> é higiene documental — é a única defesa contra reintrodução silenciosa. A aula 1
> teve dois itens recusados por decisão do founder (título-isca com marca de emissora;
> editar a live no YouTube Studio para esconder as horas antes da revisão de
> monetização). **Na aula 2 os dois voltaram em versão mais branda** — *"mas trocar o
> título é tranquilo, pô, é só trocar o título"* — e na aula 3 já aparecem como rotina
> consolidada: *"é só trocar igual das novelas, igual de sports"*.
>
> Sem o registro, a versão branda passa como conveniência operacional.

**O padrão que atravessa os três nichos** e que foi nomeado no arquivo como
`engenharia do artefato de revisão`: depois que a live termina, trocar título e
thumbnail e cortar a gravação, de modo que quem revisa o pedido de monetização veja
um objeto diferente do que foi transmitido. A frase da aula 1 é literal — *"eles não
vão ver as 12 horas de live... eles vão ver só o resumo"*. Não depende de a regra da
plataforma mudar: o problema é a intenção de que o avaliador julgue outra coisa.
O `fact-checker` passa a bloquear entrega em que título e thumbnail publicados não
descrevam o que a peça contém — a mesma regra que já vale para thumbnail no P5,
estendida à fase pós-publicação.

**Esportes — a hipótese estava certa, e com margem.** O núcleo é transmitir um
**painel de estatísticas montado ao vivo** (placar, escalações, estatísticas), não a
partida. A aula gasta dez minutos condenando quem retransmite o jogo, com o argumento
correto: sem direito de transmissão, é strike. O que a hipótese não previa é a segunda
variante — jogar a partida no videogame e transmitir a gameplay própria em loop com o
placar real sobreposto. As duas compartilham o mesmo setup de OBS.

O que sobreviveu à auditoria e para onde vai:

| Aproveitável | Para que serve aqui |
|---|---|
| Painel de dados ao vivo como conteúdo original | Gênero novo `live-stats-panel` no catálogo; é o formato mais próximo de virar oferta vendável (painel de evento, de lançamento, de campanha) |
| Arquitetura cena/fonte do OBS com captura de janela recortada | Receita operacional completa para o `editor` montar qualquer transmissão contínua — o único item das três aulas sem nenhuma ressalva |
| Loop de reação sem rosto (um cachorro em loop no canto) | Resolve para o P5 um problema que o `craft-references.yaml` nomeia e não resolve: presença sem expor rosto. Vira item de `assinatura_substituta` |
| Som ambiente no lugar de trilha | Regra do `sound-designer`: em peça longa, leito ambiente elimina Content ID e custo de licença de uma vez |
| Seleção pelo calendário do EVENTO, não do estúdio | Inverte a ordem do briefing no `research-scout` para qualquer peça atrelada a acontecimento |
| Geografia como variável de orçamento | O mesmo formato vale ~10x mais nos EUA que na Europa/Ásia. O `*budget` do `exec-producer` não tem esse eixo hoje |

E o que ficou de fora, com o motivo: pegar trecho de jogo do YouTube e *"espelhar,
dividir, aplicar filtro"* para não acusar duplicado (trata o detector como se fosse o
titular); título de *"full match stream"* em transmissão que não é a partida (o
espectador clica para ver o jogo e recebe uma tabela); notícia inventada como
clickbait de aquecimento — ele redige um conflito entre dois clubes ao vivo e admite
*"eu inventei isso daqui, mano"*; painel de odds de casa de apostas embutido, tratado
como bônus (*"até bom que você tá fazendo propaganda pra bet"*), sem contrato, sem
verificação de idade e sem os avisos que a regulação brasileira exige; e navegador
antidetect para impedir que strike em um canal alcance os outros — separar perfis é
higiene, impedir a plataforma de correlacionar contas do mesmo operador não é.

**Uma distinção que a aula não faz e o squad precisa fazer:** o dado é fato e fato não
tem direito autoral, mas **a interface que exibe o dado é obra protegida**. Capturar a
janela do provedor de placar transmite o layout, a marca e a base de dados de terceiro.
A saída é renderizar painel próprio a partir de API licenciada — mais trabalho, e que
converte o problema em design de produto, onde o squad tem vantagem. É o bloqueio
declarado para o `live-stats-panel` sair do backlog.

**Músicas — o nicho de titular mais agressivo que existe, e o método foi desenhado ao
redor disso.** Resposta direta à pergunta de direitos: **o método NÃO depende de
fonograma de terceiro**. A aula abre mostrando que subir faixa de artista derruba o
canal e constrói tudo em cima de gerar as próprias faixas no Suno, com letra escrita
por LLM. Não há sample, cover nem regravação. Essa parte é tecnicamente sólida.

As ressalvas que a aula não faz, e que ficaram registradas: a titularidade vem dos
**termos de uso de uma empresa privada**, não de lei — *"a música é literalmente sua"*
é condição contratual revisável, não propriedade estável; obra puramente gerada tem
proteção autoral contestada em várias jurisdições, o que pode tornar impossível
*defender* a faixa; nada impede que uma faixa gerada dispare correspondência de
Content ID por semelhança; e distribuidoras para Spotify têm política própria sobre
conteúdo de IA, frequentemente restritiva.

O que inviabiliza a operação **não são os direitos da música — é a camada de captação**:
clickbait com nome de artista real (*"colocar a Lady... Bieber, Rihanna, Taylor Swift,
só para captar essa audiência"*), promessa de efeito fisiológico no título (*"batidas de
60 Hz para ativar sua mente"*, *"liberar o hormônio da tranquilidade"*, *"resolver seu
estresse em 7 minutos"*, com instrução de usar números quebrados para soar específico),
e a recusa deliberada de marcar a declaração de conteúdo gerado por IA — *"eu gosto de
colocar não, porque eu sinto que entrega mais"*. Para um squad cuja produção é toda
gerada, esta última é inegociável.

**Três achados de músicas que entram no squad hoje, independentemente do formato:**

- **Prompt de Suno em dois artefatos** — letra completa + prompt de estilo de até ~200
  caracteres, colados em campos distintos. Fecha um vazio real no
  `prompt-architectures.yaml`, cujas cinco ferramentas mapeadas são todas de imagem e
  vídeo. Nenhuma é de áudio.
- **O Suno devolve duas variantes da mesma letra**, com ritmo e arranjo diferentes.
  É o `quantas_variacoes` + `criterio_de_escolha` do squad entregue de graça, com a
  decisão ficando humana e por escuta — exatamente como a regra de ouro exige.
- **Ambiência é MAIS difícil que canção.** Ele tenta gerar chuva e rio ao vivo, falha
  três vezes seguidas e admite *"ficou ruim"*. Vira regra de roteamento do
  `sound-designer`: para SFX e ambiência, acervo primeiro; gerador de música só para
  faixa com estrutura. Reforça, com evidência de campo, a nota do
  `local-generation-stack.yaml` sobre montar banco próprio de SFX em vez de gerar por take.

**Novelas — reconfirmado o que já havia sido decidido**, com um item novo na lista de
recusados: *"aplicar edição"* (espelhar, filtrar, cortar) sobre imagem de terceiro para
não acusar conteúdo duplicado. É a mesma confusão que reaparece em esportes — contorna
o detector, não o titular. O que sobra de aproveitável ali é sobretudo a **política de
lote** (uma sessão de produção no fim de semana alimenta 6–7 peças), que vira regra de
cadência do `exec-producer` no P5, hoje orçado episódio a episódio.

**Recomendação de qual atacar primeiro: esportes.** É o único cujo núcleo permanece
inteiro depois de remover tudo o que está na lista de recusados — tira-se o título de
"full match", a notícia inventada, o painel de apostas e a edição pós-live, e ainda
resta um produto completo: composição própria sobre dado público, sem narração, sem
trilha, sem rosto e sem material de terceiro no vídeo. Nos outros dois o que sobra é
menos: em músicas some a camada de captação que o próprio autor considera decisiva
(*"o mais difícil é captar a audiência"*); em novelas some a base visual inteira.

**Onde a transcrição não permitiu concluir** (Whisper `base` sobre live com ruído,
gíria e áudio de fundo): configuração de encoder/bitrate do OBS — ele delega a
"pesquise conforme seu PC" e não mostra valores; o cronômetro da cena de esportes —
o recurso falha ao vivo e a demonstração não acontece; o nome exato do período inicial
sem distribuição — a palavra vem corrompida em todas as ocorrências ("chão doban",
"aldoban", "cheio do Banço"), só o conceito é legível pelo contexto; a configuração da
VPS, adiada para uma aula que não está neste corpus; e os números de receita, cuja
aritmética ao vivo é inconsistente — só a ordem de grandeza sobrevive.

*Fonte: Dark Room · Método Lives, aulas 1 (novelas), 2 (esportes) e 3 (músicas).*

### 2.6 ComfyUI Local TTS — uma técnica de arquitetura, nenhum motor novo

Aula avulsa de 6 minutos sobre três nós de TTS local no ComfyUI. **Os três motores que
ela apresenta já estavam avaliados e rejeitados** no `local-generation-stack.yaml`:
XTTS (licença CPML, não-comercial), Kokoro (Apache 2.0 mas PT-BR fraco) e MeloTTS (MIT
mas sem português). Nada a acrescentar ali em matéria de motor.

O que a aula tem de novo é **arquitetural, e vale independentemente do motor**:

> **O nó como ponte para um venv dedicado.** Em vez de instalar o TTS dentro do
> ambiente Python do ComfyUI, o nó chama um **interpretador de um virtualenv separado**,
> passando o texto e recebendo o arquivo de áudio de volta. O motivo declarado é
> concreto: sistemas de TTS trazem versões de torch e de bibliotecas de áudio
> conflitantes, e misturá-los com o ComfyUI quebra a instalação.

Isso é diretamente relevante para a lacuna nº 1 do `local-generation-stack.yaml`
(narração/TTS), que hoje prevê instalar o `TTS-Audio-Suite` dentro do ComfyUI e testar
Chatterbox 23L contra F5-TTS lado a lado. O padrão de ponte é o **plano B se a
instalação direta conflitar** com o que já roda na máquina — e a máquina do founder já
tem GGUF, RIFE e o wrapper do Wan disputando dependências. Vale registrar antes de
descobrir na hora.

> **Não incorporado ao `local-generation-stack.yaml`** porque este arquivo não é o
> dono daquele. Fica aqui como recomendação para o `sound-designer` quando a lacuna
> de TTS for atacada. Os campos que a técnica exigiria no nó — caminho do script,
> caminho do interpretador Python, pasta de saída — estão na aula.

A aula também esboça, sem detalhar, uma orquestração por cena em que um LLM decide,
para cada cena, o que é narrado, que tipo de imagem é criada e **se aquela cena precisa
de vídeo ou apenas de um frame estático** — juntando tudo só no fim. É a mesma
economia do `brand-film-playbook.yaml` §2.4 (duas imagens-base resolvem 70–80% das
cenas), chegando por outro caminho: decidir *por cena* se ela justifica movimento é o
que impede orçar uma geração de vídeo por cena.

*Fonte: aula avulsa "Generate Voices inside ComfyUI — Local TTS" (6min). Transcrição
muito degradada — o Whisper `base` transcreveu áudio em inglês como se fosse português,
e o trecho final vira ruído repetitivo ("cieno frango") por cerca de dois minutos. Os
dois achados acima estão nos primeiros 3min30, que saíram legíveis.*


### 2.7 `data/imagem-refino-playbook.yaml` (novo) — o que acontece depois da primeira geração

Mineração das aulas de **imagem** dos dois cursos: AI Image Creator PRO módulos 02, 03,
06, 09, 10, 11, 13 e 14, mais as aulas de imagem e de upscale do Filmboss. Fecha o vazio
entre dois arquivos que já existiam: o `prompt-architectures.yaml` dizia como escrever o
prompt e o `brand-film-playbook.yaml` dizia como decupar uma campanha em frames — nenhum
dos dois dizia o que fazer com a imagem **depois que ela sai da máquina e antes de virar
entrega**. Refino, correção de anomalia, upscale e acabamento manual não estavam escritos
em lugar nenhum do squad.

**A cadeia canônica tem oito estágios**, e o valor de escrevê-la é o campo `se_pular` de
cada um: pular estágio não economiza trabalho, empurra o trabalho para onde ele custa
mais. Discovery → prompt em escada → geração em lote → refino → correção de anomalia →
upscale → composição manual → entrega. Os dois cursos convergem nisso vindo de lugares
diferentes: o AI Image Creator declara três etapas (Discovery, Create, Refinamento) e o
Filmboss chega ao mesmo lugar pelo fluxo de upscale.

**A hipótese que o founder trouxe foi confirmada em quatro dos cinco elos, e corrigida
em dois pontos que mudam método:**

| Elo da hipótese | Veredito |
|---|---|
| Prompt bem estudado, não improvisado | Confirmado, **mas** "estudado" não é "escrito de uma vez": o método é **começar com uma frase e enriquecer em 5–6 rodadas**, lendo o retorno a cada passo |
| Refino obrigatório, com ferramentas nativas do Midjourney | Confirmado como **etapa**, e reenquadrado: não é uma ferramenta, são **seis finalidades** que por acaso moram no mesmo menu. E **moodboard não é refino** — é trava de estilo aplicada antes de gerar |
| Anomalias: texto, dedos, pernas | Confirmado, **com causa raiz encontrada** — ver abaixo |
| Upscale praticamente obrigatório | **Parcialmente correto.** O gatilho é o destino, não o hábito |
| Photoshop manual para peças exigentes | Confirmado **e ampliado** — ver abaixo |

**O achado que unifica o catálogo de anomalias: orçamento de pixel.** O corpus diz a
mesma coisa três vezes, em contextos diferentes, sem perceber que está dizendo a mesma
coisa. Sobre rosto: *"essas opções em que o rosto fica muito pequeno em relação à imagem
toda acabam tendo aberrações; é importante que o rosto tenha uma área maior, para ele ter
mais pixels para trabalhar"*. Sobre uma letra que saiu errada num controle: *"como é um
objeto, essa região aqui é uma parte pequena, a parte da imagem também tem poucos pixels
para a IA trabalhar"*. E na correção de mão pelo canvas do Ideogram: *"como o que a gente
quer alterar é pequeno, ele vai acabar gerando com uma resolução mais baixa"* — por isso a
instrução de **apertar o quadro em torno da seleção antes de gerar**.

> Texto errado, dedo a mais e perna deformada são **três sintomas de uma causa só**. A
> consequência de método é direta: corrigir anomalia não é "pedir de novo", é **regerar a
> região com mais pixels** — recortar, gerar ali em resolução própria, recompor. E na
> prevenção: o que precisa estar certo tem que ocupar área no quadro.
>
> Isso também valida, por baixo, o limiar que o `gate-stills` já usava por intuição no
> `STL-B-07` — exigir contagem de dedos quando rosto ou mão ocupam mais de ¼ do quadro.
> Abaixo disso o defeito costuma ser invisível, e caçá-lo é desperdício.

**Dois detalhes de inpaint que não são óbvios e mudam a taxa de acerto.** Ao mascarar uma
mão, **deixar dentro da seleção um dedo que está correto** — *"o dedo é um guia
praticamente, para também definir proporções"*. Selecionar só a área errada tira do modelo
a única referência de escala que ele tinha. E o prompt: no Midjourney, **não escrever
nada** (testado na aula — manter o prompt original dá mais certo); em ferramenta de canvas,
prompt curto **que descreve a interação**, não o objeto — pedir "dedos" devolveu lixo,
pedir "segurando o cartão" devolveu mão utilizável.

**Texto na imagem — a única rota que funciona, e ela inverte o problema.** Nenhum dos
cursos ensina a fazer o gerador escrever certo, porque não dá. O que o Filmboss ensina é
partir de uma **imagem de lettering real** (o professor mantém uma pasta de referências) e
pedir a um modelo de edição apenas *"mude o texto para X"* — a estrutura tipográfica, o
material e a iluminação vêm da referência, o modelo só troca as letras. Limites medidos na
aula: as letras da referência precisam estar legíveis; palavra curta funciona e palavra
longa falha (4 letras acertou, o nome maior no mesmo lettering falhou); e trocar **uma**
palavra de uma frase é mais confiável que trocar tudo. Isso **confirma e não substitui** o
`IL-PD-04` e o `STL-A-10`: texto que precisa ser legível continua não sendo pedido ao
gerador. A rota do lettering é para tipografia **expressiva** (letreiro 3D, título de
peça), não para headline nem para rótulo de produto.

**O maior achado da frente, e ele não estava na hipótese: o produto real não é gerado, é
colado.** O estúdio do curso gera a cena com um **produto de marcação** — um frasco
parecido, só para fixar posição, escala e como a luz incide — e substitui pelo PNG real do
cliente no Photoshop. A consequência inverte a direção do prompt: *"a nossa imagem gerada
tem que ter o produto reto e de frente. Se a gente tentar fazer alguma lateral ou outra
posição do produto, isso aqui não vai encaixar"*.

> Em peça com produto real, **o ângulo da cena deriva da foto-âncora que existe**, e a
> foto-âncora é pedida ao cliente **antes** de escrever qualquer prompt. O `IL-PD-05` do
> `gate-image-lab` já exige âncora de fidelidade; falta exigir que o **ângulo** derive
> dela. E o checkpoint do cliente fica **antes** da composição manual, não depois — é a
> diferença entre descartar 40 minutos de geração e descartar 4 horas de Photoshop.

**Upscale: os dois cursos se contradizem, e a contradição é útil.** O AI Image Creator faz
3 a 4 passadas por imagem finalizada, sempre. O Filmboss diz *"em 90, 95% dos casos não
precisa fazer"*. Não é desacordo — é **destino diferente**: um produz peça final de
imagem, o outro produz frame que vira vídeo. A regra que reconcilia: **o destino decide**.
Peça que será vista como imagem → etapa fixa. Frame consumido por modelo de vídeo → só se
reprovar na inspeção. Previz → nunca.

Três coisas sobre upscale que não estavam registradas:

- **Upscale tem duas funções e elas costumam ser confundidas.** Resolução *e* **textura**.
  A segunda é o que tira a cara de plástico — vale rodar mesmo quando a resolução já
  bastava. Casa com o princípio do Filmboss de que *"a palavra é imperfeição"*: o que
  denuncia IA não é falta de resolução, é pele lisa demais.
- **Não se escolhe um upscale — levam-se dois ou mais ao Photoshop e compõe-se.** *"Às
  vezes a textura da pele ficou melhor em uma e o background ficou melhor em outra."* É a
  mesma lógica da escada de força do img2img (0.3 / 0.6 / 0.8): a decisão final é de
  **composição**, não de seleção.
- **Mudar o aspect ratio durante o upscale destrói a fidelidade.** O modelo reacomoda a
  cena no novo quadro — pessoa alonga, cenário estica. Se o objetivo é a mesma imagem em
  alta, manter o formato da referência.

**Uma armadilha de ordem que custa o upscale duas vezes:** o modelo de reiluminação
**derruba a resolução** (*"ele faz um downscale, trabalha na imagem, tenta compensar, mas
perde muito da nitidez"*). Relight vem **antes** do upscale. Quem inverte, paga duas vezes.

**Edição manual — o que só se resolve na mão, e o truque mais valioso da seção.** A
"help layer": uma camada de saturação zerada em modo *color*, ligada por cima de tudo, só
para **enxergar a cena em preto e branco**. É diagnóstico, não efeito — serve para
descobrir de onde vem a luz e comparar a faixa tonal do elemento inserido com a da cena.
É a resposta para *"por que essa colagem parece colagem"* quando ninguém sabe dizer o
motivo, porque em preto e branco o descasamento de luminância fica óbvio e a cor engana.

E o que é **desperdício** fazer na mão ficou registrado com o mesmo cuidado: limpeza de
sujeira e remoção de elemento pequeno (preenchimento generativo resolve em um clique — e
**sem prompt nenhum**, que é o detalhe que quase todo mundo erra); reconstruir fundo ou
criar céu (é extensão de quadro, não pintura); e **retoque de pele para "melhorar"**, que
inverte o objetivo — o trabalho moderno é *adicionar* imperfeição, não remover.

**Um item novo para o `gate-image-lab`:** anomalia de **iluminação incoerente após
edição**. Ao trocar o cenário por edição, a luz do sujeito continua sendo a do cenário
antigo — o caso da aula é uma personagem que foi para uma estação de metrô com a luz de
sol da rua ainda batendo nela e na bolsa. O gate hoje cobre reflexo incoerente
(`IL-PD-07`), mas não direção de luz depois de edição. E o critério que o curso extrai
vale como regra: *"quando a mudança for muito drástica, talvez seja melhor alterar o
prompt e fazer a imagem de novo"* — existe um ponto em que editar sai mais caro que
regerar, e **ele é definido pela luz, não pelo tamanho da área editada**.

**Parâmetros reais do Midjourney** ficaram registrados no arquivo (stylize 200–300 para
comercial realista; modo raw sempre, porque dá mais controle na pós; variety como
ferramenta de *busca de caminho*, não de acabamento). São **ferramenta específica, não
método** — estão marcados como tal, e três deles com `confianca: media` ou `baixa`, porque
o Whisper `base` corrompeu os nomes ("verite", "wordiness", "repente" para inpaint) e os
`.mp4` de origem já não existem para conferir.

*Fonte: AI Image Creator PRO — módulos 02 (A002, A003), 03 (A005–A009, A012, A013), 06
(A029, A030), 09 (A039–A041), 10 (A042, A043, A047), 11 (A054), 13 (A067, A076) e 14
(A085, A088, A098); Filmboss — IA Skills Upscale (aulas 01–03) e IA Boss ("O fator que
deixa uma imagem realista", "Transformar texto em estilos diferentes").*


### 2.8 A segunda rodada — Módulo 05 do IA Boss, `Banco de Prompt.md` e os módulos fechados do AI Image Creator

Segunda passada sobre os dois maiores cursos do corpus, executada em 2026-08-30 com o
mapa da §5 como lista de trabalho. Fechou o maior bloco pendente do Filmboss (Módulo 05),
o material escrito de maior peso (`Banco de Prompt.md`), quatro módulos inteiros do AI
Image Creator (04, 05, 07 e 12) e o bloco bônus (15). Estendeu quatro arquivos e não criou
nenhum — o assunto coube nos que já existiam.

**A lacuna declarada foi fechada: o `prompt-architectures.yaml` agora tem uma ferramenta
de áudio.** O `SUNO PROMPT ARCHITECT.md` (1.953 palavras) virou a sexta arquitetura do
arquivo, com 19 campos ordenados, faixas de BPM por gênero, paletas de instrumentação,
sete presets de produção e quatro níveis de pedido. O achado que mais surpreende: **o Suno
tem um campo `Avoid:` de primeira classe, e ele funciona.** A regra do squad "instrução
negativa quase nunca funciona" é uma regra de *imagem*; em áudio ela se inverte. Isso está
registrado como princípio transversal, porque é o tipo de coisa que faz um agente portar
método errado de um domínio para o outro.

Fica uma divergência aberta e honesta: o corpus do Dark Room afirma que o campo de estilo
do Suno tem limite de ~200 caracteres; o preset do Filmboss produz um campo de 600 a 900
sem mencionar limite. É diferença de interface, não de método — o `sound-designer` confere
na conta do estúdio antes da primeira trilha, e a ordem de poda já está escrita (mix e
master saem primeiro; gênero e mood ficam por último).

---

**O `Banco de Prompt.md` não vale pelos prompts — vale pela medição.** São 51 prompts de
Midjourney, e o arquivo abre avisando que *sem as imagens de referência eles não
reproduzem as imagens*. Copiá-los é exatamente o erro que o banco previne. O que foi
extraído é a **gramática medida**, feita aqui e não afirmada pelo curso:

| | |
|---|---:|
| Mediana de palavras | **99** (mín. 53, máx. 151) |
| Descrevem a LUZ | **50 de 51** |
| Descrevem textura | 35 de 51 |
| Declaram o fundo | 31 de 51 |
| Nomeiam lente | 20 de 51 — e só **50mm, 85mm e 35mm** |
| Nomeiam câmera ou filme | 4 de 51 |
| Usam flag de parâmetro (`--ar`, `--s`, `--v`) | **0 de 51** |
| Contêm palavra negativa | **1 de 51** |

Três consequências. A primeira: **o prompt profissional é menor do que a intuição sugere**
— ~100 palavras, não 300. Isso corrige para cima a armadilha que o `model-routing`
registrava ("acima de ~60 palavras o modelo ignora o fim"): o teto útil está mais perto de
100, desde que não haja repetição. A segunda: **luz é o único bloco praticamente
obrigatório** — prompt do squad que não descreve a luz está incompleto, por mais detalhado
que seja o sujeito. A terceira: **nomear câmera e filme é decoração**; lente é decisão, e
só três valores importam.

O zero absoluto de flags fecha, com três fontes independentes, o princípio
`parametro_mora_na_interface`: formato, versão e estilização são controles de tela, não
texto de prompt. O card humano passa a trazer dois blocos separados.

---

**O Midjourney não é uma fórmula de texto — é um sistema de três referências.** Esta é a
correção mais consequente da rodada, porque a entrada anterior do
`prompt-architectures.yaml` tratava a ferramenta como prosa. O professor é categórico:
*"a maioria das minhas criações eu não uso só o prompt"*.

| Slot | Controla |
|---|---|
| **Image Prompt** | Posição, enquadramento, composição, ação |
| **Style Reference** | Grão, nitidez, traço — e sobretudo **paleta e gradação de cor** |
| **Omni Reference** | Traço facial, com intensidade regulável |

E o uso mais consequente do Style Reference **não é estilo, é cor**: um frame de um filme
cuja gradação se admira faz o lote inteiro sair já colorizado. *"Você não vai precisar
fazer uma edição e colorir na pós."* O caso de uso que interessa direto ao squad é vídeo
híbrido — exportar um frame do material **real já colorizado** e usá-lo como Style
Reference nas gerações faz a costura entre footage e IA desaparecer.

---

**Uma armadilha nova, e ela explica horas de retrabalho: a referência também é prompt.**
O professor pede um moletom que cubra o tronco; o modelo insiste em baixar a malha para
mostrar um top branco. Ele corrige o *texto* duas vezes e o defeito continua. Só resolve
quando **remove a Image Prompt** — a foto de referência tinha um top branco por baixo.

> Diante de uma instrução ignorada duas vezes: reler o prompt procurando contradição; se
> não houver, **suspender a referência de imagem** e regerar. Se resolver, a culpada era a
> referência — e o que precisa mudar é ela, não o texto.

---

**Expressão facial não se resolve na imagem.** O still de personagem deve sair com
expressão **neutra**; a emoção é dirigida na geração de vídeo, descrevendo a **transição**
(neutro → sorriso, neutro → tristeza), não o estado final. A razão é de direção, não de
ferramenta: *"essa transição de uma expressão normal para o sorriso é que vai provocar
quem está assistindo"* — e o professor diz que dirige atores reais do mesmo jeito.

Isso corrige uma tentação real do estágio `stills`: pedir o frame já com a emoção da cena
queima a única alavanca dramática que o I2V tem, **e ainda produz uma âncora pior**. Junto
com a regra de ouro do `brand-film-playbook`, o requisito de reference sheet fica completo:
a âncora é **frontal e neutra**.

---

**O personagem não é um prompt, é uma árvore de estado.** Os dois presets "Criador de
Personagem" do Módulo 06 convergem numa estrutura — `STYLE / PHYSICAL_IDENTITY / CLOTHING /
WORLD / CINEMATOGRAPHY` — em que uma alteração toca **um nó** e preserva os demais, em três
níveis (pontual, parcial, completa).

> Isto resolve a `degradacao_por_iteracao` de um jeito que faltava. O arquivo já mandava
> voltar à imagem-âncora quando a edição encadeada degradasse — mas voltar à âncora **joga
> fora tudo o que foi decidido no caminho**. A terceira rota é manter o personagem como
> **estado textual versionado** e regerar do estado. Reference sheet e estado são coisas
> diferentes e ambas necessárias: a folha prova que o rosto sobrevive aos ângulos; o estado
> permite regerar sem redescobrir as decisões. Uma revisão de cliente vira *diff de um nó*,
> não uma nova rodada de briefing.

---

**Os pesos de referência são o controle que quase ninguém ajusta, e eles competem.** Toda
ferramenta de consistência tem slider, e a lei é sempre a mesma: **quando a fidelidade
sobe, a obediência ao prompt cai**. Não é defeito — é o mesmo orçamento sendo disputado.

- **Kling Reference** tem *dois* eixos, `rosto` (default 45) e `sujeito` (default 65) — e o
  sujeito carrega a **roupa**. O truque medido: para trocar de roupa mantendo a pessoa,
  **descer o peso de sujeito e manter o de rosto**.
- **Krea**: se a referência sobe demais, características do *outro* personagem migram para
  o seu. Com referência de gênero ou etnia diferente, a saída **não é baixar o peso** —
  isso só apaga a referência. É **converter a referência antes** ("troque a personagem por
  um homem") e só então usá-la. Converter a montante é mais barato que negociar peso a
  jusante.
- **Recraft**: o achado mais reaproveitável da rodada. Um estilo treinado insistia em
  trazer laranja que não existia na imagem-base; a correção não foi o slider nem o prompt —
  foi **fechar a paleta** nas cores da própria imagem. E o inverso vale: *"só de forçar as
  cores, já fica mais próximo dele"*. **Cor é uma alavanca mais forte que similaridade** —
  e é a rota para a pendência da paleta ciano da Oraclum: travar a lista de cores em vez de
  discutir o adjetivo. Regra de higiene que vem junto: quando a cor vem da paleta, **tirar
  do prompt tudo que fala de cor**, senão os dois brigam.

---

**A matriz de motor de vídeo: escolher por RECURSO, não por qualidade.** O Módulo 12 do AI
Image Creator rodou **o mesmo prompt** em três plataformas — é a evidência comparativa mais
limpa de todo o corpus. E ela desmonta um hábito do squad, que trata o Kling como padrão:

| Motor | Recurso exclusivo | Onde falha (medido) |
|---|---|---|
| **Kling** | **Motion Brush** — e sobretudo pintar de **preto** o que deve ficar parado | Rosto e mão em I2V saem ruins de forma consistente; fila lenta; flicker comum |
| **Runway** | Vídeo-para-vídeo · **expandir formato** · animar a fala | T2V não respeita o prompt; recursos bons presos ao modo Turbo, que tem qualidade menor |
| **Minimax** | *Nenhum* | — melhor qualidade e melhor aderência ao prompt da comparação, 5 por fila |
| **Luma Ray 2** | Morph por keyframes | Exige alinhamento geométrico entre os dois frames, senão vira crossfade |

> **Se o plano não precisa de recurso exclusivo — e a maioria não precisa — o motor certo é
> o que entrega melhor, não o que o estúdio já conhece.**

O Motion Brush merece nota à parte: pintar de preto o que deve permanecer imóvel é o
princípio `positivo_vence_negativo` levado ao pixel. Em vez de escrever "no movement",
trava-se a região — e é mais determinístico que qualquer redação. E "expandir formato" abre
uma rota que o squad não tinha: **a peça 16:9 do dark estoico pode virar 9:16 sem regerar
imagem nenhuma.**

---

**Frame inicial + final muda o que é possível pedir.** A razão técnica é simples e explica
a lista inteira: com um frame só, o modelo **inventa** o que não aparece — ao pedir rotação
a partir de uma imagem de costas, *"ele ia inventar um novo rosto"*. Nove tentativas
relatadas, com veredito; três falharam, e as falhas ensinam mais: entrar na boca de alguém
(saiu preto), sujeito colado na borda do quadro (sem espaço para manobrar), e **números e
ponteiros** — relógio, contador e placar não sobrevivem à interpolação.

A regra dura que evita metade das falhas: **o que muda entre os dois frames é o que o
modelo vai animar.** Tudo o que não deve se mexer precisa estar *idêntico* nos dois. O
plano do "homem vestido de rato" falhou porque o cenário dos dois frames era diferente.

E a técnica mais barata da rodada: **a aberração fica no meio, e o corte resolve.** Em
ponte entre frames distantes o defeito aparece na interpolação, não nas pontas — que são
imagens reais. *"Eu faria um speed ramp, um motion blur, para ir bem rapidinho para a parte
do final: essa aberração nem apareceria."* É a única técnica do arquivo que salva um take
reprovado **sem gastar geração nova**.

---

**Transição é montagem, não é take.** O clipe de transição tem o último frame da cena A na
entrada e o primeiro da cena B na saída, e entra *no meio* da timeline — a emenda
desaparece porque as pontas são idênticas às vizinhas. E aqui o método deste squad se
inverte: **preset vence prompt**. Testado lado a lado, o Kling 1.6 *ignorou* um prompt
detalhado (*"expliquei direitinho o que eu queria, e simplesmente ignorou"*) enquanto o
Higgsfield entregou com preset e sem prompt nenhum. Transição é um **efeito nomeado**, não
uma descrição de cena. A condição que ninguém verifica: **entre dois frames parecidos não
existe transição** — existe um movimento de câmera comum, mais barato e mais confiável.

O custo entrou com a honestidade do próprio professor: *"transições eu costumo fazer muito
pouco, justamente porque costuma dar mais errado; não quero ficar gastando meus créditos à
toa"*. Vale quando a transição **é** o ponto narrativo, não quando é decoração de corte.

---

**Dosagem de plano complexo — decisão de ritmo e de orçamento ao mesmo tempo.** A peça de
referência da aula, um comercial completo de ~30 s, usou **duas** cenas complexas. O resto
é simples. *"Se não for todas as cenas complexas, também é chato."* O efeito de "como é que
ele fez isso" depende de **escassez**. O `film-director` marca quais são na decupagem; o
`exec-producer` orça só essas com margem de tentativa.

---

**Números que faltavam ao `exec-producer`.** A rodada trouxe custo medido onde antes havia
método sem preço:

- **Consertar uma mão custa três rodadas de inpaint**, não uma. A aula acerta de primeira
  num caso e o professor avisa na hora: *"aqui a gente contou com a sorte; saiba que não é
  um padrão"*. No caso completo: rodada 1 com prompt "dedos" não devolveu nada aproveitável;
  rodada 2 com "segurando o cartão" melhorou mas trouxe luz vermelha demais; rodada 3
  resolveu. Combinado com o `STL-B-07`, agora dá para dizer **em quanto** sobe o custo de um
  plano com mão em close.
- **Flux Kontext com duas referências erra com frequência** — no teste de mockup, uma das
  duas variantes simplesmente não aplicou nada. Toda tarefa de duas referências se orça com
  no mínimo 2 gerações.
- **Morph custa ~2 gerações por par** (6 gerações para 3 morphs aproveitáveis).
- **Kling Elements**: 4 opções, 2 aproveitáveis.

---

**Três medições independentes convergem na força do upscale.** Nossa medição local fixou
`UltimateSDUpscale.denoise = 0.10` porque em 0.18 o ladrilho **inventou** rachaduras no
mármore. O curso mediu o mesmo em outra escala: no Visual Electric, *"o ideal é não passar
do 2x e não passar entre os 10 e 20%"* — em 3x com 40% ele mostra o resultado e conclui
*"é inviável"*. E no Krea o professor roda o upscale, inspeciona, conclui *"deu uma zoada
no olho dela"* e **descarta**, usando a imagem sem.

> A força do upscale é o parâmetro que decide, e o valor útil é **baixo** em qualquer
> escala de qualquer ferramenta. Quem sobe a força não ganha detalhe: ganha detalhe
> **inventado**. E a regra operacional que faltava: **upscale pode ser rejeitado por
> inspeção** — ficar com a imagem sem upscale é um resultado legítimo, não uma falha.

Na mesma linha, a incerteza antiga sobre o Magnific ("às vezes conserta a mão, às vezes
detona") se resolve por parâmetro: o curso conserta olho, boca e dedos com criatividade 5 e
**semelhança −2** — e admite a contrapartida, *"ele trocou também um pouco o nariz, o
cabelo também"*. Logo: **o upscaler dedicado conserta mão e muda o rosto.** Proibido em
personagem que precisa de consistência entre cenas.

---

**O orçamento de pixel ganhou a quarta e a quinta confirmações — e uma delas fecha uma
dúvida legítima.** A letra "B" de um controle de Xbox sai errada **mesmo com um LoRA
treinado especificamente naquele produto**: *"como é um objeto, essa região é uma parte
pequena, tem poucos pixels para a IA trabalhar"*. Ou seja: **treinar modelo não é rota de
correção de anomalia de escala.** LoRA resolve identidade; não resolve orçamento de pixel.
Com cinco ocorrências em quatro ferramentas e dois cursos independentes, isso deixa de ser
hipótese e vira lei do arquivo.

---

**Duas regras de acabamento que o squad não tinha escrito.** A primeira: **o elemento
inserido tem que ser degradado até a cena.** No mockup do Recraft, enquanto a arte continua
vetor *"ela tem mais resolução, parece um vetor, não fica ambientada"* — a correção é
rasterizar. Isso dá o segundo eixo da checagem de colagem, independente da "help layer" já
registrada: **luminância** (help layer) e **textura/resolução** (rasterizar). Uma colagem
pode passar num e falhar no outro.

A segunda: **escolher a foto-base de mockup pela sombra.** O critério declarado de seleção
não é composição nem beleza — é ter sombra que *interage*, porque é a informação que o
modelo usa para deformar a arte junto com a superfície. Base sem sombra devolve arte
chapada, e nenhum prompt corrige isso depois.

---

**Uma anomalia que faltava no catálogo, e ela não é um defeito: é uma ausência.** A imagem
está tecnicamente correta — luz plausível, anatomia certa, produto fiel — e mesmo assim não
presta, porque *"parece foto de banco de imagens"*. A cura demonstrada **não** é escrever
mais adjetivo: é acrescentar uma **referência estética**. Vira pergunta de reprovação no
gate: *"esta imagem poderia ilustrar qualquer marca deste segmento?"*. Se sim, falta
referência, não prompt.

---

**Realismo orgânico é um destino, não um estilo a mais.** Existe uma categoria cujo
critério de sucesso é **não parecer produzida**: *"quando a imagem é muito bonita, muito
perfeita, muito plastificada, a galera fala: é IA"*. A rota barata é por **preset**
(Higgsfield: iPhone, Selfie 0.5, Anos 90), e cada preset substitui a descrição técnica
inteira — o prompt vira uma frase. Daí sai uma regra que contraria o instinto do squad:
**em ferramenta com preset de estética, prompt longo é desperdício e piora.** O professor
mede isso ao vivo: o LLM devolve um prompt imenso, ele desconfia e pede *"ajuste esse
prompt para o padrão ideal do Higgsfield"* — só então funciona.

E o encaixe é direto: o `camera-moves.yaml` já registra que **movimento** sofisticado
denuncia que não é UGC real. Este é o correspondente em imagem: **acabamento** sofisticado
denuncia que não é foto real. As duas regras são a mesma regra.

---

**A escada de consistência ficou completa, e o degrau de baixo custa zero de GPU.** A
palavra-gatilho no ChatGPT — subir as 10 imagens que ele aceita e atribuir um nome ao
conjunto — dá consistência de personagem *e de produto* sem treinar nada. Limite duro
declarado: **com uma foto só, o ChatGPT não reproduz a mesma pessoa.** Ganho composto: com
dois sujeitos registrados dá para pedir os dois na mesma imagem.

> 1. Palavra-gatilho no ChatGPT — custo zero de GPU
> 2. Pesos de referência (Kling / Krea) — sem treino, dois eixos de controle
> 3. LoRA treinado (Krea ou Fal.ai) — consistência máxima, custo de treino
>
> Sobe-se um degrau só quando o anterior reprovar num job real. **O `character-lead` não
> começa por LoRA** — e, na máquina de hoje, nem poderia: não há rota local de treino, e o
> gargalo é o mesmo do Qwen-Image, RAM.

Sobre dataset de treino os dois cursos divergem — Krea pede 20–50 fotos, Fal.ai pede 10–30
e alerta para **overtraining** acima disso. A faixa de sobreposição é **20–30**. Mas o que
importa mais que o número é o que ambos exigem: variar ângulo, variar iluminação e **variar
ou remover o fundo**. Esta última o Filmboss ensina pelo erro — fotografou as 36 imagens no
mesmo set e o modelo aprendeu o **tripé**, que voltava nas gerações.

---

**O que foi recusado, e por quê.** Este corpus é notavelmente mais limpo que o do Dark
Room: são dois cursos de ofício, não de operação de canal, e **nenhum item precisou ser
recusado por ser manobra contra a plataforma ou contra o espectador**. Só três coisas não
entraram, e nenhuma por má-fé:

| Item | Motivo |
|---|---|
| Listas de "melhores ferramentas do momento" e preços | Política já declarada na §4. Envelhecem em semanas. Do material sobrou só método: a divisória Nano Banana × Seedream, o Veo `fast` por custo, e a nota de obsolescência do Midjourney |
| `Links das Upscale.txt` | **Zero bytes.** Está listado como material do curso e não contém nada. Registrado para ninguém voltar a procurar |
| Reformular prompt para escapar de bloqueio de moderação | Entrou **com ressalva explícita**, e apenas na leitura correta: o filtro barrou *"deitada no sofá"* e liberou *"deitada em cima do sofá"* — julgou ambiguidade, não conteúdo. Registrado como **desambiguar**, com a nota de que não é técnica de contorno e não deve virar uma |

Duas coisas merecem registro pelo contrário — por serem *melhores* que a média do gênero.
O Filmboss dedica um trecho a dizer que **recriar referência é método legítimo de
aprendizado, mas postar como original "pega mal no mercado"**, e manda marcar o autor. E o
mesmo professor freia o próprio entusiasmo mais de uma vez: *"não exagerem, tem essa
carinha de IA; saiba usar como cerejinha do bolo"*. É o oposto do que o corpus do Dark Room
ensinava, e vale anotar que existe.

---

**Um achado sobre o próprio corpus, e ele muda o mapa.** Uma verificação de duplicatas no
AI Image Creator PRO encontrou **15 pares de aulas idênticas** — mesma transcrição, arquivos
diferentes. O **Módulo 14 ("Workflows") é integralmente uma remontagem**: 14 das suas 15
aulas duplicam literalmente aulas dos módulos 04, 11, 12, 13 e 15, e a única original
(`a088`, escada de força do img2img) **já estava minerada** desde a primeira rodada. Há
ainda um arquivo mal rotulado no Módulo 13 (`a070` e `a071` têm o mesmo conteúdo).

> Consequência direta: o curso tem **89 aulas únicas, não 104**, e o corpus inteiro tem
> **145, não 160**. E a segunda prioridade que o mapa anterior recomendava — "as 9 aulas
> restantes do Módulo 14 para o `exec-producer`" — **não existia**. Era material repetido.

*Fonte: Filmboss — IA Boss Módulo 05 (9 aulas em transcrição + `IA_BOSS_-_MODULO_5_PT1/PT2/PT3.md`),
`Banco de Prompt.md`, `SUNO PROMPT ARCHITECT.md`, `IABoss - Criador de personagem.md` (2 versões),
`IABoss · Flux Kontext 1.md`, `IA_BOSS_-_MODULO_2.md`, `Minhas ferramentas de IA favoritas.md`;
AI Image Creator PRO — módulos 04 (7), 05 (4), 07 (3), 12 (8), 13 (3) e 15 (3).*


---

## 3. O que o material CONFIRMOU do que já estava desenhado

Vale registrar, porque confirmação também é informação — significa que não precisamos mexer:

| Nosso desenho | Confirmação |
|---|---|
| `i2v_antes_de_t2v` (model-routing) | "Frame perfeito" primeiro, variações depois. O quadro é aprovado antes de virar movimento |
| `texto_nao_e_geracao` | VEO 3 exige suprimir texto no negative prompt; texto no pixel é irreversível |
| Regra de ouro §3.1 (geração é humana) | "Nem todo prompt funciona na primeira tentativa"; "aproveite erros criativos"; gestão de crédito exige julgamento |
| `fact-checker` com poder de bloqueio em direitos | Plataformas bloqueiam personagem protegido; a saída é criar original inspirado — decisão que exige avaliação, não automação |
| Ordem `stills` → `takes` | O workflow de consistência do curso é exatamente essa ordem |
| `codigo_de_b_roll` do dark-room ("nenhum plano acima de 4s", "estático parece tela travada") | Confirmado por dois formatos independentes no Método Lives: troca de imagem a cada ~3s no resumo narrado, e "nunca imagem estática" no loop musical |
| `quantas_variacoes` + `criterio_de_escolha` | O Suno devolve duas variantes da mesma letra por geração; a escolha continua humana e por escuta |
| Regra de ouro §3.1 (geração é humana) | Reconfirmada no áudio: geração de ambiência falha ao vivo três vezes seguidas e a decisão de descartar é do ouvido, não de métrica |
| `IL-PD-04` e `STL-A-10` (texto legível não é pedido ao gerador) | Confirmado por dois cursos independentes: *"ele não conseguiu escrever exatamente o mesmo texto nessas letras pequenas"* e a alternativa oferecida é *"gerar a imagem sem o texto e fazer a inserção como mockup depois"* |
| `STL-B-07` (contar dedos quando rosto ou mão ocupam mais de ¼ do quadro) | O limiar estava certo pela razão certa: abaixo disso a região não tem pixels para o defeito ser visível — nem para ser corrigido |
| `STL-A-12` / `quantas_variacoes` ≥ 2 | *"Aqui no estúdio a gente acaba tendo que gerar muitas imagens para chegar na imagem final, e está tudo certo."* Volume é método, não tentativa e erro |
| `IL-PD-05` (produto real tem âncora de fidelidade) | Confirmado e **endurecido**: o produto real não é gerado, é colado — e o ângulo da cena deriva da foto-âncora |
| `positivo_vence_negativo` (camera-moves) | Confirmado no pixel: o Motion Brush do Kling trava região pintando de **preto** o que deve ficar parado — mais determinístico que qualquer redação de negative prompt |
| "prompt longo demais dilui" (model-routing) | Confirmado e **calibrado por medição**: a mediana dos 51 prompts do `Banco de Prompt.md` é 99 palavras. O teto útil está mais perto de 100 que de 60 |
| `degradacao_por_iteracao` | Confirmado, e o corpus fornece a rota que faltava: manter o personagem como **estado textual versionado** e regerar do estado, em vez de editar a saída ou perder o caminho voltando à âncora |
| "orçamento de pixel" como causa raiz das anomalias | **4ª e 5ª confirmações**, e uma delas fecha uma dúvida: a letra pequena sai errada mesmo com LoRA treinado no produto. Treino resolve identidade, não escala |
| Movimento sofisticado denuncia UGC falso (camera-moves) | Confirmado no eixo da imagem: **acabamento** sofisticado denuncia foto falsa. As duas são a mesma regra, e a rota é preset de câmera de celular |
| `quantas_variacoes` ≥ 2 | Endurecido com números: mão custa **3 rodadas** de inpaint; Flux Kontext com 2 referências, **2 gerações**; morph, **2 por par**; Kling Elements, 4 opções para 2 aproveitáveis |

---

## 4. Ainda por validar no estúdio

Tudo em §2 está marcado `status: a_validar_no_estudio`. É conhecimento de curso, não
de teste no nosso pipeline — bom o bastante para orientar a primeira rodada, e deve
ser confirmado ou corrigido pelo campo `avaliacao.o_que_mudou_na_direcao` do Pacote de
Direção depois dos primeiros jobs reais.

| Item | Como validar |
|---|---|
| Nano Banana Pro como upscaler preferido | Primeiro job do P6 que precisar de entrega em alta |
| Estruturas de prompt (5 ferramentas) | Comparar prompt planejado × prompt efetivamente usado, via `prompt_divergiu_do_planejado` |
| `risco_ia` e `custo` por movimento de câmera | Contar tentativas reais por movimento nos primeiros takes do P1 |
| Flux Kontext preservando logo e texto de marca | Primeiro packshot com marca visível |
| Padrão de prompt do Suno (letra + estilo ≤200 caracteres) | Primeira trilha ou motif de canal pedido ao `sound-designer` |
| "Ambiência é mais difícil que canção" no gerador de música | Comparar geração × Biblioteca de Áudio no primeiro leito ambiente |
| Arquitetura cena/fonte do OBS com captura recortada | Só se o `live-stats-panel` sair do backlog — exige antes resolver a fonte de dados licenciada |
| Escada de força do img2img (0.3 / 0.6 / 0.8) e composição por máscara | Primeiro asset do P6 que precisar trocar textura sem perder composição |
| "Orçamento de pixel" como causa raiz das três anomalias | Medir, nos primeiros lotes, se apertar o quadro antes de regerar a região de fato aumenta a taxa de acerto |
| Deixar um dedo correto dentro da máscara como guia de proporção | Primeira correção de mão no stack local |
| Troca dirigida de texto sobre lettering de referência | Primeira peça que precisar de tipografia expressiva dentro do pixel |
| "Relight antes de upscale" | Primeira reiluminação — conferir se a perda de resolução se reproduz fora da ferramenta de origem |
| Parâmetros do Midjourney (stylize, variety, raw, aspect) | **Conferir na interface antes de usar.** Nomes reconstruídos de transcrição degradada; os `.mp4` de origem não existem mais |
| Números de RPM e receita do Método Lives | **Não validar — descartar.** Aritmética ao vivo inconsistente; serve como ordem de grandeza, nunca como base de projeção para cliente |
| Arquitetura de prompt do Suno (19 campos) | Primeira trilha pedida ao `sound-designer` — e conferir na interface o limite real do campo de estilo (200 vs. 600-900 caracteres, divergência entre fontes) |
| Style Reference do Midjourney como color grading | Primeira peça híbrida, ou o primeiro lote que precise de paleta travada sem regerar |
| Paleta fechada vence slider de similaridade (Recraft) | Primeira peça on-brand da Oraclum — é a rota proposta para a pendência da paleta ciano |
| Matriz de motor de vídeo (escolher por recurso) | Primeiro take do P1: rodar o mesmo prompt em dois motores e comparar. O curso testou em versões antigas; a conclusão sobre recursos sobrevive, os julgamentos de qualidade não |
| "Expandir formato" do Runway (16:9 → 9:16 sem regerar) | **Teste barato de maior retorno.** A peça estoica 16:9 já existe; basta uma geração para saber |
| Frame inicial + final: a regra do "só muda o que deve animar" | Primeiro take de rotação ou revelação de rosto |
| Palavra-gatilho no ChatGPT como degrau 1 da consistência | Primeiro `character` de P2 ou P3 — antes de considerar LoRA |
| Dataset de LoRA na faixa 20-30, com fundo variado | Só quando os degraus 1 e 2 reprovarem num job real. Não há rota local: o gargalo é RAM |
| Custo de 3 rodadas por correção de mão | Contar as rodadas reais no primeiro plano com mão em close e corrigir o número |

**Não incorporado de propósito:** listas de "melhores ferramentas do momento" e preços.
Envelhecem em semanas e o próprio curso admite isso, mantendo a lista fora da aula, numa
área atualizada à parte. O que foi extraído é o **método e o critério de escolha**, que
sobrevivem à troca de ferramenta.

---

## 5. Mapa de mineração — onde paramos

Estado por módulo. `✅ minerado` = virou ativo no squad. `◻ pendente` = transcrito e
pesquisável, ainda não estudado. Atualizado em **2026-08-30**, depois da segunda rodada.

> ### ⚠️ O corpus tem menos aula do que os arquivos sugerem
>
> Uma verificação de duplicatas em 2026-08-30 encontrou **15 pares de aulas idênticas**
> no AI Image Creator PRO — mesma transcrição, arquivos diferentes. O **Módulo 14
> ("Workflows") é integralmente uma remontagem**: 14 das 15 aulas duplicam literalmente
> conteúdo dos módulos 04, 11, 12, 13 e 15, e a única original (`a088`) já estava
> minerada. O Módulo 13 tem ainda um arquivo mal rotulado (`a070` = `a071`).
>
> **O curso tem 89 aulas únicas, não 104. O corpus inteiro tem 145, não 160.** Os totais
> desta seção usam os números reais; a §1 preserva os números brutos do ETL.

### AI Image Creator PRO — 104 arquivos · **89 aulas únicas** · 13h50m · 599 frames

| Módulo | Aulas | Duração | Estado | Alimenta |
|---|---:|---:|---|---|
| 01 — Introdução | 1 | 0h01 | ✅ minerado | benchmark de modelo Whisper |
| 02 — Prepare | 2 | 0h12 | ✅ minerado | estrutura de prompt |
| 03 — Midjourney | 13 | 1h10 | ✅ minerado (7 de 13) | `imagem-refino-playbook` §2 §3 §4 |
| 04 — Visual Electric | 7 | 0h29 | ✅ **minerado (7 de 7)** | `prompt-architectures` → `coerencia_de_serie_por_texto`, `pesos_de_referencia` |
| 05 — Recraft | 4 | 0h45 | ✅ **minerado (4 de 4)** | `prompt-architectures` → paleta como trava · `imagem-refino-playbook` §8.5 §8.6 |
| 06 — Magnific | 3 | 0h31 | ✅ minerado | rota de upscale (§2.1) · `imagem-refino-playbook` §3 §5 |
| 07 — Adobe Firefly | 4 | 0h28 | ✅ parcial (3 de 4) | vetor como base de composição — o resto é operação de Photoshop |
| 08 — Flux | 4 | 0h26 | ✅ parcial | `prompt-architectures.yaml` |
| 09 — Make it Shine | 3 | 0h20 | ✅ minerado | `imagem-refino-playbook` §5 §6 |
| 10 — Edição de Fotos | 12 | 2h37 | ✅ parcial (3 de 12) | `imagem-refino-playbook` §6 — **9 projetos de cliente seguem pendentes** |
| 11 — Still de Produtos | 2 | 0h08 | ✅ minerado | `imagem-refino-playbook` §0 §7 |
| 12 — AI Video | 8 | 0h59 | ✅ **minerado (8 de 8)** | `model-routing` → `matriz_de_motor_de_video` · `relight_e_troca_de_fundo` · `camera-moves` → Motion Brush, morph |
| 13 — Google Labs / ChatGPT / Flora / Krea | 20 (19 únicas) | 2h10 | ✅ parcial (5 de 19) | `prompt-architectures` → palavra-gatilho · `imagem-refino-playbook` §8.7 §8.11 |
| 14 — Workflows | 15 | 1h52 | ✅ **fechado — 14 de 15 são duplicatas**; a 15ª já estava minerada | — |
| 15 — Bônus | 6 (5 únicas) | 1h36 | ✅ parcial (3 de 5) | `model-routing` → `modelo_treinado_lora` · `imagem-refino-playbook` §8.1 §8.2 |

### Filmboss — 52 aulas · 21h20m · 305 frames · 20 materiais `.md`

| Frente | Aulas | Estado | Alimenta |
|---|---:|---|---|
| IA Boss — Módulo 01 (Melhores IAs) | 2 | ✅ minerado (via `.md`) | `model-routing.yaml` |
| IA Boss — Módulo 02 (Imagens Realistas) | 3 | ✅ **minerado** — `Banco de Prompt.md` fechado | `prompt-architectures` → `gramatica_medida_do_banco_de_prompt`, `slots_de_referencia` |
| IA Boss — Módulo 03 (Consistência) | 5 | ✅ minerado (via `.md`) | `prompt-architectures` §workflow |
| IA Boss — Módulo 04 (Geração de vídeo) | 4 | ✅ minerado (via `.md`) | `camera-moves.yaml` |
| IA Boss — Módulo 05 | 14 | ✅ **minerado** — 9 aulas em transcrição + os 3 `.md` PT1/PT2/PT3 cobrindo o restante | `prompt-architectures` (5 blocos novos) · `camera-moves` (3 seções novas) · `imagem-refino-playbook` §8 |
| IA Boss — Módulo 06 (Avançado / AGENTES) | 6 | ✅ **minerado** — os 8 presets lidos | `prompt-architectures` → **Suno**, `estado_do_personagem`, Flux Kontext enriquecido |
| IA Boss — Módulo 07 | 2 | ◻ pendente | a classificar |
| **Projeto Prático Apple** | 10 | ✅ minerado | `brand-film-playbook.yaml` (§2.4) |
| IA Skills — Upscale | 6 | ✅ minerado | rota de upscale (§2.1) · `imagem-refino-playbook` §5 |

**Materiais escritos: 19 de 20 lidos.** O vigésimo, `Links das Upscale.txt`, **tem zero
bytes** — está listado como material do curso e não contém nada.

### Dark Room — Método Lives (turma BLACK) — 3 aulas · 5h49m · 60 frames

Curso de operação de canal, não de produção audiovisual. A mineração aqui não busca
técnica de imagem — busca **formato, economia e perfil de direitos**, e separa o que
é produção legítima do que é manobra contra a plataforma ou contra o espectador.

| Aula | Nicho | Duração | Estado | Alimenta |
|---|---|---:|---|---|
| 1 | TV aberta / novelas | 2h15 | ✅ **minerado** — núcleo aproveitado, 3 itens recusados | `lives-niches-playbook.yaml` §novelas |
| 2 | Esportes | 1h47 | ✅ **minerado** — 8 aproveitáveis, 7 recusados | `lives-niches-playbook.yaml` §esportes · `genre-catalog.yaml` → `live-stats-panel` |
| 3 | Músicas | 1h46 | ✅ **minerado** — 9 aproveitáveis, 5 recusados | `lives-niches-playbook.yaml` §musicas · `genre-catalog.yaml` → `live-music-loop` |

**Aulas do curso não presentes neste corpus** (citadas pelo professor, não transcritas):
religioso · prosperidade · saúde · eventos em alta · animais · agricultura ·
configuração de VPS/servidor · e os métodos 2 a 4 ("regra de 3" para vídeo longo,
"5 em 1", "método preguiçoso"). Se alguma entrar, o playbook já tem a estrutura de
bloco por nicho e a lista de recusados para comparar — o padrão da `engenharia do
artefato de revisão` reaparece em todas as três aulas existentes e deve ser o primeiro
item procurado em qualquer aula nova.

### ComfyUI — Local TTS (avulso) — 1 aula · 6min · 4 frames

| Aula | Duração | Estado | Alimenta |
|---|---:|---|---|
| Generate Voices inside ComfyUI — Local TTS | 0h06 | ✅ minerado — 1 técnica, 0 motores novos | §2.6 · recomendação para a lacuna nº 1 do `local-generation-stack.yaml` |

Os três motores da aula já estavam avaliados e rejeitados. O que sobrou foi o padrão
de **nó como ponte para venv dedicado**, e ele não foi escrito no
`local-generation-stack.yaml` porque este documento não é dono daquele arquivo.

### Balanço

| | |
|---|---:|
| Aulas únicas no corpus | **145** (de 160 arquivos — 15 são duplicatas) |
| Aulas mineradas ou parciais | **~117 de 145** (~81%) |
| Aulas totalmente fechadas nesta 2ª rodada | **37** |
| Materiais escritos lidos | **19 de 20** (o 20º tem zero bytes) |
| Ativos gerados ou estendidos | 7 arquivos · ~4.500 linhas · **+1.461 nesta rodada** |
| Gêneros de backlog catalogados | 13 |

> **Não são 100%, e não vale arredondar.** Sobram **~28 aulas únicas** não estudadas,
> concentradas em três bolsões, e todas as três com motivo honesto:
>
> - **9 projetos de cliente do Módulo 10** (The Ordinary, Vivo, Netflix, Santander, New
>   Balance, Skol — 2 aulas cada). São execuções passo a passo em Photoshop. A frente de
>   imagem já levou dali o que era *método*; o que resta é operação de ferramenta, e o
>   retorno por hora caiu muito.
> - **14 aulas do Módulo 13** — o bloco Krea (7), o Google Labs (3) e parte do ChatGPT (4).
>   O método central desse módulo já foi extraído (palavra-gatilho, recuperação de foto de
>   produto, Flora); o resto é passeio por interface.
> - **2 aulas do Módulo 07 do IA Boss** e **1 do Módulo 15** (`a101`, virtual production,
>   8.280 palavras — a maior aula avulsa do corpus, e a única pendência grande que pode
>   conter técnica nova de verdade).
>
> Nenhuma delas está pendente por corpus degradado. As transcrições existem e estão legíveis.

**Próximo passo de maior retorno — e ele não é mais mineração.**

Os dois blocos que o mapa anterior apontava foram fechados, e a segunda prioridade que ele
recomendava (as 9 aulas do Módulo 14) **descobriu-se não existir** — era material duplicado.
O corpus deixou de ser o gargalo: **o que existe agora é conhecimento de curso esperando
teste no estúdio**, e há um único job que exercita o máximo por hora gasta:

> **Um lote do P6 image-lab com produto real de cliente**, feito na ordem certa. Ele
> exercita de uma vez: a foto-âncora e o ângulo derivado dela (§7), a escada de prompt e a
> gramática de ~100 palavras (§8), os pesos de referência, o relight antes do upscale, a
> correção de mão com custo de três rodadas, o critério de sombra na base de mockup e a
> degradação do elemento inserido. Sete itens `a_validar_no_estudio` num job só.

Em segundo lugar, dois testes baratos que não dependem de cliente nenhum:

1. **Expandir a peça 16:9 do dark estoico para 9:16 no Runway**, sem regerar imagem. Se
   funcionar, o squad ganha uma rota de reaproveitamento que hoje não tem — e é o teste com
   a melhor relação entre custo e informação de toda a lista.
2. **A primeira trilha pelo `sound-designer`**, usando o preset de Suno agora registrado.
   Fecha a última pendência declarada da primeira rodada e resolve, de passagem, a
   divergência do limite de caracteres do campo de estilo.

Só depois disso vale voltar ao corpus, e provavelmente só pela `a101` — a única aula
pendente grande o bastante para conter técnica que o squad ainda não tem.

**Pendências abertas — estado em 2026-08-30:**

| Pendência | Dono sugerido | Estado |
|---|---|---|
| ~~Arquitetura de prompt do Suno no `prompt-architectures.yaml`~~ | `sound-designer` | ✅ **FECHADA** — 6ª arquitetura do arquivo, 19 campos. Resta conferir o limite do campo de estilo na interface |
| Padrão de ponte para venv dedicado na lacuna nº 1 do `local-generation-stack.yaml` | `sound-designer` | ◻ aberta — este documento não é dono daquele arquivo |
| Fonte de dados licenciada antes de o `live-stats-panel` sair do backlog | `exec-producer` + `fact-checker` | ◻ aberta |
| `P7 novela-recap` referenciado pelo `local-generation-stack.yaml` e ausente do `genre-catalog.yaml` | quem for dono do P7 | ◻ aberta — divergência entre arquivos de dados |
| Registrar as 8 necessidades de refino no `local-generation-stack.yaml` | `image-lead` | ◻ aberta — aquele arquivo é o dono do inventário |
| Exigir que o **ângulo** da cena derive da foto-âncora (`IL-PD-05`) e pedir a âncora no intake | `qa-critic` + `brief-strategist` | ◻ aberta |
| Gate: direção de luz coerente após edição de cenário | `qa-critic` | ◻ aberta — **mas a rota técnica agora existe**: relight com recálculo, registrado em `model-routing.yaml` |
| Checkpoint do cliente **antes** da composição manual | `exec-producer` | ◻ aberta |
| **Novo:** gate de elemento inserido com nitidez/grão incompatíveis com a cena | `qa-critic` | ◻ aberta — irmão do item de luz; ver `imagem-refino-playbook` §8.5 |
| **Novo:** gate de genericidade — *"esta imagem poderia ilustrar qualquer marca do segmento?"* | `qa-critic` | ◻ aberta — ver `imagem-refino-playbook` §8.7 |
| **Novo:** reference sheet passa a exigir âncora **frontal e neutra**, não só frontal | `character-lead` | ◻ aberta — expressão é dirigida no vídeo, não na imagem |
| **Novo:** paleta de marca entra como **parâmetro fechado**, não como adjetivo no prompt | `art-director` | ◻ aberta — é a rota para a pendência da paleta ciano da Oraclum |
| **Novo:** card de takes com dois frames precisa declarar **o que muda** entre eles | `motion-lead` | ◻ aberta — ver `camera-moves` → `frame_inicial_e_final` |
