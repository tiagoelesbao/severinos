import { Resource } from '../../types';

export const AUTOMATION_RESOURCES: Resource[] = [
  {
    id: 'res-6',
    slug: 'claude-competitor-research-machine',
    title: 'Construa uma Máquina de Pesquisa de Concorrentes no Claude',
    category: 'AUTOMATION',
    description: 'Aponte o Claude para seus concorrentes e tenha todos os vídeos que superaram a média do canal desconstruídos para você — gancho, estrutura, formato — com o arquivo de skill incluído.',
    subtitle: 'Eu não caço mais ideia de conteúdo. Rodo um prompt por semana e todo vídeo de concorrente que estourou já está desmontado e arquivado — o gancho, o framework por trás, o formato, por que funcionou.',
    estimatedReadTime: '9 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['Pesquisa de Mercado', 'Inteligência Competitiva', 'Scraping', 'Claude'],
    whatYouWillDo: [
      'Acompanhar todo concorrente do seu nicho sem abrir os aplicativos.',
      'Pegar qualquer post que bateu a média do próprio canal em 3x ou mais.',
      'Receber o framework do gancho de cada vencedor, num formato que você reabastece com o seu conteúdo.'
    ],
    beforeYouStart: [
      'Claude Code instalado.',
      'Uma conta no Sandcastles — é a camada que faz a observação. É pago, sem plano gratuito.',
      'Cerca de 15 minutos, no computador.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Entenda o filtro que muda tudo',
        description: 'O erro que anula toda análise de concorrente é olhar o vídeo com mais views do canal. Ele quase sempre é o mais antigo ou o que pegou um assunto do momento — não ensina nada replicável.\n\nO que ensina é quanto o vídeo superou a **própria linha de base daquele criador**. É assim que você pega o estouro de uma conta pequena em vez de só ver conta grande sendo grande.\n\nO Sandcastles é a peça que rastreia os criadores que você escolhe e calcula essa pontuação. Esse número é o filtro inteiro.'
      },
      {
        stepNumber: 2,
        title: 'Conecte ao Claude',
        description: 'Uma linha no terminal. É a ponte: o Claude não enxerga Instagram, TikTok nem YouTube sozinho — isso canaliza os dados para dentro.',
        copyableText: `claude mcp add --transport http sandcastles https://mcp.sandcastles.ai/`
      },
      {
        stepNumber: 3,
        title: 'Monte sua lista de observação',
        description: 'Entre em app.sandcastles.ai e adicione os criadores que você quer acompanhar.\n\nSeja seletivo — quinze bons vencem cinquenta aleatórios. Tudo daqui pra frente lê dessa lista, então lista inchada vira relatório inchado.'
      },
      {
        stepNumber: 4,
        title: 'Peça a desmontagem',
        description: 'Com o MCP conectado, é só perguntar. Esse prompt é o motor inteiro.',
        copyableText: `Puxe minha lista de observação do Sandcastles.

Para cada criador, ache os vídeos dos últimos 7 dias que bateram
a média do próprio criador em 3x ou mais. Para cada um me dê:

- a primeira frase exata, palavra por palavra
- esse gancho reescrito como template reutilizável, com lacunas
- a categoria do gancho, o formato, o tema e a ideia central

No fim, resuma quais tipos de gancho e quais formatos estão
ganhando no conjunto todo.`
      },
      {
        stepNumber: 5,
        title: 'O template é o ouro',
        description: 'A saída valiosa não é "10 códigos secretos do ChatGPT". É o formato por trás: "[número] códigos secretos de [ferramenta], o número um é [código]".\n\nÉ isso que você reabastece com o seu nicho amanhã. Peça sempre o gancho vencedor como template, não só a frase original.'
      },
      {
        stepNumber: 6,
        title: 'A parte que ninguém faz',
        description: 'Rode a mesma desmontagem nos seus próprios posts — mesmo prompt, seus perfis.\n\nAgora "onde eles estão me batendo" vira uma pergunta que você responde com dado, em vez de uma sensação que você carrega.'
      }
    ],
    troubleshooting: [
      'Metade das requisições dá timeout → é normal, o servidor faz isso em torno de 30% das vezes. Não empurre mais de 5 criadores por vez ou você bate o limite de taxa.',
      'Um criador volta vazio → nada dele bateu a média em 3x nesta semana. É resposta real, não bug.',
      'Transcrição vazia mas claramente tem alguém falando → você puxou um fluxo só de vídeo. O Instagram separa o áudio em reels mais novos; pegue a faixa de áudio à parte.',
      'Não volta absolutamente nada → sua lista de observação está vazia. Ela é montada no aplicativo, não no Claude.',
      'Legendas fracas em alguns vídeos → instale yt-dlp e ffmpeg para o Claude transcrever o áudio ele mesmo.'
    ],
    goDeeperLinks: [
      { label: 'Sandcastles — a camada de descoberta', url: 'https://sandcastles.ai' },
      { label: 'O blueprint da equipe de conteúdo', url: '#/recursos/ai-content-team-blueprint' }
    ]
  },
  {
    id: 'res-14',
    slug: 'build-manychat-flows-with-claude',
    title: 'Crie Fluxos no ManyChat com o Claude',
    category: 'AUTOMATION',
    description: 'A API do ManyChat não cria fluxos visualmente — então use a extensão de navegador do Claude para construir e testar todo o seu funil de comentário para direct por você.',
    subtitle: 'A API do ManyChat não constrói fluxo. Então as pessoas montam à mão, arrastando bloco por uma hora. A extensão do Claude no Chrome abre o construtor e clica por você.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Julho de 2026',
    tags: ['ManyChat', 'Instagram DM', 'Funis', 'Isca Digital'],
    whatYouWillDo: [
      'Construir um funil completo de comentário para direct sem tocar no construtor.',
      'Definir palavra-gatilho, DM de abertura, pedido de follow, captura de e-mail e link de entrega — tudo por prompt.',
      'Fazer o Claude testar o fluxo antes de você ligar.'
    ],
    beforeYouStart: [
      'Conta no ManyChat com o Instagram (ou página do Facebook) conectado.',
      'Google Chrome + a extensão do Claude — gratuita, cerca de 1 minuto para instalar. Busque "Claude" na Chrome Web Store e fixe.',
      'O link que o fluxo vai entregar: seu material, sua página, o que for.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Abra o ManyChat e o construtor',
        description: 'Entre no ManyChat, vá em Automação → Novo Fluxo e abra o construtor em branco. Deixe na tela.\n\nDepois abra o painel lateral do Claude nessa aba. Ele lê a aba que está na frente, então mantenha o construtor ali.'
      },
      {
        stepNumber: 2,
        title: 'Diga o fluxo exato que você quer',
        description: 'Não seja vago. Dê os passos em ordem e ele constrói cada bloco.\n\nTroque a palavra-chave, o texto e o link pelo que você precisa. O Claude clica pelo construtor e liga os blocos.',
        copyableText: `Você está vendo o construtor de fluxos do ManyChat.
Construa um fluxo de comentário para direct com estes passos, em ordem:

1. Gatilho: quando alguém comentar a palavra PRESENTE em qualquer post ou reels.
2. DM de abertura: "Oi! Vi que você comentou — toca no botão que eu te mando." com um botão "Manda aí".
3. Pedido de follow: peça que sigam antes.
4. Captura de e-mail: peça o melhor e-mail antes de entregar.
5. DM de entrega: mande este link com um botão "Acessar" -> <SEU LINK>.

Construa cada bloco e conecte na ordem.`
      },
      {
        stepNumber: 3,
        title: 'Acompanhe a construção e teste',
        description: 'O Claude adiciona cada bloco e conecta. Quando terminar, use a Prévia do ManyChat para rodar o fluxo em você mesmo — comente a palavra num post de teste e confirme que a DM, o pedido de follow, o passo de e-mail e o link disparam.\n\nSe algo estiver errado, diga "o passo de e-mail não conectou, corrige" — ele edita no lugar. Não mande reconstruir do zero.'
      },
      {
        stepNumber: 4,
        title: 'Ligue',
        description: 'Quando a prévia rodar limpa, mude o fluxo para Ativo no ManyChat. Poste um reels, coloque "comente [PALAVRA]" na legenda, e todo comentário passa a rodar o fluxo automaticamente.'
      },
      {
        stepNumber: 5,
        title: 'Cubra o caminho do silêncio',
        description: 'A maioria dos fluxos é desenhada só para quem responde. Mas a maior parte das pessoas não responde — e é esse grupo que fica sem tratamento.\n\nDefina o que acontece com quem recebe a isca e some: uma mensagem em 3 dias, com ângulo diferente do primeiro, costuma recuperar uma fatia relevante. Depois disso, encerre. Insistir mais que isso queima a conta.'
      },
      {
        stepNumber: 6,
        title: 'Clone em vez de reconstruir',
        description: 'Depois de montar um, salve como template no ManyChat e peça ao Claude para duplicar para palavras novas — mesmo fluxo, troca a palavra-chave e o link.\n\nÉ o sistema inteiro: construa uma vez, clone para sempre.'
      }
    ],
    troubleshooting: [
      'O Claude não enxerga o construtor → garanta que o painel lateral está aberto na aba do ManyChat, não em outra. Atualize o ManyChat e reabra o painel.',
      'Um bloco não conectou → diga exatamente quais dois passos não estão ligados; ele reconecta. Não reconstrua do zero.',
      'A palavra-chave não dispara → confira se a conta do Instagram/Facebook está de fato conectada nas configurações do ManyChat e se o fluxo está Ativo, não Rascunho.',
      'A DM nunca chega → teste com uma conta que não seja a sua de administrador; as regras de mensagem do Instagram podem bloquear DM para você mesmo.',
      'Muita gente cai fora depois da isca → a isca não conecta com o próximo passo. Ela precisa criar o problema que o seu produto resolve.'
    ],
    goDeeperLinks: [
      { label: 'Rode todo o seu CRM no Claude', url: '#/recursos/connect-claude-to-gohighlevel' },
      { label: 'A lista de leads de $600', url: '#/recursos/claude-chrome-lead-list' }
    ]
  },
  {
    id: 'res-2',
    slug: 'connect-claude-to-gohighlevel',
    title: 'Rode Todo o Seu CRM no Claude (GoHighLevel)',
    category: 'AUTOMATION',
    description: 'Aponte o Claude para a documentação de API do GoHighLevel, crie um MCP e gerencie seu CRM inteiro — e-mails, SMS, funis e automações — diretamente pelo chat.',
    subtitle: 'Não existe conexão nativa com o GoHighLevel. Então você constrói uma: aponta o Claude para a documentação da API, pede um MCP, e ele passa a falar com o seu CRM direto.',
    estimatedReadTime: '12 min de leitura',
    difficulty: 'Advanced',
    updatedDate: 'Julho de 2026',
    isFeatured: true,
    tags: ['GoHighLevel', 'MCP', 'Claude Code', 'N8N', 'Automação'],
    whatYouWillDo: [
      'Enviar e-mails e SMS para seus contatos direto do Claude.',
      'Construir funis, workflows e automações descrevendo o que você quer.',
      'Puxar e atualizar contatos sem clicar dentro do GHL.'
    ],
    beforeYouStart: [
      'Uma conta no GoHighLevel (agência ou subconta) onde você tem acesso de administrador.',
      'Claude Code instalado e rodando.',
      '15 minutos para a configuração única.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Pegue suas credenciais do GHL',
        description: 'No GoHighLevel, vá em Configurações → Integrações Privadas (na subconta que você quer que o Claude controle). Crie uma integração nova, dê os escopos que você precisa — contatos, conversas, workflows, campanhas — e copie o token gerado.\n\nPegue também o seu Location ID em Configurações → Perfil do Negócio.\n\nGuarde os dois num lugar seguro; o token controla o seu CRM.'
      },
      {
        stepNumber: 2,
        title: 'Pegue a documentação da API',
        description: 'O GoHighLevel publica a API completa em `highlevel.stoplight.io`. Copie essa URL.\n\nÉ ela que ensina ao Claude cada endpoint: como criar contato, enviar mensagem, disparar workflow. Sem isso ele inventa nomes de campo.'
      },
      {
        stepNumber: 3,
        title: 'Mande o Claude construir o MCP',
        description: 'Abra o Claude Code e cole o pedido com o link da documentação. Ele lê os endpoints, monta o servidor MCP e devolve o trecho de configuração.',
        copyableText: `Construa um servidor MCP que conecta na API do GoHighLevel.
A documentação está aqui: https://highlevel.stoplight.io

Vou te dar um token de Integração Privada e um Location ID.

Inclua ferramentas para gerenciar contatos, enviar e-mails e SMS,
e disparar workflows.

Configure como MCP local e me diga exatamente como adicionar
na minha configuração.`
      },
      {
        stepNumber: 4,
        title: 'Adicione o token e conecte',
        description: 'Adicione o MCP à sua configuração do Claude com o token e o Location ID como variáveis de ambiente (ele te diz exatamente onde). Reinicie o Claude Code para carregar o servidor novo.\n\nDepois confirme. Se puxar contatos reais, você está conectado.',
        copyableText: `Liste meus 5 contatos mais recentes do GoHighLevel para confirmar a conexão.`
      },
      {
        stepNumber: 5,
        title: 'Rode o CRM pelo chat',
        description: 'Agora é só pedir. E vale usar para o que o painel não faz bem — o cruzamento que a interface não oferece.',
        copyableText: `Mande um SMS para <contato> confirmando o horário de sexta.

Construa um workflow de 3 e-mails de boas-vindas para leads novos e ative.

Adicione a tag "lead-quente" em todo mundo que respondeu esta semana.

Quais oportunidades estão paradas no mesmo estágio há mais de 21 dias?
Ordene por valor.`
      },
      {
        stepNumber: 6,
        title: 'Se liberar escrita, coloque limites por escrito',
        description: 'Comece com leitura por algumas semanas. Quando for liberar alteração, defina as regras nas instruções do projeto — não confie no bom senso.',
        copyableText: `REGRAS DE ESCRITA NO CRM:

PODE sem perguntar:
- Adicionar nota interna em contato.
- Criar tarefa atribuída a mim.

PODE com minha confirmação explícita:
- Adicionar ou remover tag.
- Mover oportunidade de estágio.

NUNCA:
- Enviar e-mail ou SMS para contato sem eu aprovar aquele envio.
- Apagar contato, oportunidade ou nota.
- Alterar automação ou funil existente.
- Operação em lote afetando mais de 10 registros.`
      },
      {
        stepNumber: 7,
        title: 'A jogada que se repete em qualquer ferramenta',
        description: 'O movimento "acha a documentação → constrói um MCP" funciona para quase toda ferramenta com API. O GHL é só o exemplo.\n\nFaça uma vez e você entende como conectar o Claude a qualquer coisa que tenha documentação pública.'
      }
    ],
    troubleshooting: [
      '401 / não autorizado → falta escopo no token. Volte na Integração Privada do GHL, adicione o escopo da ação (por exemplo conversations/message.write para enviar mensagem) e gere de novo.',
      '"Location not found" → Location ID errado ou faltando. Pegue de novo em Configurações → Perfil do Negócio e confirme que bate com a subconta.',
      'O Claude não acha um endpoint → cole a página específica da documentação daquela ação no chat; a documentação completa é grande e ele pode precisar da referência exata.',
      'Limite de taxa → o GHL limita chamadas. Espace ações em massa ou peça para ele agrupar em lotes.',
      'Os números não batem com o painel → provavelmente filtro de subconta ou fuso. Peça que ele declare os filtros usados.'
    ],
    goDeeperLinks: [
      { label: 'Documentação de API do GoHighLevel', url: 'https://highlevel.stoplight.io' },
      { label: 'Ferramentas open-source que valem a pena', url: '#/recursos/5-open-source-claude-tools' }
    ]
  },
  {
    id: 'res-24',
    slug: 'auto-post-to-6-social-platforms-daily',
    title: 'Publicação Automática Diária em 6 Redes Sociais',
    category: 'AUTOMATION',
    description: 'Como conectei o Claude Code para publicar meu conteúdo em 6 plataformas todos os dias de forma automática — sem envios manuais.',
    subtitle: 'Um vídeo, seis plataformas, zero upload manual. Claude Code mais Zernio publicam em Instagram, TikTok, YouTube, X, LinkedIn e Threads. O que levava 30 minutos por vídeo virou um comando.',
    estimatedReadTime: '11 min de leitura',
    difficulty: 'Advanced',
    updatedDate: 'Agosto de 2026',
    tags: ['Redes Sociais', 'Distribuição', 'Automação', 'N8N'],
    whatYouWillDo: [
      'Publicar uma peça em seis plataformas a partir de um comando no Claude Code.',
      'Gerar automaticamente uma legenda nativa para cada plataforma.',
      'Agendar para publicar todo dia no piloto automático.'
    ],
    beforeYouStart: [
      'Claude Code configurado e logado.',
      'Uma conta no Zernio (late.com) — gratuito para começar.',
      'Seu conteúdo pronto em uma pasta só: Dropbox, Google Drive ou local.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crie a conta no Zernio e conecte as redes',
        description: 'Entre no Zernio, crie a conta e conecte cada rede — Instagram, TikTok, YouTube, X, LinkedIn, Threads. Clica em cada uma, faz login, pronto.\n\nConecte só as redes que você usa de verdade. Automatizar rede morta é automatizar nada.'
      },
      {
        stepNumber: 2,
        title: 'Pegue sua chave de API',
        description: 'No Zernio, abra a área de chaves de API e copie a sua. É o que permite o Claude Code conversar com o Zernio.'
      },
      {
        stepNumber: 3,
        title: 'Adicione o Zernio como MCP no Claude Code',
        description: 'Configure o servidor MCP do Zernio no Claude Code e coloque sua chave de API.\n\nAgora o Claude consegue publicar, puxar métricas — qualquer coisa que o Zernio faça.'
      },
      {
        stepNumber: 4,
        title: 'Construa um skill de publicação',
        description: 'Crie um skill no Claude Code que puxa um vídeo da sua pasta de conteúdo, transcreve, escreve uma legenda de alta conversão para cada plataforma e publica pelo Zernio.\n\nÉ só dizer ao Claude o que você quer que o skill faça e ele constrói o arquivo.',
        copyableText: `Construa um skill chamado "publicar" que:

1. Lista os vídeos prontos na minha pasta de conteúdo e me deixa escolher um.
2. Transcreve o vídeo escolhido.
3. Escreve uma legenda nativa para cada rede:
   - LinkedIn: 1.300 caracteres, primeira linha isolada como gancho
   - Instagram: primeira linha tem que funcionar no corte de 125 caracteres
   - X: 280 caracteres ou thread numerada
   - YouTube: 1.000 caracteres, tom direto
   - TikTok: 150 caracteres, linguagem falada
   - Threads: curto e conversacional
4. Me mostra as legendas para aprovação ANTES de publicar.
5. Publica pelo Zernio nas redes que eu aprovar.

Nunca publique sem minha aprovação explícita daquela peça.`
      },
      {
        stepNumber: 5,
        title: 'Rode',
        description: 'Diga ao Claude "publica uma peça". O skill mostra o que tem na pasta, você aprova qual, e ele publica nas seis — legendas e tudo.\n\nNunca deixe o mesmo texto ir para todas as redes. O público percebe e o alcance despenca. É por isso que o passo 4 pede legenda nativa por plataforma.'
      },
      {
        stepNumber: 6,
        title: 'Deixe totalmente sem mão (opcional)',
        description: 'Embrulhe o passo 5 numa rotina agendada ao meio-dia e ele publica todo dia sem você tocar.\n\nUm cuidado que não é opcional: teto diário. Se algo der errado na geração e criar quarenta peças, a rotina não pode despejar quarenta posts. Defina um máximo por rede por dia.'
      },
      {
        stepNumber: 7,
        title: 'Coloque a revisão no lugar certo',
        description: 'Revisar cada post antes de cada envio anula o benefício. Não revisar nada é como a conta publica algo constrangedor.\n\nO meio-termo: um momento fixo por semana em que você abre a fila da semana seguinte, lê tudo de uma vez e aprova. Vinte minutos por semana, e o resto roda sozinho com você sabendo o que vai ao ar.'
      }
    ],
    troubleshooting: [
      'Uma plataforma não publica → aquela conta não está totalmente conectada no Zernio; reconecte.',
      'Erros de API → sua chave está errada ou sem escopo. Gere de novo no Zernio e readicione.',
      'Legenda rejeitada → passou do limite de caracteres da plataforma. Faça o skill cortar por rede.',
      'A mesma peça foi publicada duas vezes → o envio não é idempotente. Marque como publicado imediatamente após o sucesso.',
      'O alcance caiu depois de automatizar → provavelmente texto idêntico entre redes. Reforce a adaptação por plataforma.',
      'Token de rede social expirou → tokens de API social expiram com frequência. Trate a renovação como manutenção mensal, não como incidente.'
    ],
    goDeeperLinks: [
      { label: 'Zernio', url: 'https://late.com' },
      { label: 'As Rotinas mudaram o Claude Code', url: '#/recursos/routines-changed-claude-code-forever' }
    ]
  }
];
