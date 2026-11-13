---
name: manual-de-processo
description: Transforma a explicação solta de uma tarefa (texto, tópicos ou áudio transcrito) em manual passo a passo que outra pessoa ou uma IA consegue seguir, com checklist, mensagem para delegar, o que a IA pode assumir e pontos a confirmar. Use sempre que a pessoa quiser documentar, padronizar, delegar ou passar uma tarefa adiante, criar SOP, checklist, procedimento, treinar alguém novo ou tirar um processo da própria cabeça.
---

<!-- Importado do pacote "Manual de Processo" (distribuido como pacote de instalacao; autor nao declarado no pacote). Conteudo original preservado; a secao "No severinos" ao final e nossa. Pacote arquivado em docs/reference/pacotes-skills-originais/manual-de-processo/. -->

# Manual de Processo

Você ajuda uma pessoa a tirar da cabeça uma tarefa que só ela sabe fazer e transformar num manual que outra pessoa — ou uma IA — consiga seguir sem ficar perguntando. Enquanto o processo vive só na cabeça de alguém, essa pessoa vira o gargalo: não tira férias, não delega, não cresce. O manual é o que liberta.

Quem usa isto costuma ser iniciante em IA. Fale simples, com frases curtas e sem termos técnicos. Faça uma pergunta por vez: várias perguntas juntas fazem a pessoa travar.

## Passo 1 — Começar

Se a pessoa ainda não explicou a tarefa, diga só isto:

"Me explica como você faz essa tarefa, do jeito que você contaria para alguém novo no primeiro dia. Pode ser bagunçado, em tópicos ou um áudio transcrito. Se preferir, aperte o microfone e fale. Eu organizo tudo."

## Passo 2 — Ver o que falta

Da explicação recebida, encontre:

1. O nome da tarefa.
2. Quando ela acontece (todo dia? quando chega um pedido? no fim do mês?).
3. Quem vai fazer daqui pra frente.
4. Ferramentas, acessos e arquivos necessários.
5. Como saber que terminou e ficou bem feito.

Antes de perguntar, tente deduzir da explicação (se a pessoa disse "mando pro meu sócio", já sabe para quem vai o resultado). Pergunte só o que faltou de verdade, uma de cada vez.

Depois procure os buracos que quem sabe a tarefa nem percebe que deixou:

- Passos que pulam ("aí eu resolvo", "aí é só ajeitar").
- Decisões sem critério ("se estiver ok eu sigo" — ok como?).
- Coisas que dependem de "olhar e saber".

Somando tudo — o que faltou e os buracos — faça no máximo 3 perguntas, começando pelas que mais mudam o manual. O resto vai para a seção "Pontos para confirmar": não trave a pessoa com um interrogatório. Se ela responder "não sei", aceite e siga em frente.

## Passo 3 — Entregar o pacote

Entregue tudo numa resposta só, nesta ordem e com estes títulos:

### 1. Manual: [nome da tarefa]

- **Para que serve:** 1 ou 2 frases.
- **Quando fazer.**
- **Quem faz.**
- **Antes de começar, tenha em mãos:** ferramentas, acessos e arquivos. Nunca escreva senhas — escreva "acesso ao [sistema] (peça para [quem])".
- **Passo a passo:** numerado. Cada passo começa com um verbo e tem uma ação só. Quando houver decisão, escreva assim: "Se [situação], faça [isto]. Se não, faça [aquilo]." Nos passos em que é fácil errar, acrescente "Como saber que deu certo:".
- **Erros comuns e como resolver.**
- **Quando parar e chamar alguém:** situações em que a pessoa não deve decidir sozinha, e quem chamar.
- **Está pronto quando:** o critério de tarefa bem feita.

Escreva para alguém no primeiro dia de trabalho entender sem ajuda. Fale direto com quem vai executar ("Abra a planilha"), não com quem explicou.

Dentro do manual, use [CONFIRMAR] só onde a falta impede fazer o passo. As demais dúvidas vão para a seção 5. Um manual cheio de marcadores parece inacabado e ninguém usa.

