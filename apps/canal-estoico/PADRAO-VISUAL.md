# MODERN ESTOICISM — sistema de thumbnail

> **Por que um sistema, e não gosto episódio a episódio**
> Reconhecimento é o único ativo que um canal acumula com o tempo. Ele se
> constrói quando a thumb do episódio 40 é da mesma família da do episódio 1 —
> e se perde na primeira que resolve ser diferente.
>
> Este arquivo é normativo. Se um episódio pede algo que ele não prevê, o
> arquivo muda ANTES da thumb, e muda para todos os episódios seguintes.
>
> Mesmo papel que `workspaces/businesses/virals/creative-studio/canais/bora-de-bola/thumb-system.yaml`
> cumpre no canal de futebol — e deliberadamente com regras opostas.

---

## Parte 1 — O que os prints mostram

**Base:** `assets/image copy 91.png` … `image copy 95.png`.

**Primeira correção, antes de qualquer conclusão: são quatro referências, não
cinco.** `image copy 94.png` e `image copy 95.png` são o mesmo screenshot,
byte a byte no conteúdo visível (canal *The Stoic Mode*). Os quatro canais
distintos são:

| Print | Canal | Idioma | Registro |
|---|---|---|---|
| 91 | (sem assinatura visível) | PT-BR | sans pesada, busto Marco Aurélio |
| 92 | PSYCHORESTO | PT-BR (thumb em EN) | sans pesada, busto de pedra cinza |
| 93 | (sem assinatura visível) | ES | serifada, figura "Zeus musculoso" |
| 94/95 | THE STOIC MODE | EN | serifada, figura 3D com pele |

### O que o briefing já tinha certo

- Figura monumental de um lado, texto do outro, sem sobreposição.
- Caixa alta, 2 a 4 linhas empilhadas.
- Branco + dourado.
- Fundo escuro; luz âmbar.
- **Zero X, zero seta, zero emoji, zero etiqueta.** Confirmado nos quatro,
  sem uma única exceção em 36 thumbs.

### O que passou despercebido — e muda decisão

**1. São DOIS registros tipográficos, não um.**
Prints 91 e 92 usam sans condensada pesadíssima (família Anton/Archivo Black).
Prints 93 e 94/95 usam serifada de alto contraste (família Playfair/Bodoni).
Não é ruído: é escolha de gênero. A sans diz "dica que funciona"; a serifada
diz "doutrina antiga". Os dois performam. **É uma decisão que precisa ser
tomada e travada, não herdada por acidente** — por isso os cinco estilos
renderizados cobrem os dois.

**2. A figura NÃO é sempre à esquerda.**
Esquerda: 91, 93. Direita: 92, 94/95. Metade e metade. O invariante não é o
lado — é que **figura e texto nunca se sobrepõem** e que **a figura olha para
dentro do quadro**, na direção do texto. Busto olhando para fora joga o olho de
quem rola a tela para fora junto.

**3. O dourado é uma LINHA, não uma palavra.**
`TORNE-SE / **IMPOSSÍVEL** / DE PROVOCAR` — a linha inteira em dourado.
`7 LAWS FOR / **BUILDING** / WILLPOWER LIKE STEEL` — duas linhas.
`ESCUTE ISSO / TODAS AS / **MANHÃS**` — a linha final.
A unidade de realce é a linha; grifar uma palavra no meio de uma linha branca
não aparece em nenhum dos 36.

**4. Três dos quatro canais assinam com um wordmark discreto.**
`PSYCHORESTO`, `THE STOIC MODE` — centralizado no rodapé, letra espaçada,
contraste **baixo** (mal se lê aos 168px). É o equivalente do selo do canal de
futebol, mas com a lógica invertida: existe para quem já assiste reconhecer,
não para vender a quem não conhece.

**5. O nicho já pratica complementaridade entre título e thumb.**
| Thumb | Título |
|---|---|
| `EVOLUA MESMO SOZINHO` | APRENDA A EVOLUIR MESMO QUANDO NINGUÉM ACREDITA EM VOCÊ |
| `VIDA SIMPLE` | La mitad de tus PROBLEMAS DESAPARECE cuando ENTIENDES ESTO |
| `NÃO REAJA A NADA` | NÃO REAJA A NADA - O QUE FAZER QUANDO TUDO… |

Duas de três reescrevem; a terceira repete e é a exceção. O canal foi ao ar com
50% de repetição — **não é rigor do nosso método, é o padrão do nicho que não
estava sendo seguido.**

**6. O NÚMERO fica no título e não entra na arte.**
"8 ATITUDES", "12 REFLEXÕES", "7 SEGREDOS", "10 SACRIFICIOS" — nenhum desses
numerais aparece na thumb. A thumb carrega a frase; o número carrega a busca.

**7. Print 93 reusa a MESMA figura nas nove thumbs da grade.**
Não é preguiça, é reconhecimento: a grade inteira se lê como um canal só. Nosso
pack do LA3 tem 11 imagens diferentes; usar uma diferente por episódio joga fora
exatamente esse ativo. **Decisão pendente para o dono do canal** — ver § Pendências.

