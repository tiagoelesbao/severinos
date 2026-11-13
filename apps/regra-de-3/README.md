# Motor Regra de 3 — títulos e thumbs para qualquer nicho dark

Dois arquivos, e a divisão entre eles é a ideia inteira:

| | |
|---|---|
| `pilares.py` | **Pontua.** Determinístico, auditável, sem LLM. |
| `gerador.py` | **Propõe.** Por molde hoje; pode ser LLM ou agente de copy amanhã. |

O pontuador não sabe de onde veio a frase. Molde, modelo, agente de copy ou
você digitando passam pela mesma peneira — e é isso que torna a peneira útil.

## Uso

```bash
# gerar candidatos a partir de um fato
python gerador.py --exemplo futebol
python gerador.py --json meu-fato.json --quantos 10

# pontuar um título que já existe
python gerador.py --diagnostico "SEU TÍTULO" --thumb "TEXTO DA THUMB"
python pilares.py                                  # roda os casos de referência
```

O fato de entrada:

```json
{
  "nicho": "futebol",
  "sujeito": "o STJD",
  "acao": "julgou o caso de apostas de Bruno Henrique",
  "acao_curta": "julga Bruno Henrique",
  "alvo": "o Flamengo",
  "alvo_reage": true,
  "consequencia": "o atacante pode pegar 2 anos de suspensão",
  "verificado": ["falas reais, se houver"]
}
```

`acao_curta` existe porque o feed corta o título por volta de **55 caracteres**.
`alvo_reage` desliga o padrão B2 em nicho de utilidade, onde o alvo é o próprio
espectador e não alguém que responde.

## O que o pontuador mede

| Medida | Por quê |
|---|---|
| Os três pilares | imediatismo, curiosidade, resolução (aula 1, 05:02) |
| **Onde** cada pilar está | pilar depois do corte do feed vale **metade** |
| Repetição da thumb | thumb é complemento, não eco (aula 1, 52:29) |
| Comprimento | acima de 100 caracteres, penalidade |
| **Risco** | A / B1 / B2 / B3 |

## Os padrões, e a linha

| | O que é | Sai do motor? |
|---|---|---|
| **A** | afirma o fato verificado | sim |
| **B1** | **pergunta** sobre o incerto — `?!` | sim |
| **B2** | insinua reação, sem citar fala | sim |
| **B3** | inventa fala e atribui a nome real | **descartado em código** |

B1 é o mais subestimado: a interrogação transforma afirmação em pergunta, e
pergunta não é asserção. É por isso que os canais que operam na margem usam
`?!` tanto — `"WHEY DO POBRELOCO PROIBIDO DE VENDER NA SHOPEE?!"` afirma zero.

B3 não sai porque `pilares.analisa` marca fala entre aspas não confirmada junto
de nome próprio, e `gera` descarta. A recusa é mecânica, não editorial.

## Nichos

`futebol`, `maromba`, `estoicismo`, `financas`. Cada um tem vocabulário próprio
de ruptura, tensão e resolução — "A casa caiu" funciona em plantão e some em
estoicismo; "ninguém te conta" é o inverso. Acrescentar nicho é acrescentar uma
entrada em `NICHOS`.

## Limite conhecido

O gerador por molde rende bem em **nicho de notícia**, onde o fato já tem forma
de manchete (sujeito, ação, consequência). Em **nicho de utilidade** — o
estoicismo, por exemplo — os moldes produzem emendas mecânicas, porque não há
um evento com sujeito e alvo.

Nesses nichos, o caminho é usar os agentes de copy para propor as frases e o
`pilares.py` para julgar. A arquitetura já prevê isso: só a proposta muda.
