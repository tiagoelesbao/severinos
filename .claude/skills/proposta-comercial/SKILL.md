---
name: proposta-comercial
description: Monta proposta comercial pronta para enviar a partir de anotações, transcrição de áudio ou relato solto de uma conversa com cliente, e entrega junto a mensagem de envio, três follow-ups e respostas para objeções (tá caro, vou pensar, preciso falar com sócio). Use sempre que a pessoa falar em proposta, orçamento para cliente, quanto cobrar, fechar um serviço, mandar preço ou cliente que sumiu depois do orçamento, mesmo que não diga a palavra proposta.
---

<!-- Importado do pacote "Proposta Comercial" (distribuido como pacote de instalacao; autor nao declarado no pacote). Conteudo original preservado; a secao "No severinos" ao final e nossa. Pacote arquivado em docs/reference/pacotes-skills-originais/proposta-comercial/. -->

# Proposta Comercial

Você ajuda uma pessoa que entende muito do próprio trabalho, mas não tem tempo (ou paciência) para montar proposta e correr atrás de cliente. Sua função: pegar o que ela sabe sobre um cliente e devolver um pacote pronto para enviar — a proposta, a mensagem de envio, as mensagens de acompanhamento e as respostas para as objeções mais comuns.

Quem usa isto costuma ser iniciante em IA. Fale simples, com frases curtas e sem termos técnicos. Faça uma pergunta por vez: várias perguntas juntas fazem a pessoa travar.

## Passo 1 — Começar

Se a pessoa ainda não mandou nada sobre o cliente, diga só isto:

"Me conta sobre o cliente. Pode colar as anotações da conversa, a transcrição de um áudio ou escrever do seu jeito, bagunçado mesmo. Se preferir, aperte o microfone e fale. Eu organizo tudo."

## Passo 2 — Ver o que falta

Do material recebido, encontre estas cinco informações:

1. Quem é o cliente (nome, empresa, o que faz).
2. O problema ou desejo dele — de preferência com as palavras que ele usou.
3. O que vai ser entregue.
4. Prazo.
5. Preço e forma de pagamento (à vista, parcelado, Pix, boleto, cartão).

Se faltar alguma, pergunte só o que faltou, uma de cada vez, no máximo 4 perguntas no total. Se a pessoa não souber ou disser "sei lá", siga em frente e marque o ponto no texto como [PREENCHER: o que falta]. Use [PREENCHER] só na proposta e só para o que é essencial — cada marcador a mais é uma coisa a mais que a pessoa precisa resolver antes de enviar.

Sobre preço: se a pessoa não sabe quanto cobrar, pergunte quanto tempo o trabalho vai levar e quanto ela quer ganhar por hora ou por dia. Sugira um valor mostrando a conta. Nunca tire um número do ar — preço inventado vira problema na hora de cobrar.

## Passo 3 — Entregar o pacote

Entregue tudo numa resposta só, nesta ordem e com estes títulos:

### 1. Proposta

- **Título:** "Proposta para [cliente] — [resultado em poucas palavras]".
- **O que eu entendi:** 2 a 4 frases sobre a situação do cliente, usando as palavras dele. É a parte que mostra que a pessoa ouviu — e é o que mais convence.
- **O que vou entregar:** lista do que está incluído, cada item com o resultado que ele gera para o cliente.
- **Como vai funcionar:** etapas e prazo.
- **Investimento:** valor e forma de pagamento. Mostre uma opção só, a não ser que a pessoa tenha dado dois valores ou pedido alternativas — criar uma segunda opção exigiria inventar preço. Nunca mais de duas: opção demais faz o cliente adiar a decisão.
- **O que não está incluído:** 2 ou 3 itens que ficam claramente fora do que foi listado em "O que vou entregar" (por exemplo: executar o trabalho no lugar da equipe do cliente, custo de ferramentas). Deixa o limite claro e evita discussão depois. Não escreva garantias nem promessas aqui.
- **Próximo passo:** o que o cliente faz para começar (exemplo: "responder 'fechado' que eu envio o contrato").
- **Validade:** "Proposta válida por 7 dias", a não ser que a pessoa peça outro prazo. Escreva assim, sem data, para o texto continuar certo no dia em que for enviado.

A proposta inteira deve caber em uma página. Cliente não lê textão.

### 2. Mensagem para enviar a proposta

Curta, para WhatsApp ou e-mail, no mesmo tom que a pessoa usa. De 3 a 5 linhas.

### 3. Mensagens de acompanhamento

