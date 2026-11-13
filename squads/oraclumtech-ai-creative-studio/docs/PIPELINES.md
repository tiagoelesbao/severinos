# Pipelines — operação passo a passo

Este documento é o manual de operação dos 6 pipelines do estúdio. Ele foi escrito em
torno de uma pergunta: **onde é que você precisa entrar?**

Porque a resposta define o dia. Os agentes cuidam de brief, conceito, roteiro, direção,
checagem e gate. Mas em quatro momentos o pipeline **para** e espera uma pessoa:
aprovar a rota, gerar os stills, gerar os takes e gravar a voz — mais a montagem final
em After Effects e Premiere. Esses são os pontos de parada, e eles são o assunto aqui.

> **A regra que organiza tudo:** o squad não gera imagem nem vídeo. O squad dirige a
> geração. Você nunca recebe "gere uma imagem bonita da cena 3". Você recebe um **card**
> com a ferramenta escolhida, o prompt pronto para colar, os parâmetros exatos, quantas
> variações gerar, o que aquele modelo costuma errar, como saber que acertou, onde
> devolver o arquivo e o que fazer se a ferramenta falhar.

> ⚠️ **Atualização de 2026-08-29 — a ferramenta do card mudou em alguns estágios.**
> Este documento foi escrito quando a única rota de geração era serviço em nuvem
> (Krea, Leonardo, Kling, gravação humana de voz). Desde então existe um **stack local
> em ComfyUI** na máquina do founder, e ele já é a rota padrão de **take** e de
> **narração**. A regra acima **não muda** — quem gera continua sendo você; muda qual
> ferramenta você abre. Leia **`docs/COMO-TRABALHAMOS-HOJE.md`** antes de operar
> qualquer parada de geração, e trate os trechos abaixo marcados com ⚠️ como superados.

---

## Como funciona um ponto de parada

Todo estágio humano segue o mesmo laço, em qualquer pipeline:

**1. O agente escreve o Pacote de Direção.**
`image-lead`, `motion-lead` ou `sound-designer` produz o `asset_direction`: um bloco por
asset, com ferramenta recomendada **e alternativa** (com o critério para preferir uma ou
outra), prompt completo, prompt negativo quando a ferramenta aceita, parâmetros, técnica,
armadilhas conhecidas daquele modelo, critério de aceite verificável, número de variações,
pós-processamento e plano B.

**2. O `exec-producer` emite o card.**
Fica em `{job}/_cards/card-{stage}-{n}.md`. O card é autossuficiente: dá para
executar sem abrir nenhum outro arquivo. Se o Pacote de Direção estiver incompleto, o card
**não é emitido** — card sem direção completa é retrabalho garantido.

**3. Você gera e devolve.**
Coloque os arquivos no path exato que o card indica, normalmente
`{job}/{NN}-{stage}/entregues/`, e preencha `_retorno.json` com: quais arquivos, qual
ferramenta você **de fato** usou (mesmo se foi a alternativa), quantas variações saíram e
qualquer observação. O registro da ferramenta usada é o que mantém a matriz de
recomendação viva.

**4. O agente avalia e, se precisar, dirige o retake.**
O `drift-check` compara o que você devolveu com o `criterio_de_aceite`. Se reprovar, o
agente reescreve o Pacote apontando **o que mudar no prompt ou no parâmetro** — nunca
"tente de novo". Teto de 3 ciclos; ao estourar, escala para o `@studio-chief`, porque
nesse ponto o problema costuma estar no estágio anterior, não no prompt.

**O que nunca acontece:** o agente marcar o estágio como concluído sem o arquivo em
disco. Se você devolveu 2 variações onde o card pedia 4, o item entra em `_degraded.md`
com o motivo — mas não vira "feito".

---

## P1 · Brand Film

**Quando usar:** campanha e comercial de produto. A peça-vitrine, aquela que vai para o
board do cliente e para o portfólio do estúdio.
**Não usar quando:** o pedido cobra CPA. Isso é P2.

