import { Resource } from '../../types';

export const PROMPTS_RESOURCES: Resource[] = [
  {
    id: 'res-21',
    slug: '5-secret-claude-prompts',
    title: 'Prompts que Eu Provavelmente Não Deveria Estar Entregando',
    category: 'PROMPTS',
    description: 'Os prompts de copiar e colar que realmente utilizo no dia a dia — Modo Verdade, o comando Human, Red Team, ELI10, Você do Futuro e o combo de dois prompts que projeta seu escritório.',
    subtitle: 'Alguns mudam como o modelo te responde. Outros fazem um trabalho inteiro em uma colada. Pegue os que quiser e guarde onde você acha rápido.',
    estimatedReadTime: '10 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Prompts', 'Masterclass', 'Copywriting', 'Estratégia'],
    promptText: `MODO VERDADE

Modo verdade: de agora em diante, seja direto e honesto comigo.
Pare de suavizar as coisas ou de concordar só porque eu pareço confiante.
Se eu estiver errado, diga e explique por quê. Se uma ideia for fraca,
diga que é fraca. Prefiro a resposta real à resposta simpática.`,
    whatYouWillDo: [
      'Ter cinco prompts que mudam como o modelo responde, prontos para colar.',
      'Ter um combo de dois prompts que resolve um trabalho inteiro.',
      'Saber transformar qualquer um deles em comando permanente.'
    ],
    beforeYouStart: [
      'Nada. São prompts de copiar e colar.',
      'Se quiser tirar o máximo: um projeto com o contexto do seu negócio já carregado.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Modo Verdade',
        description: 'Faz o Claude parar de concordar com tudo e de te dizer o que você quer ouvir.\n\nCole no começo de uma conversa para definir o tom de tudo depois, ou no meio quando quiser trocar de modo.',
        copyableText: `Modo verdade: de agora em diante, seja direto e honesto comigo.
Pare de suavizar as coisas ou de concordar só porque eu pareço confiante.
Se eu estiver errado, diga e explique por quê. Se uma ideia for fraca,
diga que é fraca. Prefiro a resposta real à resposta simpática.`
      },
      {
        stepNumber: 2,
        title: 'O Comando Human',
        description: 'Mata o tom de IA para o seu texto soar como pessoa.',
        copyableText: `Escreva isso como uma pessoa de verdade falando, não como IA.
Nada de travessão, nada de "no mundo de hoje", nada de lista de três,
nada de "não é só X, é Y". Frases curtas. Palavras simples.
Diga do jeito que você mandaria mensagem para um amigo que tem
um negócio.`
      },
      {
        stepNumber: 3,
        title: 'Red Team',
        description: 'Faz o Claude atacar sua oferta para você achar os buracos antes dos seus prospects.',
        copyableText: `Faça red team na minha oferta. Argumente contra ela o mais forte que
conseguir — cutuque cada buraco, liste cada motivo para alguém não
comprar, e nomeie as objeções que eu não estou enxergando.

Seja implacável. Eu quero as fraquezas agora, enquanto ainda dá
para consertar.`
      },
      {
        stepNumber: 4,
        title: 'ELI10',
        description: 'Explica qualquer coisa como se você tivesse dez anos — ótimo para um assunto que você ainda não entende de fato.',
        copyableText: `Me explique isso como se eu tivesse 10 anos. Sem jargão, use uma
analogia simples, e não assuma que eu sei o contexto.

Se você usar um termo que eu talvez não conheça, defina na mesma frase.`
      },
      {
        stepNumber: 5,
        title: 'Você do Futuro',
        description: 'Responde como a versão de você que já resolveu o problema.\n\nDá para empilhar: Modo Verdade mais Red Team na mesma oferta é um combo brutal e útil. Quer permanente? Transforme qualquer um em skill: digite `/` no Claude, escolha Skill Creator e mande construir o comando a partir do prompt.',
        copyableText: `Me responda como a versão de mim que já resolveu isso — 5 anos à
frente, calma, e clara sobre o que realmente importou.

O que essa versão me diria para fazer agora, e o que me diria para
parar de perder tempo?`
      },
      {
        stepNumber: 6,
        title: 'O combo de dois prompts — redesenhe seu escritório',
        description: 'Estes não são de tom. Cada um é um pequeno sistema — rode em ordem, no mesmo chat.\n\nVocê precisa de uma foto da sua mesa antes de começar, na horizontal, larga o bastante para pegar mesa, cadeira e a parede atrás. Escolha um ângulo com problema óbvio, senão o "depois" não tem o que superar.\n\nDuas coisas importam: **ficar no mesmo chat** é o que faz o segundo prompt funcionar — um chat novo não sabe qual design ele está orçando. E confira os links antes de comprar, porque link de produto morre.',
        copyableText: `PROMPT 1 — anexe a foto, depois cole:

Aqui está uma foto do meu escritório. Redesenhe do jeito que um
designer de interiores profissional faria.

Mantenha minha mesa e meus monitores onde estão, não vou mover.
Mude todo o resto: iluminação, tratamento de parede, armazenamento,
assento e qualquer coisa visível atrás de mim.

Precisa ficar bom em vídeo, então preste atenção no que aparece
no enquadramento atrás da mesa.

Deixe acolhedor e moderno, e mantenha realista. Nada que eu não
conseguisse comprar de verdade.

---

PROMPT 2 — no mesmo chat, depois cole:

Agora reconstrua exatamente esse visual por menos de R$ 2.500.

Me dê cada item como tabela: item, para que serve, preço, e um link
real onde eu possa comprar hoje. Some o total no fim.

Depois me diga onde cada coisa vai no ambiente.`
      }
    ],
    troubleshooting: [
      'A resposta continua amena → você colou no meio de uma conversa em que ele já estava sendo agradável. Comece uma conversa nova.',
      'O Red Team apontou riscos genéricos → falta contexto específico. Descreva números, prazo e o que você já tentou.',
      'O Modo Verdade virou grosseria sem conteúdo → acrescente "seja direto, não rude — o objetivo é utilidade".',
      'O segundo prompt do combo não sabe do que você fala → você abriu um chat novo. Os dois têm que ser na mesma conversa.',
      'Os links do orçamento estão mortos → normal. Confira antes de comprar; link de produto envelhece rápido.'
    ],
    goDeeperLinks: [
      { label: 'Faça o Claude parar de concordar com tudo', url: '#/recursos/stop-claude-from-glazing-you' },
      { label: 'O humanizador 0%', url: '#/recursos/make-claude-write-undetectable' }
    ]
  },
  {
    id: 'res-7',
    slug: 'alex-hormozi-business-coach',
    title: 'Mentor de Negócios Estilo Alex Hormozi',
    category: 'PROMPTS',
    description: 'Transforme o Claude em um mentor de negócios no estilo Hormozi — o prompt MAIS a essência de seus três livros organizada em um pacote de conhecimento para carregar no projeto.',
    subtitle: 'O mentor que pula o floreio e te diz a única coisa para consertar. E não é só o estilo: você carrega os frameworks dos livros dele, então ele te orienta pelo método, não por uma impressão vaga.',
    estimatedReadTime: '7 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Julho de 2026',
    tags: ['Ofertas', 'Preço', 'Hormozi', 'Estratégia de Negócios', 'Prompts'],
    promptText: `# Papel
Você é um mentor de negócios no estilo Alex Hormozi.

# Voz
Direto. Sem floreio. Frases curtas. Cite frameworks pelo nome.
Diga o que a pessoa não quer ouvir. Use matemática em vez de conselho vago.

# Regras
1. SEMPRE diagnostique antes de prescrever — faça de 3 a 5 perguntas primeiro.
2. Use o framework dos 6M (Métricas, Modelo, Dinheiro, Equipe, Gestão, Mercado)
   para achar a ÚNICA restrição.
3. Cite os frameworks pelo nome — Equação de Valor, Oferta Irrecusável, Core Four.
4. Use matemática. Dê números específicos.
5. Termine toda resposta com UMA ação específica para as próximas 48 horas.`,
    whatYouWillDo: [
      'Montar um projeto que diagnostica antes de prescrever, em vez de despejar conselho.',
      'Achar a única restrição do seu negócio pelo framework dos 6M.',
      'Auditar sua oferta pela Equação de Valor, com nota e evidência por fator.'
    ],
    beforeYouStart: [
      'Sua oferta escrita como está hoje: o que entrega, prazo, preço e garantia.',
      'Os números que você tiver: conversão, ticket médio, margem, objeção mais comum.',
      'Disposição para ouvir que a sua oferta é mediana. Quase sempre é — é ponto de partida, não sentença.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Copie o prompt',
        description: 'Cole nas instruções de um Projeto novo do Claude (ou direto num chat, se for só experimentar).\n\nA regra 1 é a que mais muda o resultado. Sem "diagnostique antes de prescrever", você recebe conselho genérico de internet; com ela, ele te faz três perguntas e a conversa vira outra coisa.',
        copyableText: `# Papel
Você é um mentor de negócios no estilo Alex Hormozi.

# Voz
Direto. Sem floreio. Frases curtas. Cite frameworks pelo nome.
Diga o que a pessoa não quer ouvir. Use matemática em vez de conselho vago.

# Regras
1. SEMPRE diagnostique antes de prescrever — faça de 3 a 5 perguntas primeiro.
2. Use o framework dos 6M (Métricas, Modelo, Dinheiro, Equipe, Gestão, Mercado)
   para achar a ÚNICA restrição.
3. Cite os frameworks pelo nome — Equação de Valor, Oferta Irrecusável, Core Four.
4. Use matemática. Dê números específicos.
5. Termine toda resposta com UMA ação específica para as próximas 48 horas.`
      },
      {
        stepNumber: 2,
        title: 'Carregue o pacote de conhecimento',
        description: 'O prompt sozinho te dá o estilo. O que te dá o método são os frameworks carregados como documentos na base do Projeto.\n\nCrie um documento de conhecimento para cada bloco abaixo. É isso que faz ele orientar pelos frameworks reais em vez de uma impressão vaga de como o cara fala.'
      },
      {
        stepNumber: 3,
        title: 'Documento 1 — A Equação de Valor',
        description: 'O núcleo de tudo. A ideia é simples e por isso é útil: o valor percebido sobe com o resultado prometido e com a confiança de que ele acontece, e cai com o tempo de espera e o esforço exigido.\n\nO uso prático não é decorar a fórmula. É perceber que existem quatro alavancas, e que a maioria mexe só na primeira — prometer mais — quando o gargalo costuma estar na segunda (ninguém acredita) ou na quarta (dá trabalho demais).',
        copyableText: `# EQUAÇÃO DE VALOR

           Resultado Desejado  ×  Probabilidade Percebida
Valor = ─────────────────────────────────────────────────
              Tempo até o Resultado  ×  Esforço e Sacrifício

Maximize o de cima. Minimize o de baixo. É o jogo inteiro.

## As 4 alavancas

1. RESULTADO DESEJADO (aumentar)
   - Torne o estado final mais vívido, maior, com mais status
   - Pinte como fica a vida DEPOIS

2. PROBABILIDADE PERCEBIDA (aumentar)
   - Prova social, casos, depoimentos
   - Credenciais, explicação do mecanismo, garantias
   - Mostre POR QUE este funciona quando todo o resto falhou

3. TEMPO ATÉ O RESULTADO (diminuir)
   - Quanto tempo até verem resultado?
   - Crie vitórias rápidas cedo no processo
   - "Você vê X nos primeiros 7 dias"

4. ESFORÇO E SACRIFÍCIO (diminuir)
   - Feito-para-você em vez de faça-você-mesmo
   - Remova passos, decisões e pré-requisitos

## A regra número 1: Público Faminto > Força da Oferta > Persuasão

Antes de tudo, escolha o mercado certo. Uma ótima oferta para o público
errado dá nada. Uma oferta mediana para um público faminto dá negócio.

4 indicadores de bom mercado:
1. Dor grande — gente desesperada paga prêmio
2. Poder de compra — eles conseguem pagar?
3. Fácil de alcançar — tem canal ou comunidade clara
4. Crescendo — mercado que cresce perdoa erro; o que encolhe pune`
      },
      {
        stepNumber: 4,
        title: 'Documento 2 — Os 6M e as perguntas de diagnóstico',
        description: 'O framework que ele usa para achar a única restrição antes de recomendar qualquer coisa.',
        copyableText: `# OS 6M — ache a ÚNICA restrição

MÉTRICAS  — você sabe seus números? Conversão, CAC, LTV, margem, churn.
MODELO    — o modelo de negócio comporta o resultado que você quer?
DINHEIRO  — tem caixa para financiar o crescimento que você está pedindo?
EQUIPE    — tem gente suficiente e certa para entregar?
GESTÃO    — existe alguém gerindo, ou tudo passa por você?
MERCADO   — o público é faminto, alcançável e está crescendo?

REGRA: só existe UMA restrição por vez. Achar e atacar a errada é
o jeito mais comum de trabalhar muito e não sair do lugar.

# PERGUNTAS DE DIAGNÓSTICO (faça 3 a 5 antes de prescrever)

1. Quantos leads novos você recebe por mês e de onde vêm?
2. Qual a taxa de conversão de lead para cliente?
3. Qual o ticket médio e a margem?
4. Quanto tempo entre a compra e o primeiro resultado do cliente?
5. Qual objeção você mais escuta?
6. Se você dobrasse os leads amanhã, o que quebraria primeiro?

A pergunta 6 costuma revelar a restrição real.`
      },
      {
        stepNumber: 5,
        title: 'Documento 3 — Reversão de risco e garantias',
        description: 'Garantia é o instrumento mais direto para mexer na probabilidade percebida — e o mais mal usado. "Satisfação garantida" não reverte risco nenhum porque não é verificável.',
        copyableText: `# REVERSÃO DE RISCO

Tipos de garantia, do mais fraco ao mais forte:

1. INCONDICIONAL — devolve o dinheiro sem perguntar.
   Forte, mas convida abuso em ticket alto.

2. CONDICIONAL — o cliente cumpre X, você garante Y.
   A melhor relação risco/impacto. Ex: "siga o processo por 60 dias,
   se não tiver resultado eu devolvo".

3. ANTI-GARANTIA — sem devolução, dita explicitamente.
   Funciona quando o público é sofisticado e o compromisso é o filtro.

4. DE ESFORÇO — você continua trabalhando sem custo até chegar em Y.
   Alta confiança, risco de tempo em vez de dinheiro.

Para cada garantia proposta, defina sempre:
- Como o cliente prova que tem direito
- Seu risco financeiro real, com número
- Que objeção específica ela elimina

Uma garantia que você não consegue bancar é pior que nenhuma.`
      },
      {
        stepNumber: 6,
        title: 'Faça a auditoria',
        description: 'Com o pacote carregado, dê seus números reais e faça a pergunta. Ele pergunta algumas coisas primeiro, depois entrega a única coisa para consertar — com matemática, sem floreio.',
        copyableText: `MINHA OFERTA ATUAL:

O que entrego: [descreva]
Para quem: [público]
Preço: [valor e forma de pagamento]
Prazo até o resultado: [tempo]
O que o cliente precisa fazer: [esforço exigido dele]
Garantia: [se houver]
Prova: [depoimentos, números, casos]

Objeção que mais aparece: [qual]
Taxa de conversão atual: [se souber]

Rode o diagnóstico. Ache a única restrição.`
      },
      {
        stepNumber: 7,
        title: 'Ataque o gargalo, não os quatro',
        description: 'A auditoria vai listar melhorias em todos os fatores. Resista à vontade de fazer tudo.\n\nO fator com a nota mais baixa é onde está o dinheiro. Se "probabilidade percebida" tirou 3 e "resultado desejado" tirou 8, adicionar mais entregáveis não muda nada — o problema é que ninguém acredita que funciona. A resposta ali é prova, não bônus.\n\nE valide em conversa, não em documento: apresente a nova oferta para cinco pessoas do seu público e pergunte "quanto você acha que isso custa?". Se o chute vier bem abaixo do seu preço, a oferta ainda não comunica o valor — e nenhuma copy conserta isso.'
      }
    ],
    troubleshooting: [
      'A análise saiu elogiosa → as instruções não entraram no projeto. Cole nas Instruções do Projeto, não numa mensagem do chat.',
      'Ele prescreveu direto, sem perguntar nada → a regra 1 se perdeu. Recole o prompt e reforce "faça de 3 a 5 perguntas antes".',
      'As recomendações são genéricas → sua descrição de oferta está vaga. Números e prazos concretos produzem análise concreta.',
      'Todos os fatores tiraram 7 → você descreveu a oferta como gostaria que fosse. Descreva o que o cliente realmente recebe.',
      'A garantia proposta é inviável → informe sua margem e o custo de entrega; sem isso ele desenha garantia que te quebra.',
      'A oferta melhorou e a conversão não → o gargalo não estava na oferta. Rode os 6M de novo; provavelmente é Mercado ou Métricas.'
    ],
    goDeeperLinks: [
      { label: 'Faça o Claude parar de concordar com tudo', url: '#/recursos/stop-claude-from-glazing-you' },
      { label: 'Prompts que eu provavelmente não deveria entregar', url: '#/recursos/5-secret-claude-prompts' }
    ]
  },
  {
    id: 'res-25',
    slug: 'stop-claude-from-glazing-you',
    title: 'Faça o Claude Parar de Concordar com Tudo',
    category: 'PROMPTS',
    description: 'Apenas uma linha para suas instruções globais para o Claude questionar suas decisões em vez de apenas concordar com tudo o que você fala.',
    subtitle: 'Uma linha para as suas instruções globais e o Claude passa a te questionar em vez de concordar com tudo.',
    estimatedReadTime: '2 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Prompts', 'Crítica', 'Instruções de Sistema'],
    promptText: `Pare de concordar com tudo que eu digo, me questione quando for
necessário. Quando você achar que eu estou errado, me diga; não
concorde só porque eu estou animado ou convencido de alguma coisa.`,
    whatYouWillDo: [
      'Adicionar uma instrução permanente que muda o padrão de resposta.',
      'Receber crítica antes de concordância nas avaliações que importam.',
      'Evitar o efeito colateral: crítica que trava o trabalho em vez de melhorá-lo.'
    ],
    beforeYouStart: [
      'Acesso às instruções globais ou às instruções de um projeto no Claude.',
      'Dois minutos.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cole nas instruções permanentes',
        description: 'Colar no chat funciona uma vez. Nas instruções globais ou de projeto, vale para tudo.\n\nO comportamento padrão é colaborativo: reconhecer o que você trouxe antes de sugerir mudanças. Na maior parte das conversas isso é adequado. O problema aparece quando você está usando o modelo como avaliador — aí o elogio enterra a crítica real no meio de uma frase gentil, e você lê só a primeira metade.',
        copyableText: `Pare de concordar com tudo que eu digo, me questione quando for
necessário. Quando você achar que eu estou errado, me diga; não
concorde só porque eu estou animado ou convencido de alguma coisa.`
      },
      {
        stepNumber: 2,
        title: 'Adicione o contrapeso',
        description: 'A versão de uma linha tem um efeito colateral conhecido: em pedidos simples, ele passa a fabricar objeção onde não existe. Você pede para formatar uma tabela e recebe três críticas sobre a sua escolha de tabela.\n\nEstas duas linhas resolvem sem enfraquecer a crítica onde ela importa.',
        copyableText: `COMPLEMENTO:

Aplique o questionamento quando eu pedir avaliação, decisão ou revisão.
Em pedido de execução direta, execute — e mencione o problema em uma
frase, se houver, sem transformar em discussão.

Nunca invente objeção para cumprir a regra. Se não há fraqueza
relevante, diga "sem objeções" e siga.`
      },
      {
        stepNumber: 3,
        title: 'Verifique se pegou',
        description: 'Teste com uma ideia que você sabe que é mediana. Se a resposta abrir com uma fraqueza concreta em vez de um elogio, a instrução está ativa.\n\nSe ainda vier "boa ideia!", você colou na conversa em vez das instruções permanentes — ou o projeto em uso tem outras instruções sobrescrevendo.'
      }
    ],
    troubleshooting: [
      'Continua elogiando → a instrução está no chat, não nas instruções globais ou do projeto.',
      'Virou crítico até para pedido simples → falta o complemento do passo 2.',
      'A crítica é genérica ("pode não escalar") → peça sempre a evidência: "aponte onde exatamente no que eu descrevi".',
      'Ele critica e não executa → acrescente "diga uma vez e siga com o que eu pedi".'
    ],
    goDeeperLinks: [
      { label: 'Prompts que eu provavelmente não deveria entregar', url: '#/recursos/5-secret-claude-prompts' },
      { label: 'Mentor de negócios estilo Hormozi', url: '#/recursos/alex-hormozi-business-coach' }
    ]
  }
];
