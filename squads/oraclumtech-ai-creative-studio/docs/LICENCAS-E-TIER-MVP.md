# Licenças da pilha e o tier MVP de direitos confirmados

> 2026-09-12. Cada afirmação abaixo veio do **texto da licença** ou do model
> card oficial, não de resumo de terceiros — porque foi exatamente assim que eu
> errei antes.

---

## Correção: eu disse que o H3 era não-comercial. Não é.

No levantamento anterior eu reportei que o MiniMax H3 tinha licença
**não-comercial**. Peguei isso de um artigo de análise. Fui ler o
`LICENSE` oficial e ele diz o contrário.

Isso muda a recomendação, então vale a correção explícita antes de qualquer
plano.

---

## 1 · O que a licença do H3 diz de verdade

**MiniMax H3 Community License Agreement:**

| item | o que diz |
|---|---|
| **Uso comercial** | **Permitido** dentro do território aplicável |
| **Território** | O mundo **menos** União Europeia, Reino Unido, Coreia do Sul e Estados Unidos. **O Brasil está dentro.** |
| **Teto de receita** | Acima de **US$ 20 milhões/ano** exige autorização escrita prévia da MiniMax |
| **Atribuição** | Produto comercial **deve exibir "MiniMax H3" de forma proeminente na interface**. Recomendado também "Powered by MiniMax H3" |
| **Redistribuição** | Deve carregar o aviso *"MiniMax H3 is licensed under the MiniMax H3 Community License Agreement"* |
| **Quem é dono do que sai** | *"MiniMax claims no rights over the Outputs you generate."* **A saída é sua.** |

Para EUA/UE/Reino Unido/Coreia existe **formulário de solicitação** — não é
proibição absoluta, é autorização prévia.

### Respondendo direto às suas perguntas

**Posso postar nas minhas redes para gerar audiência?** Sim. A MiniMax não
reivindica direito sobre a saída, e a Oraclum opera do Brasil, dentro do
território, muito abaixo dos US$ 20 M. Conteúdo próprio em rede social é o caso
mais tranquilo que existe aqui.

**Onde está o limite, na prática?** Em três lugares, e nenhum é o que você
imaginava:

1. **Os 768 px.** Não é licença, é técnica — o módulo `H3-Regenerate-2K` **não
   foi liberado**, o model card diz isso com todas as letras. Local trava em 768
   de lado menor. 2K só pela API deles.
2. **A atribuição.** É o único ônus real de uso comercial. Ver §3.
3. **Os US$ 20 M/ano.** Irrelevante hoje; vira relevante num cenário ótimo.

---

## 2 · Sobre detecção — e por que é a pergunta errada

Vou responder o que foi perguntado e depois dizer por que eu não construiria
nada em cima disso.

**A resposta técnica:** peso aberto rodando na sua máquina não tem telemetria,
não chama casa e não marca d'água. Não existe mecanismo pelo qual a MiniMax
saiba que você rodou o modelo. O que existe é **assinatura visual** — modelos
de vídeo têm jeito de mexer a câmera, tratar pele e fechar movimento, e gente
da área reconhece. Mas isso identifica no máximo *"parece H3"*, e parecer não
prova nada.

**Por que a pergunta é a errada:** neste caso, **a licença já permite o que
você quer fazer.** Não há o que esconder. E a "detecção" que importa numa
operação que assina contrato com cliente não é a do fornecedor do modelo — é a
**revisão jurídica do cliente**. Agência grande, banco, varejo: vão perguntar de
onde veio o vídeo, e a resposta "peso aberto sob licença comunitária, dentro do
território, com atribuição" é uma resposta boa. "Ninguém vai descobrir" não é.

Custa uma linha de crédito. Não vale o risco de reputação de tratar como
clandestino algo que é legítimo.

---

## 3 · A atribuição, e a pergunta que ela abre

> *"must prominently display 'MiniMax H3' on the user interface"*

A obrigação fala de **produto ou serviço com interface**. Isso é claro num app
ou site. Numa **peça de vídeo entregue a um cliente**, não é óbvio o que conta
como "interface".

Leitura conservadora, que é a que eu adotaria:

- **Conteúdo próprio da Oraclum** (rede social, portfólio, demo): crédito na
  descrição do post ou nos créditos finais. Barato e resolve.
- **Peça entregue a cliente**: o "produto" é o serviço da Oraclum. O caminho
  seguro é declarar no **contrato/proposta** quais modelos foram usados, e pôr
  o crédito onde a peça tiver créditos.
- **Produto com interface** (se um dia houver um painel para o cliente gerar):
  aí é literal — "MiniMax H3" visível na tela.

Não sou advogado e isto não é parecer. É a leitura de quem leu o texto. Se a
operação crescer para contrato grande, vale meia hora de advogado.

---

## 4 · O mapa de licenças da nossa pilha — e o bloqueio real

Aqui está o achado que importa mais que o H3.