### O caminho

O `@studio-chief` faz o intake e classifica. O `@brief-strategist` escreve o brief e
congela a identidade da marca num snapshot (`brand-lock.yaml`) — a partir daí o job tem
regra própria, imune a mudanças na fonte. O `@research-scout` roda o benchmark e entrega
três coisas: o dossiê, o moodboard e o `nao-copiar.md`, que é o contrapeso do dossiê
(sem ele, benchmark vira cópia).

**⏸ PARADA 1 — Aprovação da rota criativa (`concept`)**
O `@creative-director` apresenta **3 rotas**. Você escolhe uma.
Não é uma formalidade: nada abaixo desse estágio começa sem a escolha registrada com nome
e data em `territorio-criativo.md`. O que você está julgando é se a big idea é uma
**ideia** ou um formato — se ela só funciona em 9:16, é formato.
Se reprovar as três, o job volta para pesquisa com o motivo escrito. O estúdio não gera
uma quarta rota com o mesmo insumo.

Aprovada a rota, o `@head-of-copy` escreve o roteiro e — junto — o `claim-ledger.json`,
onde cada afirmação factual aponta para uma fonte. Claim sem fonte não passa. Depois o
`@film-director` decupa, o `@dop` fecha o look (traduzido tanto para prompt quanto para
instrução de set) e o `@art-director` fecha cenário, props e tipografia.

**⏸ PARADA 2 — Stills**
Você recebe um card por plano do storyboard. Para peça-vitrine, a recomendação padrão é
ferramenta web (Krea, Leonardo), porque é onde dá para descartar e refinar. Gere as
variações pedidas, escolha, devolva em `11-stills/entregues/`.
A dica que mais economiza tempo aqui: gere 4 variações antes de julgar qualquer uma. A
primeira quase nunca é a melhor.

> ⚠️ **Atualizado em 2026-08-29 — a PARADA 2 ganhou rota local.** Existe agora o
> **FLUX.2 [klein] 4B** (`flux2-klein-t2i.json`, Apache 2.0). A recomendação acima
> **continua valendo para peça-vitrine**: em exploração de look, ferramenta web ganha
> disparado, porque no local cada volta é uma fila. O local entra quando o look já está
> travado e o que resta é produção — lote de stills equivalentes, thumb de canal em
> cadência, ou o still que vira insumo do take. E ele ainda é `instalado`, não `validado`:
> nenhum pixel saiu. Enquanto isso, o card sempre traz a rota web no `se_falhar`.
> Ver `docs/COMO-TRABALHAMOS-HOJE.md` §2.2 e §3.

**⏸ PARADA 3 — Takes**
Só depois que os stills foram aprovados. O card traz o still-chave e pede o movimento a
partir dele — nunca vídeo direto do texto, porque assim o quadro é aprovado antes do
movimento existir. Descreva só o movimento; a cena já está no still.
Devolva em `12-takes/entregues/`.

> ⚠️ **Atualizado em 2026-08-29 — a PARADA 3 tem rota local, e ela é a padrão.** O motor de
> entrega de take hoje é o **Wan 2.2 I2V max local** (`wan22-i2v-max.json`, 20 steps, cfg 4,
> sem LoRA) — a única rota local do squad com status `validado`. As ferramentas web
> (Hailuo, Kling, Veo) continuam válidas quando você precisa iterar rápido. Duas coisas
> mudam no seu dia: o render é **noturno** (retake pedido de tarde volta no dia seguinte, e
> por isso vá de lista fechada, nunca pingado) e o `length` do grafo só aceita **4n+1**
> frames — peça o degrau seguinte, não "meio segundo a mais".
> Existe também o `wan22-i2v-fast.json` para **previz**: decidir se o take funciona antes de
> gastar 5x no render real. **Nunca entregue a partir dele.**
> Ver `docs/COMO-TRABALHAMOS-HOJE.md` §2.3.

