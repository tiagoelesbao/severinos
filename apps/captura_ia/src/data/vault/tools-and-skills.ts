import { Resource } from '../../types';

export const TOOLS_AND_SKILLS_RESOURCES: Resource[] = [
  {
    id: 'res-website-design',
    slug: 'claude-website-design',
    title: 'Crie Sites no Claude sem Aquele Visual Genérico de IA',
    category: 'TOOLS AND SKILLS',
    description: 'O stack de design que impede o Claude de gerar layouts roxos genéricos — instale o skill, deixe o Claude tirar print da própria página e descreva o site em português claro.',
    subtitle: 'Todo site feito por IA tem a mesma cara. Não é falta de capacidade do modelo — é falta de vocabulário. Você não pede ritmo vertical mais apertado se nunca usou a expressão.',
    estimatedReadTime: '10 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['UI/UX', 'Tailwind CSS', 'Sistema de Design', 'Design Premium'],
    promptText: `REGRAS DE DESIGN — cole junto com o pedido:

- Nada de gradiente roxo ou azul-violeta. É a assinatura mais reconhecível de IA.
- Nada de card dentro de card. Isso é profundidade sem hierarquia.
- Não use Inter em tudo. É uma boa fonte padrão — e esse é o problema: soa como "ninguém decidiu nada".
- Nada de espaçamento uniforme em tudo. Design real tem ritmo: apertado onde as coisas se relacionam, generoso onde não.
- Nada de grade de três colunas com três ícones. É o formato padrão de página que ninguém pensou.
- Trave a paleta. Escolha as cores uma vez e referencie por nome, ou você terá oito cores na terceira edição.`,
    whatYouWillDo: [
      'Descrever um site em português comum e receber algo que não parece gerado por IA.',
      'Fazer o Claude abrir a página que acabou de construir, tirar print e corrigir o que está errado.',
      'Apontar para um site que você gosta e extrair a linguagem de design dele.'
    ],
    beforeYouStart: [
      'Claude Code instalado. Se ainda não, faça o curso gratuito antes — cerca de uma hora, sem exigir programação.',
      'Um terminal. Isso acontece no computador, não no celular.',
      'Nada de Figma, nada de formação em design, nada de ferramenta paga.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Dê vocabulário ao Claude — nomeie os vícios',
        description: 'O modelo cai no visual genérico porque "genérico" é a média de tudo que ele viu. Você sobrescreve isso nomeando o que evitar.\n\nCole as regras do bloco acima como restrição dura no seu pedido. Metade do problema de design por IA desaparece na hora — não porque o modelo não sabia fazer melhor, mas porque ninguém tinha dito o que era "pior".'
      },
      {
        stepNumber: 2,
        title: 'Dê olhos ao Claude',
        description: 'Um modelo que não enxerga o próprio resultado está chutando. Habilite o navegador para ele abrir a página que construiu, tirar print e olhar o que de fato renderizou.\n\nEsse é o passo que quase todo mundo pula e é o que mais importa. Sem ele o Claude escreve CSS às cegas e torce. Com ele o ciclo fecha: constrói, abre, printa, corrige o que está visivelmente errado.'
      },
      {
        stepNumber: 3,
        title: 'Descreva o site em português comum',
        description: 'Sem jargão do seu lado — o jargão você já resolveu no passo 1.',
        copyableText: `Construa uma landing page para um negócio de personal trainer.

Público: profissionais na casa dos 30 que já tentaram e desistiram de academia.
Sensação: calma e premium, nada de gritaria fitness.
Seções: hero, como funciona, resultados, preços, FAQ.

Regras de design: [cole aqui as regras do passo 1]`
      },
      {
        stepNumber: 4,
        title: 'O ciclo que realmente melhora o resultado',
        description: 'A primeira saída é rascunho. O valor está na segunda passada:\n\n1. O Claude constrói a página.\n2. Ele abre no navegador e tira print.\n3. Ele lê o próprio print contra a lista de vícios.\n4. Ele corrige o que falhou e reconstrói.\n\nPeça isso explicitamente — "abra, tire print e me diga o que está errado antes de me mostrar" — e o resultado é materialmente melhor que o de um prompt único. Prompt único é o motivo de a maioria dos sites de IA parecer inacabada.',
        copyableText: `Abra a página no navegador, tire um print e avalie o próprio resultado contra as regras de design.

Me diga o que falhou antes de me mostrar a página. Depois corrija e tire um novo print para comparar.`
      },
      {
        stepNumber: 5,
        title: 'Roube um design que você gosta',
        description: 'Aponte o Claude para uma URL e peça que ele extraia a linguagem de design: escala tipográfica, relação entre as cores, ritmo de espaçamento, padrões de componente. Depois aplique esse vocabulário na sua construção.\n\nVocê está levando o sistema, não os pixels.',
        copyableText: `Abra [URL do site de referência] e extraia a linguagem de design:

- Escala tipográfica (tamanhos e pesos usados)
- Relação entre as cores e onde cada uma aparece
- Ritmo de espaçamento entre seções e dentro delas
- Padrões de componente que se repetem

Depois aplique esse vocabulário no meu projeto. Não copie o conteúdo nem o layout — só o sistema.`
      },
      {
        stepNumber: 6,
        title: 'Confira no celular antes de terminar',
        description: 'A maior parte do tráfego é mobile e a maior parte do design gerado é pensado em desktop. Peça o print em largura de 375px e avalie de novo.\n\nÉ onde aparecem os problemas reais: título que quebra em quatro linhas, tabela que estoura, botão pequeno demais, texto de 11px que ninguém lê.'
      }
    ],
    troubleshooting: [
      'Continua parecendo genérico → você pulou o passo 2. Faça ele printar e se auto-avaliar; construção às cegas sempre regride para o visual padrão.',
      'Ele sobrescreveu sua folha de estilos → diga que o CSS global é somente-acréscimo. Substituir as diretivas de entrada de um framework tira o estilo do app inteiro.',
      'A página foi mudando de cara a cada edição → cores entraram inline. Mande travar a paleta de novo e referenciar só cores nomeadas.',
      'O print não bate com o que você vê → diferença de viewport. Peça explicitamente a verificação em largura mobile, não só desktop.'
    ],
    goDeeperLinks: [
      { label: 'Melhor forma de configurar o Claude Code', url: '#/recursos/best-way-to-set-up-claude-code' },
      { label: 'Documentação do Claude Code', url: 'https://code.claude.com/docs' }
    ]
  },
  {
    id: 'res-plugins-worth',
    slug: 'claude-code-plugins',
    title: 'Plugins do Claude Code que Realmente Valem a Pena',
    category: 'TOOLS AND SKILLS',
    description: 'Os plugins que realmente economizam seu tempo com os comandos reais de instalação — além dos dois que todos tentam instalar mas que já vêm nativos no Claude Code.',
    subtitle: 'Nenhum destes é meu. São trabalho de outras pessoas, todos gratuitos — esta página é a lista, o que cada um faz e o comando de instalação real, para você não caçar em README.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Plugins', 'Claude Code', 'Ferramentas de Dev'],
    whatYouWillDo: [
      'Parar de procurar plugin para duas funções que já são nativas.',
      'Instalar os quatro que valem, com o comando exato.',
      'Saber o que checar antes de rodar código de terceiro na sua máquina.'
    ],
    beforeYouStart: [
      'Claude Code instalado e atualizado.',
      'Um minuto para ler o repositório antes de instalar qualquer coisa.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Já vem embutido — pare de procurar por estes dois',
        description: 'Esta é a parte que mais gente erra, e eu errei também.\n\n`/code-review` — revisa o seu diff antes do commit. É só digitar.\n\n`/security-review` — mesma ideia, caçando vulnerabilidade em vez de bug.\n\nOs dois já vêm com o Claude Code. Não existe plugin para instalar.\n\nSe você quer a versão de segurança rodando em todo pull request em vez de sob demanda, aí sim é outra coisa: é a GitHub Action da Anthropic, em `github.com/anthropics/claude-code-security-review`. Você joga em `.github/workflows/` e ela comenta nos seus PRs automaticamente.'
      },
      {
        stepNumber: 2,
        title: 'Superpowers — se for instalar um só, é este',
        description: 'Um marketplace inteiro de skills para o Claude Code. O Jesse Vincent (obra) mantém e a comunidade contribui.\n\nMarketplace: `github.com/obra/superpowers-marketplace`\nRepositório de skills: `github.com/obra/superpowers-skills`',
        copyableText: `# De dentro do Claude Code:
/plugin marketplace add obra/superpowers-marketplace

# Depois, para navegar e escolher:
/plugin`
      },
      {
        stepNumber: 3,
        title: 'claude-mem — memória entre sessões',
        description: 'O Claude esquece tudo no segundo em que a sessão acaba. Este resolve: comprime o que aconteceu, guarda e traz de volta na próxima. Feito pelo Alex Newman (thedotmack).\n\nRepositório: `github.com/thedotmack/claude-mem`\n\nEle instala hooks e um worker em segundo plano — é instalação de verdade, não uma biblioteca parada.',
        copyableText: `npx claude-mem install`
      },
      {
        stepNumber: 4,
        title: 'gstack — 23 comandos com papéis de time',
        description: 'Do Garry Tan, o do YC. São 23 comandos baseados em papéis que agem como um time de engenharia inteiro: um CEO, um designer, um líder de QA, um gerente de engenharia. Você roda `/review`, `/qa`, `/ship` e cada um faz a sua parte.\n\nVale saber: não é plugin. Instala como skills, direto na sua pasta de skills.\n\nRepositório: `github.com/garrytan/gstack`',
        copyableText: `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`
      },
      {
        stepNumber: 5,
        title: 'Como instalar um plugin, na prática',
        description: 'Se você nunca fez, são dois comandos dentro do Claude Code. O primeiro aponta para um marketplace; o segundo abre o navegador de instalação. Nada vai para o seu projeto, nada para configurar.\n\nA Anthropic também mantém um diretório oficial que vale olhar antes de sair caçando em outro lugar.',
        copyableText: `/plugin marketplace add <dono/repositorio>
/plugin

# Diretório oficial da Anthropic:
/plugin marketplace add anthropics/claude-plugins-official`
      },
      {
        stepNumber: 6,
        title: 'Antes de instalar qualquer coisa',
        description: 'Estes são repositórios de outras pessoas. Um plugin ou skill é instrução que o seu agente segue, não só código parado. Alguns instalam hooks que rodam em toda sessão, alguns sobem worker em segundo plano.\n\nAbra o repositório e leia o que ele faz primeiro. Leva um minuto, e a máquina é sua.'
      }
    ],
    troubleshooting: [
      'Procurando plugin de code review ou security review → não existe. Os dois já são nativos: `/code-review` e `/security-review`.',
      'Conflito entre plugins → atualize o CLI primeiro; a maioria dos conflitos vem de versão antiga. Se persistir, desative um por vez para isolar.',
      'Instalado mas não aparece → reinicie a sessão. O carregamento acontece na inicialização.',
      'gstack não responde aos comandos → ele não é plugin, é skill. Confira se caiu em ~/.claude/skills/gstack e se o setup rodou.',
      'Sessões ficaram lentas depois das instalações → cada extensão custa contexto. Remova o que você não invocou no último mês.'
    ],
    goDeeperLinks: [
      { label: 'Superpowers Marketplace', url: 'https://github.com/obra/superpowers-marketplace' },
      { label: 'claude-code-security-review (GitHub Action)', url: 'https://github.com/anthropics/claude-code-security-review' },
      { label: '5 comandos secretos do Claude Code', url: '#/recursos/5-secret-claude-code-commands' }
    ]
  },
  {
    id: 'res-8',
    slug: '5-open-source-claude-tools',
    title: 'Ferramentas Open-Source do Claude que Valem a Pena',
    category: 'TOOLS AND SKILLS',
    description: 'Ferramentas de código aberto que se integram ao Claude e realmente valem seu tempo — roteamento de modelos, análise de vídeo, memória de longo prazo e mais de 220 agentes prontos.',
    subtitle: 'A melhor ferramentaria para o Claude hoje não vem da Anthropic. Está no GitHub, aberta, feita por gente que cansou de esperar.',
    estimatedReadTime: '11 min de leitura',
    difficulty: 'Beginner',
    updatedDate: 'Agosto de 2026',
    tags: ['Open Source', 'GitHub', 'MCP', 'Ferramentas de Dev'],
    whatYouWillDo: [
      'Parar de queimar crédito de API no que não precisa de modelo de ponta.',
      'Deixar o Claude assistir a um vídeo em vez de só ler a legenda.',
      'Dar ao Claude memória que sobrevive ao fim da conversa.',
      'Puxar mais de 220 agentes especialistas prontos em vez de escrever do zero.'
    ],
    beforeYouStart: [
      'Claude Code instalado.',
      'Noção básica de terminal — quase tudo se instala por linha de comando.',
      'Disposição para ler o código antes de instalar. É o sentido do código aberto.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'OmniRoute — roteamento entre provedores',
        description: 'Repositório: `github.com/diegosouzapw/OmniRoute`\n\nUm endpoint, mais de 268 provedores, mais de 500 modelos. Claude, GPT, Gemini, DeepSeek, tudo. Cerca de 50 desses provedores têm camada gratuita.\n\nPor que importa: ele conhece as cotas. Quando você bate o limite em um provedor, ele cai para o próximo em vez de morrer no meio da tarefa. Também comprime o contexto, o que reduz uso de token entre 15% e 95% dependendo do que você está fazendo.\n\nFunciona com Claude Code, Codex, Cursor, Cline e Copilot. Licença MIT.'
      },
      {
        stepNumber: 2,
        title: 'claude-video — dá olhos para o Claude',
        description: 'Repositório: `github.com/bradautomates/claude-video`\n\nVocê roda `/watch` com um link de vídeo e ele baixa, extrai os frames, transcreve o áudio e entrega tudo — então o Claude está de fato olhando o vídeo, não lendo uma transcrição.\n\nOnde ganha o lugar dele: pesquisa de concorrente. Aponte para um reels que está te batendo e pergunte por que funcionou. Você recebe o gancho, o ritmo e a estrutura em vez de chutar.\n\nSuporta YouTube, TikTok, Vimeo e arquivos locais. Instagram não está na lista — teste antes de montar fluxo em cima. Precisa de yt-dlp e ffmpeg instalados.\n\nAviso: o yt-dlp quebra constantemente quando as plataformas mudam algo. Se parar de baixar, atualize o yt-dlp antes de achar que a ferramenta quebrou.'
      },
      {
        stepNumber: 3,
        title: 'Scroll World — site 3D com rolagem',
        description: 'Repositório: `github.com/oso95/scroll-world`\n\nEste é um skill do Claude, não um aplicativo. Transforma uma marca em um mundo 3D navegável por rolagem — aquele site cinematográfico de lançamento de produto.\n\nInstale como skill, aponte para uma marca e ele constrói. Se você atende cliente, isso é um entregável pelo qual as pessoas pagam de verdade.'
      },
      {
        stepNumber: 4,
        title: 'voicebox — estúdio de voz local',
        description: 'Repositório: `github.com/jamiepine/voicebox`\n\nClona voz, gera fala, faz ditado. Roda na sua máquina, então nada sobe para lugar nenhum. É a alternativa ao ElevenLabs para quem não quer assinatura nem a própria voz no servidor de terceiro.\n\n**Cuidado aqui.** Busque "voicebox" no GitHub e o primeiro resultado muitas vezes não é este. Existem repositórios cópia com o mesmo nome, feitos por contas de poucos dias, alguns entregando um `Setup.exe`. O verdadeiro é `jamiepine/voicebox` — confira o nome do dono antes de baixar qualquer coisa.'
      },
      {
        stepNumber: 5,
        title: 'cognee — memória para agentes',
        description: 'Repositório: `github.com/topoteretes/cognee`\n\nMemória de código aberto para agentes de IA. Grafo de conhecimento auto-hospedado que dá memória de longo prazo entre sessões, para os agentes pararem de esquecer tudo quando a conversa acaba.\n\nSe você construiu um agente que funciona ótimo em uma conversa e depois tem amnésia, esta é a peça que falta.'
      },
      {
        stepNumber: 6,
        title: 'agency-agents — mais de 220 agentes prontos',
        description: 'Repositório: `github.com/msitarzewski/agency-agents`\n\nMais de 220 personalidades de agente especializadas para o Claude Code. Especialistas em frontend, gestores de comunidade, verificadores de realidade — cada um com processo próprio e entregáveis definidos.\n\nÉ o jeito mais fácil de ver como é um agente bem construído antes de escrever o seu.'
      },
      {
        stepNumber: 7,
        title: 'Como não se queimar instalando isso',
        description: 'Código aberto é ótimo até alguém copiar o nome de um projeto popular e distribuir malware embaixo dele. Isso aconteceu enquanto esta lista era montada.\n\nAs checagens rápidas antes de instalar qualquer coisa:',
        copyableText: `1. Confira o DONO, não o nome do repositório.
   jamiepine/voicebox e ContaAleatoria/Voicebox-2026 não são o mesmo projeto.

2. Olhe a idade da conta.
   Repositório criado há três dias por conta sem mais nada? Pule.

3. Nunca rode um .exe de um repositório do GitHub.
   Projeto aberto de verdade entrega código-fonte e um passo de build,
   não um instalador misterioso.

4. Confira a data do último push.
   Projeto ativo recebe push o tempo todo. Projeto morto está parado há um ano.

5. Leia os arquivos.
   Você está no GitHub. Clique no código. Se você não consegue dizer o que
   ele faz, não instale.`
      }
    ],
    troubleshooting: [
      'O servidor MCP não inicia → quase sempre é variável de ambiente faltando. Rode a listagem de MCPs e leia o erro completo.',
      'claude-video parou de baixar → atualize o yt-dlp antes de qualquer outra coisa. Ele quebra sempre que uma plataforma muda algo.',
      'Encontrou dois repositórios com o mesmo nome → compare o dono e a idade da conta. Nome se copia; histórico não.',
      'Instalou vários e tudo ficou lento → cada servidor adiciona definições ao contexto. Remova os que não usa.',
      'Não sabe se um repositório é confiável → se você não consegue explicar o que ele acessa e por quê, a resposta é não instalar.'
    ],
    goDeeperLinks: [
      { label: '5 comandos secretos do Claude Code', url: '#/recursos/5-secret-claude-code-commands' },
      { label: 'Plugins que realmente valem a pena', url: '#/recursos/claude-code-plugins' }
    ]
  }
];
