# Influencer IA consistente — template do ComfyUI

## Diagnóstico do lote existente

Os cinco `take` usam a mesma seed (`776211`) e o mesmo bloco de aparência. Isso ajuda a convergir, mas não é uma trava de identidade: ao trocar ação e cenário, o modelo reinterpretou o rosto. O refino piorou o problema, inventando e deslocando pintas.

**Seed fixa torna a comparação reprodutível; não torna uma pessoa permanente.**

O ponto de partida recomendado é `C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\output\influencer\personagem_00001_.png`; é candidato a canon, não aprovação implícita.

## Registro de personagem

```yaml
character_id: influencer-piloto
tipo: creator-sintetica
disclosure_publico: obrigatorio
canon:
  arquivo_esperado: canon.png
  candidato_atual: personagem_00001_.png
  regra: "Depois de aprovado, canon.png não é substituído por uma geração mais bonita; toda cena parte dele."
atributos_travados:
  faixa_etaria_aparente: "26–29"
  pele: "morena clara, subtom quente-neutro, textura natural sem filtro de beleza"
  rosto: "oval, maçãs altas, mandíbula suave"
  olhos: "castanho-escuros, amendoados"
  sobrancelhas: "escuras, espessas, naturais, arco suave"
  cabelo: "castanho-escuro liso, na altura dos ombros, repartido ao meio"
  boca: "lábios cheios, sorriso fechado e suave"
  acessorios: "argolas pequenas douradas"
  sinal_distintivo: "uma única pinta discreta na bochecha esquerda; posição e quantidade não variam"
```

Antes de seguir, o founder escolhe um retrato frontal sem produto no rosto e sem refino generativo; o operador salva uma cópia como `canon.png`. Todo take futuro consulta esse arquivo, nunca o último frame gerado.

## Moodboard de identidade

O moodboard não é uma colagem de rostos parecidos. É uma folha de validação do mesmo rosto:

| quadro | pose | finalidade |
|---|---|---|
| C01 | frontal, neutra | canon e comparação facial |
| C02 | 3/4 esquerdo | nariz, maçã e pinta |
| C03 | 3/4 direito | linha do cabelo e orelha |
| C04 | perfil esquerdo | silhueta de nariz e mandíbula |
| C05 | meio-corpo | proporção corporal e roupa-base |
| C06 | sorriso aberto | dentição e expressão |
| C07 | luz de janela suave | pele em condição normal |
| C08 | luz externa quente | teste de identidade fora do set |

Reprovar um quadro se a pinta mudar de lado/quantidade ou se cabelo, sobrancelhas, olhos, mandíbula ou tom de pele mudarem.

## Bloco de prompt fixo

```text
same recurring synthetic creator "influencer-piloto"; Brazilian woman, apparent age 27; warm light-brown skin with natural texture; oval face, high cheekbones and soft jawline; dark-brown almond eyes; thick natural dark eyebrows with a soft arch; straight dark-brown shoulder-length hair, exact center part; full lips and a soft closed smile; small gold hoop earrings; exactly one subtle beauty mark on her left cheek. Preserve facial geometry, hairline, eyebrow shape, eye color and the single beauty mark from canon.png.
```

Negativo:

```text
different person, changed identity, different face shape, different skin tone, changed hairline, side part, bangs, thin eyebrows, blue or green eyes, multiple moles, mole on the right cheek, missing mole, beauty filter, plastic skin, text, logo, watermark, deformed hands, extra fingers, extra limbs, distorted face, asymmetric eyes
```

## Grafo obrigatório para cenas finais

```text
LoadImage(canon.png)
  → controlador de identidade facial compatível com o modelo-base
  → condicionamento positivo: bloco fixo + ação/cenário da cena
  → sampler com seed do lote registrado
  → VAE Decode → SaveImage
```

O controlador de identidade é indispensável. A instalação atual tem GGUF, Impact Pack, upscale e interpolação, mas não possui nó de identity/face reference. Logo, o grafo atual de texto + seed não consegue garantir consistência final. Antes de produção, acrescentar uma rota compatível: adaptador de identidade para o modelo-base escolhido **ou** LoRA de personagem treinada e carregada no grafo.

## Escada de decisão

1. Testar o canon com referência de identidade em três cenas-piloto, mantendo seed `776211`.
2. Se as três não preservarem os atributos travados, treinar LoRA de personagem com 20–30 imagens aprovadas da folha, variando ângulos, luz e fundos. Nunca treinar só os cinco takes atuais.
3. Depois da LoRA aprovada, usar canon para controle visual e LoRA para estrutura. Cenário e figurino entram pelo prompt; identidade nunca entra apenas por texto.

## Pacote por cena

```yaml
asset_direction:
  asset_id: "{{cena}}"
  referencia_identidade: "{{caminho}}/canon.png"
  seed_lote: 776211
  acao_e_cenario: "{{descrever somente o que muda}}"
  roupa: "{{descrever somente o que muda}}"
  controlador_identidade: "{{nome/modelo/peso validado}}"
  lora_personagem: "{{arquivo e peso, se aplicável}}"
  aceitar_se:
    - "mesma estrutura facial, cabelo e sobrancelhas do canon"
    - "uma pinta no lado esquerdo; nenhuma pinta extra"
    - "mãos e produto estruturalmente corretos"
  reprovar_se:
    - "rosto novo, pintas migradas ou cabelo/olhos alterados"
    - "texto ou rótulo ilegível gerado pela IA"
```

## Refino e vídeo

- Não usar FaceDetailer enquanto a identidade não estiver travada: ele pode melhorar textura e trocar identidade. Validar primeiro o frame cru.
- Para vídeo, partir do still aprovado (I2V), não de texto. O quadro de entrada é o cru aprovado, sem upscale. No piloto, usar movimentos curtos e mãos fora de close.
- A creator é sintética: usar disclosure apropriado na publicação e verificar que o canon não se assemelha materialmente a pessoa pública ou pessoa real identificável.