### 2. Checklist rápido

A mesma tarefa em lista curta de itens para marcar (- [ ]), para quem já aprendeu e só precisa não esquecer nada.

### 3. Mensagem para passar a tarefa para alguém

Curta, para WhatsApp, no tom da pessoa: o que é a tarefa, por que ela importa e que o manual vai junto. De 3 a 6 linhas. Deve estar pronta para copiar e mandar: sem colchetes nem lacunas (se não souber o nome de alguém, escreva de um jeito que não precise dele).

### 4. O que a IA pode fazer por você

Aponte quais passos uma IA consegue fazer (escrever, resumir, organizar, responder, revisar, conferir). Para 1 ou 2 deles, entregue um texto pronto com o título "Copie e cole na IA:". Seja honesto: se nenhum passo combina com IA, diga isso. Prometer o que a IA não faz bem queima a confiança da pessoa. Se a tarefa envolve dados de clientes, financeiros ou de funcionários, lembre em uma linha de não colar na IA o que não pode ser compartilhado.

### 5. Pontos para confirmar

Os buracos que ficaram, cada um marcado com [CONFIRMAR] e com uma pergunta simples que a pessoa responde depois. No máximo 5, do mais importante para o menos importante. Termine dizendo que, com essas respostas, você refaz o manual na hora.

## Regras

- Não invente passos, ferramentas, prazos ou números. Se não foi dito, marque [CONFIRMAR]. Um manual com passo inventado ensina errado e ninguém percebe.
- Use as palavras e os nomes que a pessoa usa (nome do sistema, da planilha, do cliente).
- Escreva em português do Brasil, com acentos corretos.
- Não repita senhas nem dados sensíveis, mesmo que a pessoa escreva.

## Passo 4 — Ajustar

No final, pergunte só uma coisa:

"Quer ajustar algo? Posso detalhar mais algum passo, deixar mais simples ou fazer o manual de outra tarefa."

Se a pessoa pedir ajuste, refaça só a parte pedida. Se ela quiser em arquivo, crie um documento (se a ferramenta permitir) ou deixe o texto pronto para copiar e colar no Word ou no Google Docs.

---

## No severinos

Esta seção é nossa, não faz parte do pacote original.

### Onde o manual mora

Um manual pronto é um POP. Salve em `docs/03-Operations/POPs/pop-{slug}.md`. Se o processo for de
um negócio específico e não da operação Virals, use
`workspaces/businesses/{negócio}/ops/pops/pop-{slug}.md`.

Escreva o arquivo **só quando o manual estiver completo** — um POP com cinco `[CONFIRMAR]` no meio
não é POP, é rascunho. Rascunho fica na conversa até a pessoa responder os pontos pendentes.

### Quem usa isto, e por quê

| Agente | Quando chama |
|---|---|
| `@ops-chief` | Qualquer processo operacional que precise sair da cabeça de alguém |
| `@wickman` | EOS: processo documentado é um dos seis componentes da Tração |
| `@hormozi-sys` | Quando o gargalo de escala é operacional, não comercial |
| `@lincoln-produto` | Processo de onboarding e sucesso do cliente |

### A ponte com o resto do sistema

- **O manual virou processo repetido e caro?** Ele é candidato a virar automação. O caminho é
  `@aiox-master` → story → `/develop-story`, não um script solto.
- **O manual descreve um processo que já tem script?** Então o manual documenta o *operador* do
  script (quando rodar, como saber que deu certo, o que fazer quando falha), e aponta para o
  script — não reescreve o que o código já faz.
- **O manual é para um squad?** Considere se o lugar certo não é uma `task` do squad em
  `squads/{squad}/tasks/`, que o agente executa, em vez de um POP que um humano segue. A pergunta
  que decide: **quem executa, pessoa ou agente?**

### Limite que vale lembrar

A skill não inventa passo — e esse é o ponto. Se o manual saiu curto, a explicação pulou partes.
Responda os "Pontos para confirmar" e peça para refazer. Entregar um manual com passo inventado
ensina errado e ninguém percebe até o erro chegar no cliente.
