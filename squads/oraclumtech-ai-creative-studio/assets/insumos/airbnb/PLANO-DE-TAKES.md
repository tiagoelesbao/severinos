# Plano de takes — peça para hospedagem (Airbnb)

> **Entregável:** vídeo curto para o dono divulgar em Instagram, TikTok e Meta Ads.
> **Regra que manda em tudo:** o hóspede precisa encontrar o lugar que viu.
> Nada de cenário inventado. Só ângulo, movimento e ritmo sobre o que existe.

---

## O erro que este plano corrige

A primeira tentativa gerou **interiores genéricos por texto** — apartamento
escandinavo minimalista, branco, urbano. A propriedade real é o oposto: sítio
tropical brasileiro, deck de madeira, pergolado de bambu, ofurô, piscina de mármore
preto, Mata Atlântica ao fundo.

Peça de hospedagem que mostra um lugar que não existe não é peça ruim — é
**propaganda enganosa**, e o dano cai no dono do imóvel, não em nós. O `fact-checker`
tem gate para isso e ele teria travado a entrega.

**A rota certa não é text-to-image. É image-to-video sobre a foto real.**

---

## O acervo — o que existe de verdade

| # | Arquivo | Formato | Momento | Conteúdo real |
|---|---|---|---|---|
| 1 | `02.webp` | 720×960 retrato | **dia** | Estabelecimento amplo: casa de telha, **serra da Mata Atlântica**, piscina, fogueira apagada, caminho de pedra sobre grama, cadeira de vime com pele de carneiro |
| 2 | `01.webp` | 1200×900 paisagem | **dia** | Deck de madeira, pergolado de bambu, **ofurô**, piscina com parede de mármore preto, plantas tropicais, palmeiras, céu azul |
| 3 | `05.png` | 720×960 retrato | **noite** | Piscina **iluminada em azul**, palmeiras em silhueta, mármore preto com fita de luz, céu de chuva, boia verde |
| 4 | `04.png` | 1440×1920 retrato | **noite** | Parede turquesa, **fogueira acesa**, cadeira-ovo suspensa, cadeiras de vime com pele, lanternas, churrasqueira de tijolo, mesa posta |

**O arco já está no acervo:** dia → noite. Não precisa inventar nada para ter história.

---

## A narrativa

> **"Onde é" → "o que você usa" → "como fica quando escurece" → "a sensação de ficar"**

Quatro takes, quatro batidas. O clímax emocional é a fogueira, não a piscina — é o
plano que vende *permanência*, e permanência é o que faz reservar mais de uma noite.

---

## Os takes

Movimentos escolhidos em `data/camera-moves.yaml`, **todos de risco baixo em I2V** —
peça de cliente não é lugar de apostar em movimento composto.

### Take 1 — Estabelecimento · `02.webp` · dia
- **Movimento:** `tilt-up` lento, da piscina para a serra
- **Por quê:** responde "onde é" antes de "o que tem". A serra é o diferencial que o
  hóspede não encontra na cidade — e revelá-la por movimento vale mais que mostrá-la parada.
- **Duração:** 65 frames (~4,1 s a 16 fps)
- **Som:** ambiência de mata — pássaros, folhagem, vento distante

### Take 2 — O deck · `01.webp` · dia
- **Movimento:** `push-in` suave em direção ao ofurô
- **Por quê:** aproxima do que a pessoa vai *usar*. O ofurô é o item de desejo do anúncio.
- **Duração:** 49 frames (~3,1 s)
- **Som:** água em movimento, ambiência de dia, folhas

### Take 3 — A virada · `05.png` · noite
- **Movimento:** `push-in` lento na piscina iluminada
- **Por quê:** é o corte que muda o filme. Mesmo lugar, outro estado. Vende a ideia de
  que o dia acaba e o lugar continua.
- **Duração:** 49 frames (~3,1 s)
- **Som:** grilos, água parada, chuva leve ao longe

### Take 4 — A permanência · `04.png` · noite
- **Movimento:** `push-in` na fogueira, fechando no fogo
- **Por quê:** clímax. Fogo em movimento é o único elemento do acervo com vida própria —
  o modelo tem material real para animar, e o resultado tende a ser o mais convincente.
- **Duração:** 65 frames (~4,1 s)
- **Som:** crepitar do fogo, grilos, ambiência noturna

**Total bruto:** ~14,4 s. Depois do corte, peça de 12–15 s — a duração certa para Reels,
TikTok e Meta Ads.

---

## Regras de fidelidade (entram no prompt negativo de todo take)

O modelo tende a *melhorar* a cena. Aqui, melhorar é falsificar.

- Não adicionar móvel, planta, pessoa, animal ou construção que não esteja na foto
- Não mudar cor de parede, de água ou de piso
- Não trocar dia por noite nem alterar o clima
- Não inventar vista, montanha ou horizonte além do enquadramento
- Não inserir texto, marca d'água ou legenda no pixel
- Câmera se move; **o cenário fica parado**

---

## Formato

- **9:16** — três das quatro fotos já são retrato, e o destino é Reels/TikTok/Ads
- O take 2 (`01.webp`, paisagem) entra recortado ao centro, ou como o único plano
  horizontal, decisão do corte
- Base 16 fps → RIFE 2x → 32 fps
- `length` sempre `4n+1`

---

## Trilha e som

**Trilha:** um leito só, contínuo, do primeiro ao último frame — corte de música em
peça de 14 s quebra a sensação. Mood: tropical calmo, orgânico, com respiração.
Não usar o leito genérico já gerado (`trilha-hospedagem_00001.flac`, que foi escrito
para "modern real estate"): esta propriedade pede madeira, água e mata, não escritório.

**Efeitos:** camada por take, conforme acima. O corte dia→noite (take 2 → 3) é onde um
`whoosh` discreto ou uma queda de ambiência resolve a transição sem precisar de
transição visual.

**Ordem de produção:** takes primeiro, trilha depois — a música se ajusta ao corte,
não o contrário.

---

## O que ainda não está resolvido

- **Foley sincronizado** não existe no stack (lacuna P3 parcialmente fechada). O som
  entra na montagem, não sai do motor de vídeo.
- **Expandir ângulo** de um mesmo ambiente exige consistência que o stack local ainda
  não tem validada. Por ora, um take por foto — quatro fotos, quatro takes. Multiplicar
  ângulos vem depois que a consistência estiver provada.
