import { Resource } from '../../types';

export const CLAUDE_RESOURCES: Resource[] = [
  {
    id: 'res-claude-agreement',
    slug: 'claude-client-agreement-system',
    title: 'Sistema de Contratos de Clientes no Claude',
    category: 'CLAUDE',
    description: 'Envie seu modelo de contrato para o Claude, insira o prompt de instruções e transforme cada venda fechada em um PDF pronto para assinatura antes de desligar o telefone.',
    subtitle: 'Mandar o contrato três dias depois da call é como negócio morre. Monte uma vez e, toda vez que um cliente diz sim, você digita uma linha e o contrato está pronto antes de desligar.',
    estimatedReadTime: '7 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    isFeatured: true,
    tags: ['Contratos', 'Claude Projects', 'Vendas', 'Geração de PDF'],
    whatYouWillDo: [
      'Montar um Projeto que escreve todo contrato a partir do seu próprio modelo.',
      'Fechar negócio, digitar uma linha — nome, valor, data de início — e receber o PDF nomeado com o cliente.',
      'Receber junto um e-mail curto de envio, para o contrato sair enquanto você ainda está na ligação.'
    ],
    beforeYouStart: [
      'Uma conta no claude.ai — você precisa de Projetos e upload de arquivo, e o plano gratuito tem os dois.',
      'Seu contrato atual, salvo em um único arquivo (doc ou PDF). Use o que você já manda — este sistema preenche, não escreve a sua linguagem jurídica.',
      'Aviso: isto não é orientação jurídica. O contrato é seu; o Claude só preenche as lacunas.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crie o projeto',
        description: 'Vá em claude.ai → Projetos → Novo projeto. Nomeie como "Contratos de Clientes".\n\nO Projeto mantém seus arquivos e instruções anexados de forma permanente — você monta uma vez e todo negócio futuro passa por ali.'
      },
      {
        stepNumber: 2,
        title: 'Suba o seu modelo de contrato',
        description: 'Dentro do projeto, envie o arquivo do contrato para a base de conhecimento.\n\nAntes de subir, apague as partes específicas de cliente: onde vai nome, valor ou data, coloque um marcador como [NOME DO CLIENTE] ou [VALOR]. Todo o resto fica exatamente como você já manda.\n\nSe o seu contrato vive espalhado em e-mails antigos em vez de um arquivo limpo, junte tudo em um documento primeiro. Um contrato padrão cobre estas seções:',
        copyableText: `[ ] Partes — o nome da sua empresa e uma lacuna para o cliente
[ ] Serviços — o que você entrega
[ ] Valores — uma lacuna para o preço
[ ] Forma de pagamento — uma lacuna para como e quando pagam
[ ] Vigência — uma lacuna para data de início e duração
[ ] Assinaturas — uma linha para cada lado

Isso é um checklist de seções, não linguagem jurídica.
Use a redação do contrato que você já envia, ou peça a um advogado
para revisar o seu — de novo, isto não é orientação jurídica.`
      },
      {
        stepNumber: 3,
        title: 'Cole o prompt de Instruções',
        description: 'No projeto, clique em Instruções e cole isto exatamente. A linha que faz o trabalho pesado é "nunca reescreva minha linguagem jurídica" — sem ela o Claude vai tentar melhorar o seu contrato. Você não quer melhorado, quer preenchido.',
        copyableText: `Você escreve meus contratos de cliente a partir do modelo salvo neste projeto.

Quando um negócio fecha, eu digito os termos: nome do cliente, serviço, valor, forma de pagamento, data de início.

1. Preencha o modelo com esses termos. Todo o resto fica palavra por palavra — nunca reescreva minha linguagem jurídica.

2. Se um termo conflitar com o modelo ou faltar alguma informação, pergunte antes de escrever.

3. Entregue o contrato final como PDF nomeado [NOME DO CLIENTE] - Contrato, mais um e-mail de 3 frases para eu enviar junto.

MEU NEGÓCIO: [o que você faz + seus termos padrão]`
      },
      {
        stepNumber: 4,
        title: 'Digite os termos quando fechar',
        description: 'Cliente disse sim na ligação. No chat do projeto, digite uma linha só.\n\nÉ isso. O Claude puxa o modelo, encaixa os termos e devolve o PDF nomeado mais o e-mail de três frases. Se faltar algo — sem data de início, um valor que não bate com o seu padrão — ele pergunta antes de escrever, porque a instrução mandou.',
        copyableText: `Consultoria Acme — R$ 2.500/mês — 6 meses — início em 1º de março`
      },
      {
        stepNumber: 5,
        title: 'Envie antes de desligar',
        description: 'Baixe o PDF, cole o e-mail, anexe, envie. O cliente recebe o contrato com o sim ainda quente, não três dias depois de ele ter conversado com outra pessoa.\n\nRode uma vez com termos falsos antes de um negócio real, para a primeira execução ao vivo não ser a que conta.'
      }
    ],
    troubleshooting: [
      'O Claude reescreveu sua linguagem jurídica → a linha "palavra por palavra" se perdeu. Recole o prompt completo do passo 3 nas Instruções e salve.',
      'Veio texto em vez de PDF → responda "entregue isso como arquivo PDF". Se repetir, confira se o prompt está salvo nas Instruções, não digitado no chat.',
      'Ele pergunta coisas que você já digitou → sua linha de termos está sem um dos cinco itens: nome, serviço, valor, forma de pagamento, data de início.',
      'Valor ou data errados no documento → leia as lacunas preenchidas antes de enviar, toda vez. O Claude digita; quem assina embaixo é você.',
      'Esqueceu tudo na conversa seguinte → o prompt foi colado num chat em vez das Instruções do projeto. Chat reseta, Instruções não.'
    ],
    goDeeperLinks: [
      { label: 'Rode todo o seu CRM no Claude', url: '#/recursos/connect-claude-to-gohighlevel' },
      { label: 'Guia de configuração do Claude Cowork', url: '#/recursos/claude-cowork-setup-guide' }
    ]
  },
  {
    id: 'res-cowork-setup',
    slug: 'claude-cowork-setup-guide',
    title: 'Guia de Configuração do Claude Cowork',
    category: 'CLAUDE',
    description: 'A configuração exata do ambiente Cowork: o modelo de Instruções Globais, a pasta de 3 documentos do negócio e a primeira tarefa para o Claude realmente conhecer sua empresa.',
    subtitle: 'Se o Claude vive esquecendo tudo sobre o seu negócio, não é o Claude — é a sua configuração. Um modelo, uma pasta, cinco minutos.',
    estimatedReadTime: '9 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Claude Cowork', 'System Prompts', 'Produtividade'],
    whatYouWillDo: [
      'Definir instruções permanentes uma vez, para toda tarefa do Cowork já começar sabendo do seu negócio.',
      'Entregar ao Claude uma pasta com as suas coisas e fazê-lo ler cada arquivo antes de trabalhar.',
      'Rodar tarefas reais como "planeje minha semana de conteúdo" e receber uma saída construída a partir dos seus arquivos, não conselho genérico.'
    ],
    beforeYouStart: [
      'O aplicativo de desktop do Claude — é onde o Cowork vive. Baixe em claude.ai/download.',
      'Um computador. Esta configuração é de desktop, não dá no celular.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Abra as Instruções Globais',
        description: 'Abra o Claude → clique em Cowork → Configurações → Instruções Globais → Editar.\n\nAs Instruções Globais são o que o Claude lê antes de cada tarefa. Você define uma vez e nunca mais reexplica o seu negócio.'
      },
      {
        stepNumber: 2,
        title: 'Cole o modelo',
        description: 'Copie o bloco abaixo, preencha os colchetes, cole e salve.\n\nSobre preencher: seja específico. "Tenho uma empresa de paisagismo que ajuda donos de casa a ter um jardim com que nunca precisam se preocupar" vence "tenho uma empresa". Nomeie suas ferramentas reais — Google Agenda, Gmail, o CRM que você usa. E a última linha é a que mais importa: é ela que faz o passo da pasta funcionar.',
        copyableText: `Sobre mim: eu toco [TIPO DE NEGÓCIO] ajudando [QUEM] a conseguir [RESULTADO].

Como eu trabalho: respostas curtas, me dê a próxima ação primeiro, pergunte antes de assumir.

Minhas ferramentas: [AGENDA], [E-MAIL], [CRM]. Consulte antes de responder qualquer coisa sobre minha agenda, clientes ou pipeline.

Regras de escrita: escreva como eu — palavras simples, frases curtas, nada de linguagem corporativa.

Quando eu te der uma pasta, leia todos os arquivos dela antes de começar.`
      },
      {
        stepNumber: 3,
        title: 'Monte a pasta do negócio',
        description: 'Crie uma pasta nova no seu desktop. Nomeie como "Meu Negócio". Coloque 3 documentos dentro:\n\n**sua oferta** — o que você vende, quanto custa, para quem\n**seus clientes** — com quem você está trabalhando agora e em que pé está cada um\n**esta semana** — o que você está tentando concluir nesta semana\n\nAlgumas frases simples em cada um já bastam. Três documentos curtos vencem um gigante — você só quer que o Claude segure o retrato real do negócio.'
      },
      {
        stepNumber: 4,
        title: 'Aponte o Cowork para a pasta',
        description: 'Abra o Cowork, selecione a pasta "Meu Negócio" quando ele perguntar em que trabalhar e clique em Permitir.\n\nEsse clique em Permitir é o ponto inteiro. O Claude passa a conseguir ler os seus arquivos de verdade em vez de adivinhar.'
      },
      {
        stepNumber: 5,
        title: 'Dê uma tarefa real',
        description: 'Digite isto e observe. Ele lê a sua oferta, os seus clientes, a sua semana — e monta o plano em cima do negócio real. É a diferença entre o Claude conversando e o Claude trabalhando.\n\nDepois que isso engrenar, troque a pasta do desktop por qualquer outra: uma pasta de cliente, a de conteúdo, a da contabilidade. Mesma configuração, é só apontar o Cowork para outra pasta por tarefa.',
        copyableText: `Planeje minha semana de conteúdo a partir dos arquivos desta pasta`
      }
    ],
    troubleshooting: [
      'Não aparece a opção Cowork → o Cowork vive no aplicativo de desktop, não no navegador. Baixe ou atualize em claude.ai/download.',
      'As respostas continuam genéricas → ele não está lendo a pasta. Selecione a pasta de novo no Cowork e confirme que você clicou em Permitir. Confira também se a última linha do modelo ("leia todos os arquivos dela") entrou nas Instruções Globais.',
      'O modelo não ficou salvo → provavelmente você não clicou em Salvar. Volte em Configurações → Instruções Globais e confirme que o seu texto está lá.',
      'O plano saiu estranho → seus documentos estão finos demais. Acrescente alguns detalhes reais nos 3 arquivos e rode de novo.'
    ],
    goDeeperLinks: [
      { label: 'Baixar o Claude para desktop', url: 'https://claude.ai/download' },
      { label: 'Melhor forma de configurar o Claude Code', url: '#/recursos/best-way-to-set-up-claude-code' }
    ]
  },
  {
    id: 'res-free-course',
    slug: 'free-claude-code-course',
    title: 'O Curso Gratuito de Claude Code',
    category: 'CLAUDE',
    description: 'Uma hora, do início ao fim, sem necessidade de conhecimento prévio em programação. Instale, dê tarefas reais e crie seu primeiro skill.',
    subtitle: 'É o curso que eu indico quando alguém diz "tá, mas por onde eu começo de verdade".',
    estimatedReadTime: '45 min de vídeo',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Curso', 'Claude Code', 'Terminal', 'Iniciante'],
    videoUrl: 'https://www.youtube.com/watch?v=j7FuEsy2TAg',
    whatYouWillDo: [
      'Instalar o Claude Code e deixá-lo de fato funcionando na sua máquina, não meio configurado.',
      'Dar uma tarefa real do seu negócio e receber um resultado real de volta.',
      'Construir seu primeiro skill, para o que você acabou de fazer à mão rodar com um comando na próxima vez.'
    ],
    beforeYouStart: [
      'Uma assinatura do Claude e um terminal. É genuinamente só isso.',
      'Se a palavra "terminal" te deixou tenso, tudo bem — é exatamente para quem o curso foi feito. A instalação está gravada na tela.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Assista em três passadas, não em uma',
        description: 'O vídeo é uma sessão só, mas ninguém assiste uma hora direto. Faça em três blocos — e a divisão importa mais do que parece.'
      },
      {
        stepNumber: 2,
        title: 'Primeira passada — instalação',
        description: 'Instale e faça uma coisa funcionar. Pare aí.\n\nA maioria das pessoas desiste na instalação, e depois que você passa dela o resto é fácil. Não tente avançar para a parte interessante com a base meio quebrada.'
      },
      {
        stepNumber: 3,
        title: 'Segunda passada — dê trabalho de verdade',
        description: 'Aponte para algo que você realmente faz toda semana. Não um projeto de demonstração.\n\nA ficha cai quando a saída é algo pelo qual você teria pagado. Enquanto for exemplo de brinquedo, continua parecendo truque de salão.'
      },
      {
        stepNumber: 4,
        title: 'Terceira passada — construa um skill',
        description: 'É aqui que ele deixa de ser uma janela de chat e vira um sistema. Um comando, mesmo resultado, para sempre.\n\nDepois de construir o primeiro, construa o segundo no mesmo dia. É esse o truque inteiro: o primeiro é novidade, o segundo é hábito.'
      }
    ],
    troubleshooting: [
      'A instalação falha ou o comando não é encontrado → quase sempre é o Node. Instale o Node primeiro, reinicie o terminal e tente de novo.',
      'Ele dá uma resposta mediana → você deu um prompt mediano, sem contexto. O Claude é tão bom quanto os dados que você entrega. Isso é a maior parte do curso, honestamente.',
      'Ele editou a coisa errada → você está na pasta errada. Confira onde está antes de rodar.',
      'Você se perdeu no meio → volte para a última coisa que funcionou e refaça. Não avance com a configuração quebrada, você só empilha problema.'
    ],
    goDeeperLinks: [
      { label: 'Assistir ao curso no YouTube', url: 'https://www.youtube.com/watch?v=j7FuEsy2TAg' },
      { label: 'Melhor forma de configurar o Claude Code', url: '#/recursos/best-way-to-set-up-claude-code' }
    ]
  },
  {
    id: 'res-5',
    slug: '5-secret-claude-code-commands',
    title: '5 Comandos Secretos do Claude Code',
    category: 'CLAUDE',
    description: 'Cinco comandos reais do Claude Code que a maioria das pessoas não conhece — raciocínio mais profundo, contexto que sobrevive a longas sessões e fluxos executados com um único barra.',
    subtitle: 'A maior parte das pessoas usa o Claude Code a uns 20% do que ele faz. Não porque seja difícil — porque ninguém conta que isso existe.',
    estimatedReadTime: '6 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    isFeatured: true,
    tags: ['Claude Code', 'Terminal', 'Ferramentas de Dev', 'CLI', 'Produtividade'],
    promptText: `ultrathink   → raciocínio muito mais profundo naquela resposta
/compact     → comprime a conversa longa e te mantém rodando
@arquivo     → puxa arquivo, pasta ou recurso de MCP para o contexto
/context     → mostra exatamente o que está carregado agora
/seu-skill   → roda um fluxo inteiro que você construiu uma vez`,
    whatYouWillDo: [
      'Conseguir respostas notavelmente melhores nas questões difíceis, sob demanda.',
      'Manter uma sessão longa viva em vez de vê-la morrer com a janela de contexto cheia.',
      'Parar de reexplicar a sua configuração em toda conversa.'
    ],
    beforeYouStart: [
      'Claude Code instalado e rodando. Se ainda não, comece pela configuração — leva minutos.',
      'Tudo abaixo funciona no terminal. Digite, dê enter, pronto.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'ultrathink',
        description: 'Coloque a palavra `ultrathink` em qualquer lugar do seu prompt e o Claude raciocina muito mais naquela resposta.\n\nUse no que importa: depurar algo feio, planejar uma construção, escolher entre duas abordagens. Não desperdice em "renomeie esse arquivo".\n\nA parte que ninguém conta: "pense com calma", "pense mais", "pense passo a passo" não fazem nada. São só palavras no seu prompt. `ultrathink` é a que o Claude Code de fato reconhece. E é só no Claude Code — digitar isso no claude.ai não faz nada.',
        copyableText: `ultrathink — por que minha página de checkout converte a 0,4%?`
      },
      {
        stepNumber: 2,
        title: '/compact',
        description: 'Sessão longa, contexto enchendo, o Claude começa a ficar burro. É a janela enchendo. O `/compact` comprime a conversa inteira e te mantém rodando.\n\nA versão boa é a que diz o que preservar — aí ele protege a parte que te interessa em vez de adivinhar. Rode antes de estar desesperado, não depois.',
        copyableText: `/compact

# A versão melhor — diga o que manter:
/compact foque no trabalho de autenticação e no schema do banco`
      },
      {
        stepNumber: 3,
        title: '@ — puxar arquivo para o contexto',
        description: 'Digite `@` e comece a escrever um nome de arquivo. O autocompletar aparece, você escolhe, e ele entra no contexto. Sem copiar e colar, sem despejar 400 linhas no chat.\n\nFaz três coisas: `@caminho/arquivo.js` puxa o arquivo, `@src/componentes` puxa a listagem da pasta, e `@github:repos/dono/repo/issues` puxa um recurso de MCP. Esse último é como você aponta o Claude para dado ao vivo de uma ferramenta conectada sem sair do terminal.',
        copyableText: `@src/components/Checkout.tsx por que isso renderiza duas vezes?`
      },
      {
        stepNumber: 4,
        title: '/context',
        description: 'Este é o que resolve o "por que o Claude vive esquecendo o que eu falei".\n\nEle imprime exatamente o que está carregado agora: seus arquivos CLAUDE.md, sua memória, quais skills estão disponíveis, quais servidores MCP estão conectados, em que modelo você está.\n\nNove em cada dez vezes em que o Claude ignora suas instruções, isso mostra o porquê: o arquivo não está carregado, ou está carregado de uma pasta diferente da que você imagina. Dois segundos para checar, uma hora economizada discutindo com ele.',
        copyableText: `/context`
      },
      {
        stepNumber: 5,
        title: 'Skills personalizados — o verdadeiro atalho',
        description: 'Construa um fluxo uma vez e rode para sempre com uma barra.\n\nUm skill é uma pasta com um arquivo markdown dentro. Coloque suas instruções nesse arquivo — como você quer aquilo feito, sempre. Depois é só chamar pelo nome.\n\nO jeito mais fácil de fazer o primeiro: peça ao próprio Claude Code para construir. Diga qual é o fluxo e mande salvar como skill. Qualquer coisa que você faz mais de duas vezes vira skill e você nunca mais explica.',
        copyableText: `~/.claude/skills/meu-fluxo/SKILL.md

# depois:
/meu-fluxo`
      },
      {
        stepNumber: 6,
        title: 'O sexto, grande demais para caber aqui',
        description: 'Existe um sexto que mereceu guia próprio: as Rotinas. Elas rodam suas tarefas na nuvem, em horário marcado, com o notebook fechado.\n\nÉ a diferença entre um comando que você dispara e um agente que trabalha enquanto você dorme.'
      }
    ],
    troubleshooting: [
      'O ultrathink não faz nada → você provavelmente está no claude.ai, não no Claude Code. É só no terminal.',
      '/compact apagou algo que você precisava → você rodou a versão simples. Use a forma com argumento e nomeie o que proteger.',
      'O @ não encontra seu arquivo → o caminho é relativo a onde você iniciou o Claude Code. Rode /context e veja em que pasta você realmente está.',
      'Seu skill não aparece → confira se o nome da pasta bate e se o arquivo se chama SKILL.md exatamente. Maiúsculas importam.',
      'O Claude ignora seu CLAUDE.md → rode /context. Quase sempre ele não está carregado, ou veio de outra pasta.'
    ],
    goDeeperLinks: [
      { label: 'As Rotinas mudaram o Claude Code', url: '#/recursos/routines-changed-claude-code-forever' },
      { label: 'Documentação do Claude Code', url: 'https://code.claude.com/docs' }
    ]
  },
  {
    id: 'res-22',
    slug: 'best-way-to-set-up-claude-code',
    title: 'Melhor Forma de Configurar o Claude Code',
    category: 'CLAUDE',
    description: 'Instalação, chave de API, primeira execução — tudo o que você precisa para colocar o Claude Code funcionando em poucos minutos.',
    subtitle: 'O Claude Code é a peça em que todo o resto do cofre se encaixa — MCPs, skills e automações passam por ele. Cerca de 10 minutos, e você faz uma vez só.',
    estimatedReadTime: '5 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Instalação', 'Claude Code', 'CLI'],
    whatYouWillDo: [
      'Rodar o Claude direto do terminal, com acesso aos seus arquivos, sem navegador.',
      'Conectar MCPs para o Claude usar as suas ferramentas.',
      'Construir skills que automatizam o trabalho repetitivo.'
    ],
    beforeYouStart: [
      'Uma máquina Mac ou Windows e uns 10 minutos.',
      'Você não precisa ser programador. Se você copia e cola, está resolvido.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Instale o Node.js',
        description: 'Vá em nodejs.org e baixe a versão LTS. Instale e confirme que funcionou abrindo o terminal e rodando o comando abaixo — você deve ver um número de versão.\n\n(No Mac, o Terminal está em Aplicativos → Utilitários, ou busque por "Terminal". No Windows, busque por "Prompt de Comando" ou "PowerShell".)',
        copyableText: `node -v`
      },
      {
        stepNumber: 2,
        title: 'Instale o Claude Code',
        description: 'No Mac ou Linux, cole a primeira linha no terminal. No Windows — ou se você preferir npm em qualquer sistema — use a segunda.\n\nDeixe terminar; ele avisa que o Claude Code foi instalado.',
        copyableText: `# Mac / Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows, ou npm em qualquer sistema
npm install -g @anthropic-ai/claude-code`
      },
      {
        stepNumber: 3,
        title: 'Rode e faça login',
        description: 'No terminal, rode `claude`. Ele abre o navegador para você entrar na sua conta Anthropic. Aprove, volte para o terminal — está dentro.\n\nPara uso local essa é a rota recomendada: não há chave de API para guardar nem para vazar.',
        copyableText: `claude`
      },
      {
        stepNumber: 4,
        title: 'Confirme que está funcionando',
        description: 'Dentro do Claude Code, cheque a sua configuração com `/status`. Depois é só conversar com ele — "quais arquivos tem nesta pasta?" — e observar.\n\nPara um teste que vale mais: peça algo que exija ler o projeto de verdade, como "me diga três coisas inconsistentes entre os arquivos, com arquivo e linha". Se vier específico, está tudo certo.',
        copyableText: `/status`
      }
    ],
    troubleshooting: [
      '"claude: command not found" → a instalação não entrou no PATH. Feche o terminal, abra um novo e tente de novo. Se persistir, rode o comando de instalação outra vez.',
      '"node: command not found" → o Node não instalou ou não está no PATH. Reinstale a LTS e reabra o terminal.',
      'O login não conclui → termine o login no navegador até dizer aprovado, depois volte ao terminal.',
      'Erro EACCES na instalação por npm → não use sudo. Configure um diretório npm próprio antes de reinstalar.'
    ],
    goDeeperLinks: [
      { label: 'Documentação do Claude Code', url: 'https://code.claude.com/docs' },
      { label: 'O curso gratuito de Claude Code', url: '#/recursos/free-claude-code-course' }
    ]
  },
  {
    id: 'res-23',
    slug: 'routines-changed-claude-code-forever',
    title: 'O Comando /routines Mudou o Claude Code para Sempre',
    category: 'CLAUDE',
    description: 'Use as /routines no Claude Code para automatizar tarefas repetitivas do dia a dia e transformar completamente seu fluxo de trabalho.',
    subtitle: 'Zapier, n8n, Make — as Rotinas do Claude Code substituíram os três em silêncio. Uma rotina roda suas tarefas na nuvem, 24 horas, com o notebook aberto ou não.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['Rotinas', 'Claude Code', 'Automação'],
    whatYouWillDo: [
      'Agendar o Claude para rodar qualquer tarefa em horário marcado — briefing matinal, publicação automática, coleta de tendências — sem notebook ligado.',
      'Encadear com seus skills e MCPs para um fluxo inteiro disparar no horário.'
    ],
    beforeYouStart: [
      'Claude Code configurado e logado. Se ainda não, comece pela configuração.',
      'Uma tarefa que você já faz de forma repetida — comece por algo que existe, não por algo hipotético.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Abra as Rotinas',
        description: 'Vá em claude.ai/code e clique em Rotinas na barra lateral.\n\nVocê está basicamente implantando um agente que faz o seu trabalho enquanto você dorme — não é um comando de terminal, é um agendamento na nuvem.'
      },
      {
        stepNumber: 2,
        title: 'Crie uma rotina nova',
        description: 'Clique em Nova Rotina e dê um nome — por exemplo, "Briefing matinal de conteúdo".'
      },
      {
        stepNumber: 3,
        title: 'Descreva a tarefa',
        description: 'Em português comum, diga exatamente o que fazer: "toda manhã, levante os assuntos de IA em alta e me dê 10 ideias de conteúdo".\n\nSeja específico. Ela roda sem ninguém olhando, então detalhe a saída que você quer. Descrição vaga produz saída vaga, e você só descobre no dia seguinte.',
        copyableText: `Toda manhã, levante os assuntos em alta no meu nicho e me entregue:

1. Os 5 assuntos com maior movimento nas últimas 24h.
2. Para cada um, um ângulo que combine com o meu negócio.
3. Um gancho pronto para o primeiro deles.

Se não houver nada relevante em alta, escreva "sem movimento hoje" e encerre.
Não invente assunto para preencher.`
      },
      {
        stepNumber: 4,
        title: 'Defina o horário',
        description: 'Escolha quando e com que frequência — diariamente às 7h, toda segunda, o que for. Essa é a parte do cron, sem escrever código.'
      },
      {
        stepNumber: 5,
        title: 'Salve e confirme',
        description: 'Salve. Depois da primeira execução agendada, confira o histórico de execuções para confirmar que disparou e fez o que você queria. Ajuste a descrição se a saída estiver fora.\n\nEsse passo não é opcional: uma rotina que falha em silêncio é pior que rotina nenhuma, porque você passa a confiar num relatório que parou de ser gerado.'
      },
      {
        stepNumber: 6,
        title: 'Três rotinas que valem roubar',
        description: '**Briefing matinal** — assuntos em alta e ideias de conteúdo na sua caixa até as 7h.\n\n**Publicação diária** — puxa o conteúdo pronto e publica nas plataformas (combina com a automação de publicação em 6 redes).\n\n**Relatório semanal** — puxa suas métricas e resume o que está funcionando.\n\nRevise o que está agendado uma vez por mês. Se você não leu a última saída de alguma rotina duas vezes seguidas, desative — o custo dela não é o processamento, é o ruído.'
      }
    ],
    troubleshooting: [
      'Não rodou → confira o horário, o fuso e se a rotina está habilitada.',
      'Ela precisa de uma ferramenta que não tem → a tarefa usa um MCP ou conector que não está configurado na rotina. Adicione e rode de novo.',
      'A saída está errada → sua descrição estava vaga demais. Reescreva como se estivesse fazendo o briefing de um prestador.',
      'Gerou relatório vazio com cara de completo → falta a regra de "se não houver dado, diga isso e encerre".'
    ],
    goDeeperLinks: [
      { label: 'Publicação automática diária em 6 redes', url: '#/recursos/auto-post-to-6-social-platforms-daily' },
      { label: '5 comandos secretos do Claude Code', url: '#/recursos/5-secret-claude-code-commands' }
    ]
  }
];
