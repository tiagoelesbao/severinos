# Embalagem — 2026-09-07-penalti-cruzeiro

> Etapa 1 da esteira. Vem **antes** do roteiro: o roteiro cumpre a promessa do
> título, e não o contrário.

## ESCOLHIDO PELO FOUNDER — 07/09

**Título:** `A CASA CAIU NO CRUZEIRO: ENTENDA A TRETA ENTRE KAIO JORGE E MATHEUS PEREIRA`

| | |
|---|---|
| Nota | **100/100** |
| Caracteres | **75** |
| Imediatismo | `A CASA CAIU` |
| Curiosidade | `TRETA` (tensão) |
| Resolução | `ENTENDA` |
| Risco | **B2** — insinua conflito, sem citar fala |
| Corte do feed | os três pilares cabem antes do 55 |

**Thumb:** faixa superior `BRIGA PELO PÊNALTI` (verde + filete amarelo, a
assinatura do canal), dois painéis com divisão no centro exato, e uma frase em
amarelo embaixo de cada jogador:

| Painel | Frase |
|---|---|
| Kaio Jorge (esquerda) | `VOCÊ NÃO FEZ O GOL` |
| Matheus Pereira (direita) | `MOSTROU O DEDO DO MEIO E MANDOU A MERD4` |

**ESCOLHIDA: F3 — Segoe UI Black** (`thumb-F3.png`, copiada para
`thumb-final.png`). A faixa do topo continua em Impact: ela é a assinatura do
canal e não varia com a legenda.

As outras duas ficam no pack para comparação: `thumb-F1.png` (Impact, a que
mais aguenta os 168 px) e `thumb-F2.png` (Arial Black).

### O que foi corrigido em relação ao primeiro corte

**Cabeça cortada.** O enquadramento anterior comia o topo da cabeça do Kaio
Jorge. Agora o recorte de cada painel nasce do `topo_cabeca` medido na foto,
com `FOLGA_TOPO` declarada — e recorta já na proporção final, para não haver
corte-surpresa do `cover`.

**Divisão fora do centro.** O fio estava em 39,2% da largura, seguindo o vão que
a própria foto deixa entre os dois. Numa thumb de confronto o olho espera
simetria, e assimetria sem motivo lê como erro de montagem. Agora o fio está em
640 — o centro exato — e são os recortes que se ajustam a ele.

**Peso desigual entre os lados.** A frase da esquerda tem 18 caracteres e a da
direita 39: sozinhas, uma fechava em 1 linha e a outra em 3, e o bloco mais alto
puxava o olho. As duas agora saem no mesmo corpo e no mesmo número de linhas.

---

## RECOMENDAÇÃO ORIGINAL (mantida para registro)

**Título:** `KAIO JORGE TOMOU A BOLA E MUDOU TUDO: ENTENDA O QUE A TV PEGOU`
**Thumb:** `BRIGA PELO PÊNALTI` (topo) + `E O DEDO SUBIU` (base)

| | |
|---|---|
| Nota (pontuador `pilares.py`) | **100/100** |
| Caracteres | **62** |
| Imediatismo | `MUDOU TUDO` |
| Curiosidade | `O QUE` (lacuna) |
| Resolução | `ENTENDA` |
| Risco | **A** — afirma o que as fontes sustentam |
| Thumb repete o título? | **0%** |

**Por que este.** É o único candidato de nota 100 que afirma o fato sem depender
de insinuação, e o fato aguenta: o cobrador oficial pediu a bola, o companheiro
negou, bateu e fez o gol — e a câmera pegou a discussão logo depois. Não precisa
de "?!" nem de "treta" para ficar de pé.

E "O QUE A TV PEGOU" é literal, não figura de linguagem: quem entrega o vídeo é
a imagem da Globo, e a leitura labial saiu dela.

## Candidatos pontuados