**⏸ PARADA 4 — Voz e trilha**
O `@sound-designer` entrega a direção de leitura: ritmo, ênfase, onde respirar. Você
grava e escolhe a trilha na biblioteca licenciada, seguindo o mood e a energia
especificados. Devolva em `13-audio/entregues/`.

> ⚠️ **Superado em 2026-08-29.** A frase original dizia "não existe gerador de voz
> validado no repositório". Existe: TTS local validado (ChatterBox Official 23-Lang, MIT),
> com **voz canônica do canal já escolhida pelo founder**. A direção de leitura agora vira
> um **SRT dirigido** — com pausas, respirações e tags de intensidade escritas — e o card
> aponta o workflow `assets/comfyui/workflows/tts-narracao-srt.json`. Gravação humana
> continua sendo a rota certa quando a voz precisa ser de uma pessoa específica.
> Ver `docs/NARRACAO-LOCAL.md` e `docs/COMO-TRABALHAMOS-HOJE.md` §2.4.

**⏸ PARADA 5 — Montagem**
O app próprio já entregou a autolegenda sincronizada por palavra. Você recebe dois
documentos: `ae-comp-spec.md` para o After Effects (composições, camadas, animações com
valor numérico) e `premiere-cut-spec.md` para o Premiere (ordem de cortes com timecode e
o porquê de cada um, bins, mixagem, preset de export por canal).
Os dois trazem o campo `ja_resolvido_pelo_app` — o que **não** refazer na mão. Legenda é
o caso clássico: já está pronta e sincronizada.
O master sai em `14-assembly/master/`.

Depois disso o `@fact-checker` audita contra o ledger (bloqueante, sem waiver), o
`@qa-critic` dá o veredito e o `@exec-producer` empacota.

**Ciclo típico:** 5–10 dias úteis.

---

## P2 · UGC Ads

**Quando usar:** conversão em mídia paga, alto volume, ciclo curto.
**O ativo não é o vídeo** — é a matriz de teste: 1 corpo × N hooks.

### O caminho

Sem `concept`, sem `decupagem`, sem `look`, sem `design`. Isso é deliberado: big idea e
fotografia autoral trabalham **contra** o código de UGC, que precisa parecer
não-produzido.

O `@brief-strategist` fecha oferta, dor e objeção. O `@research-scout` mapeia os hooks em
veiculação. O `@head-of-copy` escreve um corpo e três hooks. O `@character-lead` define o
creator sintético — que é o ativo reutilizável deste pipeline, aproveitado em todo o lote
e nos lotes seguintes daquele cliente.

**⏸ PARADA 1 — Stills do creator**
O card vem com o character sheet anexado. **Gere sempre a partir do sheet original**,
nunca a partir do último frame usado — a deriva se acumula e no quinto asset é outra
pessoa. Devolva em `11-stills/entregues/`.
Se a consistência não se sustentar em 3 ciclos, o `@character-lead` muda a estratégia do
lote em vez de brigar com o modelo: creator de costas, POV ou mãos, com identidade
sustentada por wardrobe e ambiente. É o contorno usado em produção real de UGC.

**⏸ PARADA 2 — Takes**
Mesmo laço. Se o lip-sync não convencer, a rota muda para take sem fala em quadro e a
fala vira VO — é mais barato e é o que a maioria dos anúncios de UGC faz.

**⏸ PARADA 3 — Voz**
Áudio de ambiente preservado, imperfeição mantida. Som limpo demais reduz a credibilidade
neste gênero. CTA falado, nunca em cartela.

**⏸ PARADA 4 — Montagem**
Aqui normalmente **não** se usa After Effects: UGC com motion graphics deixa de parecer
UGC. O `premiere-cut-spec.md` traz o corte cru, os jump-cuts, a legenda queimada e o
export das N variações.
Se uma variação falha, as outras seguem — o lote não trava por uma peça.