**8. Nem toda frase é imperativa.**
Imperativas dominam (~70%): TORNE-SE, PARE DE, ESCUTE, EVOLUA, IGNORE, DESTRUA.
Mas existem declarativas de estado — `HAPPY. WHOLE. ALONE.`, `VIDA SIMPLE`,
`NO FRIENDS?` — e a de melhor desempenho na grade do print 94
("Never React, Never Explain, Just Ignore", **421 VPH**) é uma delas.

**9. O lado do TEXTO é quase preto, não "escuro com âmbar".**
O âmbar está no lado da FIGURA, como luz de recorte. Onde a letra pousa, o fundo
é chapado escuro. Foi o defeito da nossa primeira renderização: véu fraco demais
e a letra branca em cima do mármore claro.

**10. O canto inferior direito fica livre.**
É onde o YouTube desenha a pílula de duração. Nenhuma das 36 encosta texto ali.

---

## Parte 2 — O sistema (normativo)

```yaml
formato:
  tamanho: 1280x720
  proporcao: '16:9'
  peso_maximo: '2 MB'
  teste_obrigatorio: >
    Toda thumb é avaliada reduzida a 168px de largura — o tamanho real no feed de
    sugeridos do celular. O que não se lê aos 168px não existe.

# ───────────────────────────────────────────────────────────────────────────
# COR
#   Paleta cruzada entre a identidade do canal (`estoico-marmore-templo`, em
#   squads/oraclumtech-ai-creative-studio/data/identidades-visuais.yaml) e o
#   dourado medido nos prints — que é ÂMBAR, não amarelo-limão.
# ───────────────────────────────────────────────────────────────────────────
cor:
  profundo: '#0A0908'      # preto quente — o lado do texto é isto
  sombra: '#12181A'        # a sombra azul-esverdeada da identidade
  ouro: '#E3B04B'          # o dourado do nicho
  ouro_claro: '#FBE9B8'    # topo do gradiente
  ouro_baixo: '#D49A3E'    # base do gradiente
  tinta: '#F4EFE6'         # branco de mármore — NUNCA #FFFFFF puro

  regra_do_ouro: >
    O dourado carrega UMA LINHA por thumb, nunca duas, nunca uma palavra solta
    no meio de uma linha branca. Se duas linhas parecem merecer, a copy está
    errada, não a cor.

  proibido:
    - amarelo-limão (#FCCC0C e vizinhos) — é a cor do canal de futebol
    - vermelho de alerta em qualquer uso
    - branco puro #FFFFFF (o mármore da identidade é quente)
    - qualquer terceira cor

# ───────────────────────────────────────────────────────────────────────────
# TIPOGRAFIA — dois registros, e a escolha é de GÊNERO
# ───────────────────────────────────────────────────────────────────────────
tipografia:
  registro_sans:
    familia: Anton
    quando: 'prática, método, lista com número — "dica que funciona"'
    observado_em: [print 91, print 92]
    vantagem: 'sobrevive melhor à redução a 168px — traço grosso'
  registro_serifada:
    familia: Playfair Display 900
    quando: 'princípio, aforismo, memento mori — "doutrina antiga"'
    observado_em: [print 93, print 94/95]
    cuidado: 'traço fino some aos 168px; exige corpo maior e fundo mais escuro'

  arquivos: 'apps/canal-estoico/thumb/fontes.css (base64, gerado por fontes.py)'
  origem: 'apps/video-studio/public/fonts/ — as mesmas do estúdio, para capa e
           vídeo não terem tipografias diferentes'
  caixa: ALTA sempre
  palavras:
    maximo_por_linha: 3
    linhas: '2 a 4'
    por_que: >
      Aos 168px cada palavra ocupa espaço real. Três por linha é o limite em que
      a linha ainda se lê; acima disso vira textura.

# ───────────────────────────────────────────────────────────────────────────
# GRADE
# ───────────────────────────────────────────────────────────────────────────
grade:
  layout: 'FIGURA de um lado · TEXTO do outro — nunca sobrepostos'
  lado_da_figura: 'esquerda OU direita (o nicho usa os dois); a figura tem de
                   OLHAR para o texto — espelhar a imagem quando não olhar'
  faixa_da_figura: '30 a 45% da largura'
  margem_segura: '48px; 58px no bloco de texto'
  canto_proibido: 'inferior direito — a pílula de duração do YouTube fica ali'
  assinatura:
    onde: 'rodapé, centralizado'
    texto: 'MODERN ESTOICISM'
    tratamento: 'Montserrat 19px, letter-spacing .42em, 42% de opacidade'
    por_que: 'reconhecimento para quem já assiste; não é chamada'

  enquadramento_da_figura:
    escala: 'a cabeça ocupa 45 a 70% da ALTURA do quadro'
    proibido: ['figura inteira', 'plano aberto', 'figura centralizada']
    nota: >
      As imagens do pack são 1344×768 — quase a mesma proporção do alvo. Recorte
      sozinho NÃO desloca a figura; o template amplia (height > 100%) e posiciona
      por `left`/`top`. Ver a conta em `thumb/catalogo_estilos.py`.

# ───────────────────────────────────────────────────────────────────────────
# ELEMENTOS
# ───────────────────────────────────────────────────────────────────────────
elementos:
  liberados:
    filete_dourado: 'risco fino sob a linha dourada; dá chão ao texto'
    grao: 'película leve, 5% — a identidade do canal tem grão em todo frame'
    vinheta: 'radial, escurece as bordas'
    veu_direcional: 'gradiente que escurece o lado do texto'
  proibidos:
    - X, seta, círculo de destaque
    - emoji
    - etiqueta ou selo de canto ("URGENTE", "POLÊMICA")
    - faixa de cor chapada
    - citação entre aspas
    - moldura
  por_que: >
    Todos esses são a gramática do canal de futebol. Importá-los aqui troca o
    gênero do canal por engano — o tom é contemplativo e monumental, não gritado.

# ───────────────────────────────────────────────────────────────────────────
# TEMPLATES
# ───────────────────────────────────────────────────────────────────────────
templates:
  arquivo: 'apps/canal-estoico/thumb/estilos.html'
  gerador: 'apps/canal-estoico/thumb/catalogo_estilos.py'
  saida: 'apps/canal-estoico/estilos/*.png + FOLHA-DE-VALIDACAO.html'

  E1:
    nome: 'Sans monumental · figura à esquerda'
    registro: sans
    quando: 'padrão do dia a dia — lista, prática, método'
  E2:
    nome: 'Serifada clássica · figura à direita'
    registro: serifada
    quando: 'princípio ou aforismo; episódio sem número no título'
  E3:
    nome: 'Sans com filete dourado'
    registro: sans
    quando: 'quando a linha dourada é curta e precisa de base'
  E4:
    nome: 'Serifada em três linhas · palavra dourada isolada'
    registro: serifada
    quando: 'a promessa cabe em UMA palavra (o desenho do print 93)'
  E5:
    nome: 'Centralizada · figura ao fundo'
    registro: serifada
    quando: 'CONTROLE — mede quanto a figura de fato contribui'
    cuidado: 'o texto pousa sobre o rosto; é o menos legível aos 168px'

# ───────────────────────────────────────────────────────────────────────────
# A REGRA QUE MAIS IMPORTA
# ───────────────────────────────────────────────────────────────────────────
relacao_com_o_titulo:
  regra: 'A thumb diz o que o título NÃO disse.'
  limite: 'no máximo 35% de palavras em comum'
  verificacao: |
    python apps/regra-de-3/gerador.py --diagnostico "TÍTULO" --thumb "TEXTO DA THUMB"
  medido_no_canal: >
    Os dois títulos publicados tinham 50% e 0% de repetição, e (EFEITO IMEDIATO)
    caía no caractere 70 — invisível no feed. CTR de 2,4% em 2,5 mil impressões.
  regra_derivada_do_nicho: >
    O número fica no TÍTULO e a frase fica na THUMB. Eles não competem porque
    ocupam funções diferentes: o número vende a estrutura, a frase vende a
    promessa.

# ───────────────────────────────────────────────────────────────────────────
# CHECAGEM ANTES DE PUBLICAR
# ───────────────────────────────────────────────────────────────────────────
checagem:
  - reduzir a 168px e ler a linha dourada — se ela não se lê, refazer
  - conferir que o dourado carrega UMA linha só
  - conferir a repetição contra o título (< 35%)
  - conferir que a figura olha PARA o texto
  - conferir que o canto inferior direito está livre
  - conferir que nenhum elemento do canal de futebol entrou (X, seta, emoji, faixa)
  - conferir que a thumb não promete nada que o vídeo não entrega
```

---

## Pendências — decisões do dono do canal

**1. Registro tipográfico do canal.** Sans (E1/E3) ou serifada (E2/E4)? Os dois
performam no nicho. A sans lê melhor aos 168px; a serifada distingue mais de um
canal de produtividade genérico. Recomendação: **sans (E3)**, porque o teste de
168px é o gate e é o que estamos tentando consertar — o CTR de 2,4%.

**2. Figura fixa ou figura do episódio.** O print 93 reusa uma única figura em
toda a grade e ganha reconhecimento. Nosso pipeline gera 11 imagens por episódio,
e usar uma diferente a cada vez desperdiça isso. Alternativa intermediária: fixar
o **busto frontal** como figura de capa de toda a linha LA (práticas) e trocar só
entre linhas. Sem decisão, o padrão é: **busto frontal do próprio episódio**.

**3. Assinatura "MODERN ESTOICISM".** Está aplicada como texto. Se existir um
wordmark oficial do canal em arquivo, ele substitui — não encontrei nenhum no
repositório (procurei em `workspaces/.../canais/`, que só tem `bora-de-bola`).

**4. Paleta ciano da Oraclum.** Não se aplica aqui — este canal usa a paleta
`estoico-marmore-templo`, e nenhum ciano entrou.
