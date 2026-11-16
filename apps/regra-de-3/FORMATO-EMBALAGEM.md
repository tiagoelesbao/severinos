# Formato de embalagem — título, descrição, tags, frase-alvo

Este arquivo é **agnóstico de canal**. Serve para o estoico, para o de futebol e
para qualquer canal dark que use o motor `regra-de-3`. O que muda de canal para
canal é o léxico e o público, não a estrutura.

Uma embalagem completa tem **quatro peças**, e elas se amarram por uma só coisa:
a **frase-alvo**.

---

## 0. Frase-alvo — a peça que amarra as outras três

A busca que este vídeo quer ganhar. Uma frase, não uma palavra.

Ela **tem de aparecer nos três lugares**:

| Onde | Como |
|---|---|
| No **título** | literalmente, com as mesmas palavras |
| Nos **primeiros 150 caracteres** da descrição | literalmente |
| Na **primeira tag** | exatamente, e sozinha |

Se ela não aparece nos três, o SEO está solto — cada peça está apostando numa
busca diferente e nenhuma ganha.

**Como escolher a frase-alvo sem ferramenta de volume:** ver § 5.

---

## 1. Título

Regras do pontuador (`pilares.py`), inegociáveis:

| Medida | Limite |
|---|---|
| Nota | ≥ 70 |
| Os três pilares | **antes do caractere 55** (o corte do feed) |
| Repetição da thumb sobre o título | < 35% |
| Risco | A, B1 ou B2 — **nunca B3** |
| Comprimento | ≤ 100 caracteres |

```bash
python apps/regra-de-3/gerador.py --diagnostico "TÍTULO" --thumb "TEXTO DA THUMB"
```

**Onde a frase-alvo entra sem estragar a nota:** depois do caractere 55. Os três
pilares ocupam a zona visível; a frase-alvo pode viver na cauda, separada por
`|` ou `—`. É o que o nicho já faz com o sufixo `| Estoicismo`. Ela não é lida
no feed, mas **é** lida pelo indexador.

---

## 2. Descrição

Duas partes com funções diferentes.

### Os primeiros ~150 caracteres

É o que aparece no resultado de busca e no card do feed antes do "mostrar mais".

- Repetem a promessa do título **com as palavras que a pessoa digitaria**, não
  com sinônimos criativos. Sinônimo é bom para não repetir; aqui repetir é o
  objetivo.
- Contêm a frase-alvo literalmente.
- Não contêm CTA, link, hashtag nem crédito. Nada disso é buscado.

### O corpo

Nesta ordem:

1. **Capítulos** (timestamps). Exigências do YouTube: o primeiro tem de ser
   `0:00` e é preciso um mínimo de **três** marcações, em ordem crescente. Cada
   bloco do roteiro vira um capítulo.
2. **Fontes**, se houver citação de obra ou de pessoa real. Só o que o roteiro
   de fato cita — obra alegada e não citada é invenção com cara de rigor.
3. **CTA**, uma linha.
4. **Hashtags**, no máximo três, no fim.

**Como derivar os timestamps sem locução pronta:** contar palavras por seção do
roteiro e dividir pelo WPM medido do motor de voz do canal. Confere com o
`duracao_calculada` do frontmatter dentro de poucos segundos. Depois da locução
real, corrigir com os tempos do áudio.

---

## 3. Tags

| Regra | Valor |
|---|---|
| Quantidade | 15 a 25 |
| Ordem | da **mais específica** para a mais genérica |
| Primeira tag | a frase-alvo, exata |
| Soma total | ~400 caracteres (limite prático) |

A primeira pesa mais. As genéricas do fim ("estoicismo", "futebol") não ganham
nada sozinhas — elas existem para o vídeo entrar no conjunto de sugeridos de
vídeos grandes do mesmo tema.

---

## 4. Como o documento fica

Um arquivo por episódio, com:

1. A lista de **5 a 8 candidatos de título**, cada um com a nota e o relatório
   do pontuador — inclusive os que perderam, porque o motivo de perder é o que
   ensina.
2. O **vencedor**, com a justificativa.
3. Frase-alvo · Título · Descrição · Tags, prontos para copiar.
4. **Ressalvas** — o que não foi medido e o que é decisão do dono do canal.

---

## 5. A ressalva honesta sobre SEO

**Não há dado de volume de busca neste repositório.** Verificado em 2026-09-04:
não existe Keyword Planner, Semrush, Ahrefs, Google Trends nem qualquer API de
busca configurada. As únicas menções a essas ferramentas estão em arquivos de
persona de agente (`squads/virals-marketing-squad/tasks/fishkin-seo-audit.md`,
`squads/traffic-masters/agents/tom-breeze.md`), que as citam como algo que um
humano usaria — não como fonte de dado disponível.

**Portanto: nenhum número de volume deve ser escrito num documento de embalagem.**
Se aparecer um, foi inventado.

### O que temos, e que não é nada mau

**Observação de concorrente.** Os títulos que os canais de referência
efetivamente usam são evidência de que aquelas palavras são as do nicho — não de
quanto se busca por elas, mas de que quem já ganha usa aquelas. É a diferença
entre *"esta frase tem N buscas/mês"* (que não sabemos) e *"esta é a forma que o
nicho escreve"* (que sabemos, e é a que evita inventar vocabulário).

**Views por hora (VPH) e o multiplicador**, quando o print de concorrente os
mostra. É um sinal real de desempenho relativo *dentro daquele canal*. Não é
volume de busca — a maior parte de um canal dark vem de sugeridos, não de busca —
mas serve para comparar embalagens entre si.

### Como declarar isso no documento

> **Base das palavras-alvo:** observação dos títulos dos canais de referência
> (prints X, Y, Z), não medição de volume de busca. Não há ferramenta de SEO
> configurada neste repositório.

Essa linha é obrigatória em todo documento de embalagem enquanto não houver
fonte de dado real. Se a fonte passar a existir, ela substitui a linha e é
nomeada.