**Ciclo típico:** 1–2 dias úteis por lote.

---

## P3 · Nicho Series

**Quando usar:** sketch, sátira e microdrama de bolha, para crescimento de página própria.
**O ativo é o personagem**, não o episódio.

### O caminho

Se não existe bíblia, o job é **piloto** — mesmo que o pedido diga "episódio 4". Episódio
sem bíblia produz um personagem diferente por semana.

O `@research-scout` traz o léxico da bolha (o jargão é o que torna a peça intraduzível
para fora e por isso compartilhável dentro).

**⏸ PARADA 1 — Rota criativa (só no piloto)**
Você escolhe entre 3 rotas. Em episódios de uma temporada já aprovada, o território é
herdado e essa parada **não acontece** — é o que faz o custo cair ao longo da temporada.
Se nenhuma rota estiver afiada, volta para a pesquisa: piada fraca não se conserta na
produção.

Depois o `@showrunner` escreve a bíblia (personagens com **um tique reconhecível** cada,
universo, arco, continuidade), o `@head-of-copy` roteiriza, o `@film-director` decupa e o
`@art-director` trava a continuidade visual.

**⏸ PARADA 2 — Character sheets e stills**
A parada mais importante da temporada inteira, porque tudo depois depende dela. O público
perdoa cenário repetido; não perdoa personagem trocado.
Gere sempre a partir do sheet original. Trave o wardrobe peça a peça — a deriva começa
pela roupa, não pelo rosto.

**⏸ PARADA 3 — Takes**
Plano fixo com micro-movimento é código do gênero, não pobreza. Se o movimento quebra a
continuidade do personagem, prefira o plano fixo.

**⏸ PARADA 4 — Voz**
A voz faz parte da bíblia. Se ela mudar entre episódios, o público percebe.
Regra do gênero: **sem trilha durante a fala**. Trilha entra na tag final e nas transições.

**⏸ PARADA 5 — Montagem**
O timing da piada se decide aqui. Se não fechar, o `@editor` devolve para a decupagem com
o timecode exato do problema. A tag final (o botão, 1–2s depois do clímax) é o que gera
replay — confira que ela existe.

Antes de entregar, o pipeline chama o **P6 em modo embutido** para a capa do episódio.

**Ciclo típico:** 3–5 dias o piloto; ~1 dia por episódio depois da bíblia fechada.

---

## P4 · Oraclum Institucional

**Quando usar:** peça institucional da própria Oraclum, para autoridade e venda de serviço.
**A prova é o sistema rodando** — nunca depoimento, porque a Oraclum não tem case e, por
decisão de marca, não inventa um.

### O caminho

Este pipeline não roda pesquisa nova: a referência vem do monitoramento diário que o
`virals-marketing-squad` já mantém. E não tem `exec-producer` — o `@studio-chief` faz
intake e entrega, porque job interno de peça única não tem cronograma a produzir.

**⏸ PARADA 1 — Rota criativa**
Você escolhe entre 3 rotas. O critério é específico deste gênero: a rota precisa provar
**sem case**. Se nenhuma conseguir, volta ao brief para escolher outra prova disponível —
uma tela, um log, um agente rodando. Nunca se inventa case para fechar a rota.

**⏸ PARADA 2 — Stills**
Atenção ao filtro automático: imagem que cai no clichê de IA (robô apertando mão, cérebro
de circuito, humanoide azul) é reprovada pelo brand-lock. A direção redireciona para
captura de tela real e abstração geométrica.
Paleta obsidian `#08080C` com accent roxo `#A855F7` — a do site real.

**⏸ PARADA 3 — Takes**
Institucional tolera bem plano gráfico: se o I2V não convencer, movimento de câmera sobre
still mais motion graphics no AE resolve.