| modelo | onde usamos | licença | comercial? |
|---|---|---|---|
| **Flux 2 Klein 9B** | CCC, Movie Builder (imagem), ambiente 360 | **FLUX Non-Commercial** | ❌ **NÃO** |
| **Flux 2 Klein 4B** | — (não usamos ainda) | **Apache 2.0** | ✅ sim |
| **Wan 2.1 / 2.2** | validado, fora do pipeline atual | **Apache 2.0** | ✅ sim |
| **LTX 2.3** | Movie Builder (vídeo) | LTX Model License | ✅ abaixo de **US$ 10 M**/ano |
| **MiniMax H3** | candidato | Community License | ✅ abaixo de **US$ 20 M**/ano, com atribuição |
| RealESRGAN / 4x-UltraSharp | upscale | BSD-3 / permissiva | ✅ sim |

> ### O bloqueio é o Klein 9B, não o H3.
>
> Tudo que construímos — CCC, dataset do Bruno, ambiente 360, metade de imagem
> do Movie Builder — roda no **9B, que é não-comercial**. É o único item da
> pilha que impede entregar peça paga, e está no centro de tudo.
>
> A aula do MickMumpitz avisa isso, aliás: *"The 9B version features better
> quality, but is for non-commercial purposes only, unless you acquire a
> license."* Eu registrei no plano e não puxei a consequência até agora.

**A saída é barata:** o **4B é Apache 2.0** e faz o mesmo trabalho com menos
qualidade. E — sorte nossa — o acervo já tem a
`flux-2-klein-4B-360-erp-outpaint-lora_V1.safetensors`, a versão 4B da LoRA de
panorama.

---

## 5 · O tier MVP — direitos confirmados, custo mínimo

A pilha inteira com licença que permite venda, sem nenhuma negociação:

```
IMAGEM      Flux 2 Klein 4B            Apache 2.0
VÍDEO       Wan 2.2                    Apache 2.0        ← já validado aqui
  ou        LTX 2.3                    livre < US$ 10 M
  ou        MiniMax H3 (GPU alugada)   livre < US$ 20 M + atribuição
VOZ         nosso TTS clonado          conferir a licença do engine
UPSCALE     RealESRGAN                 BSD-3
AMBIENTE    LoRA 360 ERP 4B            segue o modelo base
```

### O que muda no que já existe

| workflow | hoje | no tier MVP |
|---|---|---|
| `CCC-4.01-AIOX-BASE` | Klein 9B | trocar `UNETLoader` para 4B + LoRA de consistência 4B |
| `AMBIENTE-360` | Klein 9B + LoRA 360 9B | trocar os dois pelos 4B |
| `MOVIE-BUILDER-IMPERIO` | Klein 9B + LTX 22B | Klein 4B + Wan 2.2 ou LTX |

É **troca de nome de arquivo em nó de loader**, não reescrita de grafo. Um
script faz, como os outros.

### A escada de custo, agora com direitos ao lado

| tier | pilha | custo/peça 30 s | direitos |
|---|---|---|---|
| **0 · MVP local** | Klein 4B + Wan 2.2, tudo local | **R$ 0** | ✅ Apache 2.0, sem ressalva |
| **1 · MVP alugado** | o mesmo, numa 4090 | **≈ R$ 8** | ✅ igual |
| **2 · H3 alugado** | Klein 4B + H3 numa 4090 | **≈ R$ 8** | ✅ com atribuição |
| **3 · API** | Klein 4B + Kling/Seedance | R$ 28 a 110 | ✅ licença do fornecedor |
| **—** | qualquer coisa com **Klein 9B** | — | ❌ **não vender** |

**Para escalar MVP com retorno**, o tier 0 e o 2 são os que interessam: custo
perto de zero e direito limpo. A diferença entre eles é qualidade de movimento
— e essa decisão agora tem preço conhecido.

---

## 6 · O que fazer, em ordem

1. **Rodar `--klein-4b`** nos três workflows e comparar a qualidade lado a lado
   com o 9B. Se a queda for aceitável, o problema jurídico some de graça.
2. **Medir o Wan 2.2** como motor de vídeo do Movie Builder — já foi validado
   aqui em outro contexto, e é Apache 2.0 puro, sem teto de receita nem
   atribuição.
3. **Testar o H3 alugado** (guia em `TESTE-H3-GPU-ALUGADA.md`), agora sabendo
   que dá para vender o resultado.
4. **Conferir a licença do engine de TTS** que usamos na clonagem — é o único
   item da tabela que ficou sem confirmação.

---

## Fontes

- [MiniMax H3 · LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE)
- [MiniMax H3 · model card](https://huggingface.co/MiniMaxAI/MiniMax-H3)
- [FLUX.2-klein-9B · LICENSE](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/blob/main/LICENSE.md)
- [FLUX.2-klein-4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)
- [Wan2.2 · LICENSE](https://github.com/Wan-Video/Wan2.2/blob/main/LICENSE.txt)
- [LTX · licenciamento comercial explicado](https://ltx.io/blog/ltx-licensing-explained)
