---
name: source-scan-assertions
description: Nesta base, asserção de teste que varre código-fonte procurando a forma proibida reprova por causa dos próprios comentários, que escrevem a forma errada para dizer que ela é errada — varrer código, nunca texto
metadata:
  type: feedback
---

Quando um AC se verifica por leitura do código (*"não existe `if (status >= 500) retry`"*,
*"o literal 900 não aparece"*, *"o número é declarado em um lugar"*), a varredura tem de
ser feita sobre o **código sem comentários e sem literais de string** — nunca sobre o
texto bruto do arquivo.

**Why:** esta base documenta muito dentro do código, e documentar bem significa **escrever
a forma errada para dizer que ela é errada**. O comentário de `classify` em
`paysure-client.ts` diz, literalmente, *"NÃO EXISTE `if (status >= 500) retry` NESTE
ARQUIVO"*. Uma varredura ingênua encontra essa frase e reprova o arquivo por conter
exatamente o que ele promete não conter. Medido na LTM-03b: **6 das 12 primeiras falhas**
da suíte nova eram isto, em quatro arquivos diferentes — todas falso-positivo, nenhuma
defeito de código.

A alternativa tentadora — reescrever os comentários para não citar a forma proibida — é a
troca errada: deixa a documentação pior para fazer o teste passar.

**How to apply:** usar um auxiliar que remove `/* */`, `//` e literais antes de procurar
(o da LTM-03b é `apps/lotemania/tests/payments/paysure/source.ts`: `codigoDe()` para
asserção sobre código, `fonteDe()` para asserção sobre o que o arquivo **explica**). E
quando a asserção é sobre a explicação existir — *"o arquivo diz por que não há HMAC"* —
ler o texto bruto de propósito, e dizer no teste que é de propósito.

Dois corolários que custaram tempo no mesmo dia:

- **Asserção que procura a própria string se derrota.** Um
  `expect(fonteDoTeste).not.toContain("api.paysurebr.com/v1/pix")` reprova sempre: o
  literal está na linha da asserção. Verificar o comportamento (para onde as chamadas
  foram) em vez do texto.
- **O heredoc do Bash tool colapsa `\`.** Script Python com regex passado por
  `<<'PY'` recebe `\b` como backspace e o `str.replace` falha em silêncio. Montar o
  padrão com `chr(92)`, ou escrever o script com a tool de arquivo. Ver
  [[bash-heredoc-escaping-trap]] no índice do usuário.