**⏸ PARADA 4 — Voz**
Normalmente a voz do founder. Peça institucional da própria casa com voz sintética não
declarada contradiz o discurso de transparência da marca — se for esse o caminho, precisa
de aprovação explícita sua.

**⏸ PARADA 5 — Montagem**
Lower-third Oraclum, big number e sublinhado no AE; corte e master no Premiere.
Uma ressalva registrada: o `video-templates.yaml` do cliente Oraclum ainda declara a
paleta antiga (cyan). **Vence o `brand-config`.** A divergência está documentada em
`ARCHITECTURE.md` §7.

**Ciclo típico:** 3–5 dias úteis.

---

## P5 · Dark Room

**Quando usar:** canal sem rosto — YouTube long ou short, TikTok, Reels.
**O ativo é o canal**, não o episódio.

### Pré-requisito que bloqueia

Este é o único pipeline com um **pré-requisito persistente**: o
`channel-brief.yaml` do canal (nicho, tese editorial, voz, assinatura visual, motif
sonoro, tabus, fontes aceitas). Sem ele o job não inicia — vira um job de fundação de
canal, e o `@brief-strategist` escreve o channel-brief primeiro.

Existe porque, sem rosto, o espectador precisa de outro sinal para reconhecer o canal em
um segundo de scroll. Se voz e paleta mudam a cada episódio, nada se acumula.

### O caminho

Não há `brief` por peça nem `concept`: a pauta entra, o `@research-scout` levanta as
fontes e o `@head-of-copy` escreve o roteiro junto com o `mapa-broll.md`, que liga cada
bloco de locução à imagem que o acompanha — com a antecipação de 0,5 a 1 segundo que o
gênero exige (a imagem entra **antes** da palavra que ela ilustra).

**⏸ PARADA 1 — Stills de b-roll**
Aqui vale uma inversão em relação ao P1: b-roll é apoio, não protagonista. Acervo coerente
vence geração ruim com folga. Se a cena é comum — mãos, céu ao amanhecer, silhueta — a
foto real costuma chegar mais perto do que o gerador.
A thumbnail do episódio entra como sub-rotina do P6.

**⏸ PARADA 2 — Takes**
Movimento lento e contínuo. Nenhum plano acima de ~4s, mesmo com locução boa. Se o I2V
não estiver disponível, movimento de câmera sobre still é o baseline correto do formato —
não uma degradação.

**⏸ PARADA 3 — Voz (bloqueante)**
Este é o único pipeline em que a **ausência de voz impede a entrega**. A voz é a
assinatura do canal. Siga a direção: primeira frase é promessa de informação,
nunca saudação; ritmo com variação audível; respiração faz parte.
Trocar de locutor entre episódios reseta o reconhecimento acumulado.

> ⚠️ **Atualizado em 2026-08-29 — esta parada tem rota local.** A narração de episódio de
> dark-room é gerada no `tts-narracao-srt.json` com a **voz canônica do canal** (ChatterBox
> 23L, voz embutida, sem clonagem — decisão do founder). É justamente aqui que "trocar de
> locutor reseta o reconhecimento" fica resolvido de vez: a voz é determinística e não
> depende de um arquivo de referência sobreviver a um backup.
> A saída traz também o **`Adjusted_SRT`**, que entrega a legenda já sincronizada à
> PARADA 4 e elimina a sincronização manual. Ver `docs/NARRACAO-LOCAL.md`.

**⏸ PARADA 4 — Montagem**
Autolegenda por palavra (o formato exige), destaque tipográfico na palavra-chave — nunca
a frase inteira, que competiria com a locução.

O `@fact-checker` aqui é o gate mais caro e o mais importante do estúdio: informação
errada dita com voz confiante derruba o canal inteiro, não só o episódio.

**A entrega trava sem thumbnail.** No YouTube a thumb é metade do produto.

**Ciclo típico:** 4–8 horas por episódio, depois do channel-brief fechado.

---

## P6 · Image Lab