| Nota | Ch | Estrutura | Título |
|---|---|---|---|
| **100** | **62** | **A** | **KAIO JORGE TOMOU A BOLA E MUDOU TUDO: ENTENDA O QUE A TV PEGOU** |
| 100 | 61 | B1 | O CRUZEIRO EXPLODIU POR UM PÊNALTI?! ENTENDA O QUE A TV PEGOU |
| 100 | 53 | B2 | TRETA EXPLODIU NO CRUZEIRO: O QUE A TV PEGOU. ENTENDA |
| 100 | 62 | B2 | VEIO À TONA O QUE KAIO JORGE DISSE NO PÊNALTI. ENTENDA A TRETA |
| 80 | 64 | B2 | A CASA CAIU NO CRUZEIRO: O QUE VAZOU DO PÊNALTI. ENTENDA A TRETA |
| 80 | 63 | B2 | NINGUÉM ESPERAVA: O QUE A TV PEGOU NA TRETA DO PÊNALTI. ENTENDA |

Os de nota 80 caem por **corte de feed**: um dos três pilares fica depois do
caractere 55 e some na sugestão do celular.

**O motor por molde (`gerador.py --json`) não passou de 70** nesta pauta, e o
motivo é do fato: sujeito e alvo são dois nomes longos, e os moldes repetiam
"Matheus Pereira" duas vezes na mesma linha. Os candidatos acima foram escritos
à mão e julgados pelo mesmo pontuador — que é a parte que decide.

## Thumb

```yaml
texto_principal: 'BRIGA PELO PÊNALTI'
texto_secundario: 'E O DEDO SUBIU'
elemento_visual: 'Kaio Jorge e Matheus Pereira lado a lado, fio branco entre os dois, câmera de TV entrando pela direita'
emocao: 'tensão contida'
sistema: 'bora-de-bola/thumb-system.yaml'
```

`E O DEDO SUBIU` é **descrição do que a câmera mostrou** — o ge registra que
"Matheus Pereira chega a levantar o dedo". Não é aspas atribuída, e isso importa:
o diálogo do pênalti veio de **leitura labial**, cujo próprio autor declarou
margem de erro. Frase de leitura labial não vai para thumb como se fosse citação.

**Ressalva de direito:** a foto é de matéria (Gustavo Aleixo / Cruzeiro, via
Jogada10) — rota 4 do `fontes_imagem.py`, a única com ressalva. O retrato da ESPN
não existe para nenhum dos dois (headshot cobre ~6% do elenco). Decisão de uso é
do founder.

## Promessa — o contrato com o roteiro

**Nos primeiros 45 segundos o espectador precisa saber:** que Matheus Pereira é o
cobrador oficial, que ele tinha perdido um pênalti no primeiro tempo, que pediu
a bola de volta na segunda cobrança e ouviu não de Kaio Jorge — e que a discussão
continuou depois do gol, com o dedo levantado, diante da câmera.

**O que o vídeo entrega até o fim:** o diálogo segundo a leitura labial (com a
ressalva de que é leitura labial), o que o elenco disse sobre o vestiário, e o
detalhe que ninguém comentou — que Matheus postou foto abraçado com Kaio e Kaio
postou o 50º gol sem nenhuma imagem do companheiro.

## Âncora

| Claim | Fonte |
|---|---|
| Kaio pegou a bola e negou a Matheus; Matheus era o cobrador principal | ge.globo · `cruzeiro-x-athletico-pr-veja-o-que-matheus-pereira-teria-dito…` |
| Matheus perdera pênalti no 1º tempo, defesa de Mycael, no 1 a 1 | Jogada10 · `leitura-labial-detalha-treta…` |
| Diálogo da leitura labial (Velloso) **com margem de erro declarada** | Jogada10 + ge.globo |
| "Eles se resolveram no vestiário" — João Marcelo | ge.globo · `bastidores-como-ficou-o-clima…` |
| Fagner no antidoping, liberado 2h após o apito | ge.globo · idem |
| Kaio postou o 50º gol sem imagem com o companheiro | ge.globo · idem |