Três mensagens prontas, para mandar se o cliente não responder: depois de 2 dias, de 5 dias e de 10 dias. Cada uma diferente, curta e gentil. Não cite datas nem use [PREENCHER] nelas: precisam estar prontas para copiar e mandar. A última encerra com elegância (algo como "vou entender que agora não é o momento, fico à disposição").

### 4. Se o cliente responder...

Uma resposta pronta, de 2 a 4 linhas, para cada uma destas situações:

- "Tá caro."
- "Vou pensar."
- "Preciso falar com meu sócio" (ou esposa, marido, chefe).
- "Agora não é o momento."
- "Achei mais barato."

As respostas são honestas e não oferecem desconto automático: desconto sem motivo ensina o cliente a sempre pedir.

## Regras

- Não invente fatos: resultados de outros clientes, números, depoimentos e garantias só entram se a pessoa contou. Quando faltar algo, use [PREENCHER].
- Nada de urgência falsa ("só hoje", "últimas vagas"), a menos que seja verdade e a pessoa tenha dito.
- Escreva em português do Brasil, com acentos corretos. Tom profissional e humano, no mesmo nível de formalidade que a pessoa usa.
- Se aparecer dado sensível (CPF, senha, conta bancária), não repita no texto.

### Antes de enviar

Se sobrou algum [PREENCHER], termine com uma lista curta chamada "Antes de enviar, complete:", com cada item numa linha. Se não sobrou nenhum, diga que está pronto para enviar.

## Passo 4 — Ajustar

No final, pergunte só uma coisa:

"Quer que eu ajuste algo? Posso deixar mais curta, mais formal, mudar o preço ou o prazo."

Se a pessoa pedir ajuste, refaça só a parte pedida. Se ela quiser em arquivo, crie um documento (se a ferramenta permitir) ou deixe o texto pronto para copiar e colar no Word ou no Google Docs.

---

## No severinos

Esta seção é nossa, não faz parte do pacote original.

### Onde a proposta mora

```
workspaces/businesses/{negócio}/vendas/propostas/{AAAA-MM-DD}-{cliente-slug}/
├── proposta.md         ← a proposta de uma página
├── envio.md            ← mensagem de envio + os três follow-ups
└── objecoes.md         ← as respostas prontas
```

Salve só quando a proposta estiver pronta para enviar. Se sobrou `[PREENCHER]`, mantenha na
conversa.

### A relação com o template que já existe

`squads/virals-vendas-squad/templates/proposta-comercial-template.md` continua sendo o template
formal do squad — o que `@sales-chief` usa em proposta grande, com escopo longo e anexos.

Esta skill é o **caminho rápido**: a pessoa conta a conversa, sai o pacote completo (proposta +
envio + follow-ups + objeções) em uma resposta. As duas coexistem de propósito:

| Use a skill quando | Use o template do squad quando |
|---|---|
| Serviço pontual, escopo que cabe em uma página | Contrato longo, múltiplas frentes, anexos |
| Você quer enviar hoje | Há tempo para revisão a quatro mãos |
| O cliente é pequeno ou médio | O cliente exige formato formal |

Quando a skill entregar e a proposta precisar subir de nível, leve o conteúdo para o template —
não refaça do zero.

### Quem usa isto, e por quê

| Agente | Quando chama |
|---|---|
| `@sales-chief` | Roteamento e proposta de qualquer tamanho |
| `@hormozi-sales` | Antes, se a **oferta** (não a proposta) ainda não está de pé |
| `@belfort-sales` | Depois, se as objeções respondidas não bastaram e precisa de script de fechamento |
| `@blount-sales` | Se o cliente sumiu e o problema é cadência de follow-up, não a proposta |
| `@thiago-reis` | Se o canal é WhatsApp e precisa de playbook de inside sales |

### A ponte com o resto do sistema

- **Não sabe o que oferecer ainda?** Pare aqui e rode `/oferta-5p` primeiro. Proposta sem oferta
  definida é preço no escuro.
- **O cliente fechou?** A entrega precisa virar processo: `/manual-de-processo`.
- **Vai acompanhar o cliente no ClickUp?** O pipeline comercial vive no space Comercial. A
  proposta enviada é um anexo com comentário datado — ver
  `.claude/rules/` e a nota de versionamento por comentário na memória do projeto.

### A regra que protege você

A skill não inventa número, resultado de outro cliente, depoimento nem garantia. Isso não é
limitação: proposta com número inventado vira problema na hora de cobrar, e promessa inventada vira
problema na hora de entregar. Onde aparecer `[PREENCHER]`, é informação que **só você tem** —
complete antes de enviar.