**Quando usar:** imagem pura — thumbnail, key art, foto publicitária de produto, capa de
episódio, carrossel. Vende sozinho **e** atende os outros cinco pipelines.

### Dois modos

**Modo normal:** job próprio, com intake, brief e pesquisa.
**Modo embutido:** chamado de dentro de outro pipeline. Pula intake, brief e research,
herda o brief e o art-spec do job pai, grava em
`{job-pai}/11-stills/subrotina-{asset}/` e devolve o caminho do arquivo. Não abre job
novo — o que evitaria cobrar duas vezes pela mesma peça.

### O caminho

Não há `takes`, `audio` nem `assembly`: não existe timeline em imagem pura. O
`@art-director` fecha layout, tipografia e grid; o `@character-lead` entra só quando o
asset tem personagem recorrente.

**⏸ PARADA ÚNICA — Geração e finalização**
Duas entregas suas, e a distinção importa:

- `11-stills/entregues/` — o **cru** que saiu do gerador
- `11-stills/finalizadas/` — depois da composição tipográfica e da aplicação de marca

Por quê separado: **texto não se gera, se compõe.** Nenhum gerador acerta rótulo,
headline ou logo de forma confiável. A cena vem do modelo, sem texto e com espaço
negativo deliberado onde a headline vai entrar; o texto entra depois, no
`apps/creative-design` ou no Photoshop.

Para **foto publicitária de produto**, a rota padrão nem começa no gerador: fotografe o
produto real, recorte, gere o ambiente por IA e componha. O cliente vende **aquele**
produto — rótulo deformado é reprovação automática no `factcheck`, porque é alteração de
embalagem, não questão de gosto.

O teste mais barato e mais ignorado antes de aprovar qualquer asset: **reduza para 120px**.
Se o sujeito e a emoção não se leem nesse tamanho, não vão se ler no feed.

**Ciclo típico:** 2–8 horas.

---

## Referência rápida — onde você entra, por pipeline

| Parada | P1 | P2 | P3 | P4 | P5 | P6 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Aprovar rota criativa | ✓ | — | ✓ (piloto) | ✓ | — | — |
| Gerar stills | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gerar takes | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Gravar voz / escolher trilha | ✓ | ✓ | ✓ | ✓ | ✓ (bloqueante) | — |
| Montar em AE | ✓ | raro | ✓ | ✓ | ✓ | — |
| Montar em Premiere | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Compor tipografia | — | — | — | — | — | ✓ |

---

## Quando algo dá errado

| Situação | O que acontece |
|---|---|
| A ferramenta recomendada está fora do ar | O card já traz a alternativa e o `se_falhar`. Use e **registre no `_retorno.json`** qual usou |
| Você devolveu menos variações que o pedido | O item entra em `_degraded.md` com o motivo. Não vira "concluído" silenciosamente |
| O agente reprovou seu asset 3 vezes | Escala para o `@studio-chief`. Nessa altura o problema costuma estar no estágio anterior — storyboard, look ou art-spec — não no seu prompt |
| Um claim do roteiro não tem fonte | A linha sai do roteiro. Não existe versão "suavizada" de claim sem fonte |
| O `factcheck` reprovou | A peça volta ao estágio de origem do problema. **Waiver é proibido** nesse gate |
| O `qa-critic` deu CONCERNS | A entrega é liberada com ressalva escrita e ciência sua registrada |
| O job travou e você não sabe onde | `@studio-chief` → `*status {job-id}`. O `job.json` é a única fonte de verdade do estado |

---

## Um lembrete sobre custo

O gargalo deste estúdio **não é crédito de API** — é agenda de pessoa. Por isso o
`@exec-producer` orça o job em número de cards humanos e variações pedidas, não em
créditos.

É também por isso que o Pacote de Direção é o artefato mais importante do squad: cada
tentativa que ele evita vale mais do que qualquer economia de cota.
