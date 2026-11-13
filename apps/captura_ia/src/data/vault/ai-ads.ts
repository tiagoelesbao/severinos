import { Resource } from '../../types';

export const AI_ADS_RESOURCES: Resource[] = [
  {
    id: 'res-video-higgsfield',
    slug: 'claude-higgsfield-video-ads',
    title: 'Crie Anúncios em Vídeo com Claude + Higgsfield',
    category: 'AI ADS',
    description: 'Conecte o Higgsfield ao Claude com uma única URL e gere anúncios em vídeo e imagem a partir de prompts — incluindo suporte a Veo, Kling e Seedance.',
    subtitle: 'O Claude é o melhor modelo de raciocínio do planeta e não conseguia fazer um único vídeo. Um conector resolve isso — e ele passa a dirigir Veo, Kling, Seedance e mais uma dúzia de modelos sem você sair do chat.',
    estimatedReadTime: '10 min de leitura',
    difficulty: 'Advanced',
    updatedDate: 'Agosto de 2026',
    tags: ['Higgsfield', 'Vídeo IA', 'Claude MCP', 'Tráfego Pago'],
    promptText: `https://mcp.higgsfield.ai/mcp

Cole essa URL em Configurações → Conectores → Adicionar conector personalizado.
Nome: Higgsfield. Depois entre com sua conta quando ele pedir.

Teste se funcionou perguntando:
"quais modelos de vídeo eu tenho no Higgsfield?"`,
    whatYouWillDo: [
      'Gerar anúncios em vídeo a partir de um prompt, no mesmo chat onde você escreveu o briefing.',
      'Entregar uma página de produto e receber de volta um conjunto de anúncios prontos, construídos a partir dela.',
      'Apontar para o anúncio de um concorrente e ter a mesma estrutura reconstruída para o seu produto.'
    ],
    beforeYouStart: [
      'Conta paga do Claude. Conectores personalizados não existem no plano gratuito.',
      'Conta no Higgsfield. Cada geração gasta crédito, então confira o saldo antes de rodar um lote — higgsfield.ai.',
      'Uma foto limpa do produto, ou a URL da página do produto. A URL é mais fácil: o Claude puxa as imagens e o texto sozinho.',
      'Faça esta parte no computador.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Conecte o Higgsfield ao Claude',
        description: 'Dentro do Claude: Configurações → Conectores → + Adicionar conector personalizado. No campo de nome escreva Higgsfield. No campo de URL cole exatamente `https://mcp.higgsfield.ai/mcp`, nada depois disso. Clique em Conectar e entre com sua conta do Higgsfield.\n\nVocê sabe que funcionou quando conseguir perguntar "quais modelos de vídeo eu tenho no Higgsfield?" e ele listar de volta sem você fazer mais nada.'
      },
      {
        stepNumber: 2,
        title: 'Sua primeira geração',
        description: 'Não complique. Escreva de forma direta e deixe o Claude escolher o modelo e rodar. Ele devolve o vídeo no chat. É o ciclo inteiro.',
        copyableText: `Gere um vídeo vertical de 5 segundos de um copo de café gelado
sobre uma bancada de cozinha, luz da manhã, aproximação lenta.
Use o Seedance 2.0.`
      },
      {
        stepNumber: 3,
        title: 'O fluxo que realmente dá dinheiro',
        description: 'Anúncios. Entregue uma página de produto e deixe ele trabalhar.\n\nEle raspa a página, puxa as fotos reais do produto e gera o conjunto. A embalagem fica consistente nas cinco peças porque ele está trabalhando com as imagens reais, não adivinhando.',
        copyableText: `Aqui está o produto: [cole a URL do produto]

Busque a página e me faça 5 anúncios em imagem no formato 4:5,
cada um em um ângulo diferente — transformação, problema-solução,
prova, identidade e comparação. Coloque a headline na imagem.`
      },
      {
        stepNumber: 4,
        title: 'Dois recursos que valem conhecer',
        description: '**Marketing Studio** é o modelo de anúncio em um clique. Ele recebe um produto, um avatar opcional e um formato — UGC, unboxing, tutorial ou vitrine de produto.\n\n**Referências de anúncio** deixam você entregar um anúncio existente e dizer "reconstrua isso para o meu produto". Ele segue a composição de cena, o ritmo e o gancho do original em vez de inventar uma estrutura. É a jogada inteira de anúncio-espelho em um prompt só.'
      },
      {
        stepNumber: 5,
        title: 'Entenda o que gasta crédito',
        description: 'Gerações consomem crédito e o valor varia por modelo e duração. Como referência: um vídeo de 15 segundos em 720p no Marketing Studio gira em torno de 75 créditos; uma imagem do Marketing Studio, cerca de 2.\n\nQuando houver promoção de geração ilimitada, duas coisas costumam pegar as pessoas: ela não é automática — você precisa resgatar, e até resgatar tudo cobra normalmente. E o relógio começa no resgate, não no primeiro uso. Promoções assim também costumam cobrir só uma lista de modelos; fora dela, continua gastando crédito.'
      },
      {
        stepNumber: 6,
        title: 'Teste com método',
        description: 'Suba pelo menos 3 variações do mesmo conceito com ganchos diferentes, mudando uma coisa por vez. Vídeo gerado por IA é barato de produzir e isso muda a matemática do teste: você pode testar cinco ganchos pelo custo do que antes era um.\n\nPara criativo, a métrica que decide não é o clique — é a retenção nos primeiros 3 segundos.'
      }
    ],
    troubleshooting: [
      'O conector não conecta → confira se a URL é exatamente https://mcp.higgsfield.ai/mcp, sem nada depois, e se você está logado no Higgsfield no mesmo navegador.',
      'O Claude diz que não encontra as ferramentas do Higgsfield → comece uma conversa nova. Conectores nem sempre se anexam a uma conversa que já estava aberta quando você os adicionou.',
      'Acabaram os créditos → recarregue, ou troque o pedido para um modelo coberto pela sua franquia.',
      'O produto saiu errado → entregue a URL da página em vez de descrever o produto. Ele trabalha com as fotos reais e para de adivinhar.',
      'O vídeo veio sem áudio → a maioria dos modelos tem um parâmetro de som. Peça explicitamente para ligar.'
    ],
    goDeeperLinks: [
      { label: 'Higgsfield', url: 'https://higgsfield.ai' },
      { label: 'Crie anúncios UGC com Claude + Arcads', url: '#/recursos/claude-arcads-ugc-ads' }
    ]
  },
  {
    id: 'res-ugc-arcads',
    slug: 'claude-arcads-ugc-ads',
    title: 'Crie Anúncios UGC com Claude + Arcads',
    category: 'AI ADS',
    description: 'Conecte o Arcads ao Claude e gere anúncios estilo UGC completos — ator ultra-realista, voz natural e seu produto — com um único prompt.',
    subtitle: 'O Arcads agora tem MCP, então o Claude gera um anúncio pronto — ator realista, voz real, seu produto na mão dele — a partir de um prompt no chat onde você já está trabalhando.',
    estimatedReadTime: '9 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['Arcads', 'UGC Ads', 'TikTok Ads', 'Vídeo IA'],
    promptText: `https://mcp.arcads.ai

Configurações → Conectores → + Adicionar conector personalizado.
Nome: Arcads. Cole a URL exatamente assim, sem nada depois.

Teste perguntando: "quais atores estão disponíveis no Arcads?"`,
    whatYouWillDo: [
      'Gerar um anúncio UGC pronto sem câmera, sem ator e sem editor.',
      'Escolher o ator descrevendo quem você quer em vez de rolar uma grade de rostos.',
      'Manter o briefing e o anúncio pronto no mesmo lugar, porque os dois vivem no Claude.'
    ],
    beforeYouStart: [
      'Conta paga do Claude. Conectores personalizados não existem no plano gratuito.',
      'Conta no Arcads com créditos. Cada geração gasta crédito real, então confira o saldo antes de sair experimentando — arcads.ai.',
      'Uma foto limpa do produto. É ela que o ator acaba segurando, então use foto real, não mockup.',
      'Isso acontece no computador.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Conecte o Arcads ao Claude',
        description: 'Dentro do Claude: Configurações → Conectores → + Adicionar conector personalizado. Nome: Arcads. URL: `https://mcp.arcads.ai`, exatamente assim. Clique em Conectar e entre com sua conta.\n\nFuncionou quando você conseguir perguntar "quais atores estão disponíveis no Arcads?" e ele responder sem mais nenhum passo.'
      },
      {
        stepNumber: 2,
        title: 'Descreva o anúncio que você quer',
        description: 'Três coisas entram no prompt: o tipo de anúncio, o ator e a foto do produto. Arraste a foto direto para o chat e escreva de forma simples.\n\nO Claude repassa para o Arcads, escolhe o ator, gera a voz e devolve o vídeo pronto no chat.',
        copyableText: `Faça um anúncio UGC para este produto.

Ator: mulher perto dos 30, estilo casual, gravando em selfie na cozinha.
Entrega: falando direto para a câmera, como quem recomenda para uma amiga. Nada de tom de vendedora.
Duração: cerca de 20 segundos.
Gancho: abra no problema, não no produto.`
      },
      {
        stepNumber: 3,
        title: 'Faça não parecer IA',
        description: 'Esta é a parte que decide se você rodaria o anúncio de verdade.\n\n**Dê idade e vibe ao ator, não só gênero.** "Perto dos 30, casual" vence "uma mulher" toda vez.\n\n**Coloque em um lugar específico.** Uma cozinha, um carro, o espelho do banheiro. Fundo neutro parece banco de imagens.\n\n**Fique abaixo de 30 segundos.** Geração mais longa tem mais frames que podem sair errados.\n\n**Abra no problema.** O gancho faz mais pela performance do que o ator.\n\n**Regenere em vez de aceitar.** A primeira saída raramente é a que vale rodar.'
      },
      {
        stepNumber: 4,
        title: 'Monte o corte final',
        description: 'O vídeo do ator é a base. Faltam duas camadas.\n\nLegendas queimadas — a maioria assiste sem som, com destaque na palavra-chave de cada frase.\n\nInserção do produto — corte para a imagem ou clipe nos pontos certos. Sem isso, o anúncio é uma pessoa falando; com isso, é uma demonstração.'
      },
      {
        stepNumber: 5,
        title: 'Cuide do crédito antes do lote',
        description: 'Gerações gastam crédito do Arcads e o valor escala com duração e modelo. Confira o saldo no painel antes de rodar em lote — se você pedir dez variações ao Claude, ele faz as dez alegremente e gasta por todas.'
      }
    ],
    troubleshooting: [
      'O conector não conecta → confira se a URL é exatamente https://mcp.arcads.ai, sem nada depois, e se você está logado no Arcads no mesmo navegador.',
      'O Claude diz que não encontra as ferramentas do Arcads → comece uma conversa nova. Conectores nem sempre se anexam a conversas já abertas.',
      'O ator ficou estranho → você foi vago. Acrescente idade, cenário e estilo de entrega, e regenere.',
      'Acabou o crédito no meio da geração → o trabalho falha e o crédito já gasto no parcial em geral não volta. Confira o saldo antes.',
      'O vídeo voltou sem o produto → a foto não anexou. Arraste de novo e confirme que você vê a miniatura no compositor antes de enviar.'
    ],
    goDeeperLinks: [
      { label: 'Arcads', url: 'https://arcads.ai' },
      { label: 'Crie anúncios em vídeo com Higgsfield', url: '#/recursos/claude-higgsfield-video-ads' }
    ]
  },
  {
    id: 'res-20',
    slug: 'spy-on-competitor-meta-ads',
    title: 'Espione os Anúncios no Meta dos Seus Concorrentes',
    category: 'AI ADS',
    description: 'Puxe todos os anúncios que seus concorrentes rodam no Meta diretamente para o seu Airtable — texto, página de destino e há quanto tempo cada um está ativo.',
    subtitle: 'Ninguém mantém anúncio perdedor no ar. Então os anúncios que seu concorrente tem rodando há dois meses seguidos são os que dão dinheiro — e você pode ler todos.',
    estimatedReadTime: '9 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['Biblioteca de Anúncios Meta', 'Scraping', 'Inteligência Competitiva', 'Airtable'],
    whatYouWillDo: [
      'Puxar todo anúncio ativo de cada concorrente que você acompanha para uma tabela só.',
      'Ver o texto, a headline, a página de destino e há quantos dias cada anúncio está rodando.',
      'Ordenar por dias no ar para achar os vencedores e reconstruí-los para o seu produto.'
    ],
    beforeYouStart: [
      'Claude Code instalado.',
      'Conta no Apify — gratuita, com US$ 5 de crédito por mês. Uma rodada com 15 concorrentes custa cerca de US$ 1,13, então o crédito gratuito cobre.',
      'Conta no Airtable — o plano gratuito serve.',
      'Isso é no computador.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Conecte Apify e Airtable ao Claude',
        description: '**Apify** — entre em apify.com → seu avatar → Settings → API & Integrations, copie o Personal API token e adicione o Apify ao Claude Code (ou coloque o token no .env como APIFY_TOKEN).\n\n**Airtable** — vá em airtable.com/create/tokens, crie um token com os escopos `data.records:read`, `data.records:write` e `schema.bases:read`, dê acesso a uma base e conecte ao Claude.\n\nPule o `schema.bases:read` e a configuração falha. É o que todo mundo esquece.'
      },
      {
        stepNumber: 2,
        title: 'Mande o Claude construir as tabelas',
        description: 'Crie uma base vazia no Airtable, copie o ID dela da barra de endereço (a parte que começa com `app`) e peça a construção. Ele monta as duas tabelas e liga os registros.',
        copyableText: `Construa uma base de anúncios de concorrentes aqui: [COLE O ID DA BASE].

Duas tabelas:
- Concorrentes: Nome, ID da Página na Biblioteca de Anúncios, Status
- Anúncios: vinculada a Concorrente, texto do anúncio, headline,
  URL de destino, data da primeira vez visto, e uma fórmula
  "Dias Rodando" (hoje menos a data da primeira vez visto).`
      },
      {
        stepNumber: 3,
        title: 'Adicione os concorrentes',
        description: 'Você precisa do ID da página na Biblioteca de Anúncios de cada concorrente — não o ID do perfil no Facebook.\n\nPegue em facebook.com/ads/library: busque a marca, abra os anúncios dela e copie o número que aparece depois de `view_all_page_id=` na barra de endereço. Jogue esse número e o nome na tabela Concorrentes, com Status Ativo.\n\nOu deixe o Claude encontrar:',
        copyableText: `Encontre 15 concorrentes no meu nicho rodando anúncios no Meta —
aqui está minha oferta para você saber o que procurar: [SEU SITE].

Pegue o ID da página deles na Biblioteca de Anúncios e adicione
na minha tabela Concorrentes.`
      },
      {
        stepNumber: 4,
        title: 'Raspe os anúncios',
        description: 'O actor público que faz a coleta é o `curious_coder/facebook-ads-library-scraper` no Apify.\n\nO `count: 100` é a parte importante. O actor cobra US$ 0,00075 por anúncio e vai raspar milhares se você não limitar. Cem por concorrente é bastante e mantém uma rodada de 15 perto de US$ 1,13.',
        copyableText: `Para cada concorrente ativo, rode o actor do Apify
curious_coder/facebook-ads-library-scraper na URL da Biblioteca
de Anúncios dele com count: 100, e salve cada anúncio na minha
tabela Anúncios com as imagens de prévia.`
      },
      {
        stepNumber: 5,
        title: 'Leia a tabela — a parte que as pessoas pulam',
        description: 'Ordene por Dias Rodando, decrescente. Os anúncios no topo sobreviveram mais tempo — eles estão se pagando. Essa é a sua lista curta.\n\nIgnore quão criativo um anúncio parece; olhe há quanto tempo está vivo.\n\nDepois leia na horizontal: o que o texto diz, o que a headline promete, para onde o clique vai. Isso é a oferta, o gancho e o funil, entregues de bandeja.'
      },
      {
        stepNumber: 6,
        title: 'Reconstrua um vencedor',
        description: 'Estrutura comprovada, sua oferta dentro.\n\nO que se aproveita é a estrutura — tipo de gancho, promessa, formato, destino do tráfego. Você não conhece a oferta, o público nem o preço por trás do anúncio dele; copiar a peça inteira é reproduzir a casca.',
        copyableText: `Pegue este anúncio e reconstrua para o meu produto.
Mesma estrutura, mesmo tipo de gancho, minha marca nele.`
      }
    ],
    troubleshooting: [
      '"Nenhum anúncio encontrado" para uma marca que você sabe que anuncia → você usou o ID do perfil, não o da página na Biblioteca de Anúncios. É o número depois de view_all_page_id=.',
      'Custou muito mais que um dólar → o actor rodou sem limite. Sempre passe count: 100.',
      'O Airtable reclama de campo faltando → suas tabelas não batem. Peça ao Claude para reconstruir (passo 2).',
      'Uma marca aparece com zero anúncios → pode genuinamente não ter nada no ar naquele país agora.',
      'A configuração do Airtable falha sem erro claro → falta o escopo schema.bases:read no token.'
    ],
    goDeeperLinks: [
      { label: 'Biblioteca de Anúncios do Meta', url: 'https://www.facebook.com/ads/library' },
      { label: 'Conecte o Claude à sua conta de anúncios', url: '#/recursos/connect-claude-to-your-ad-account' }
    ]
  },
  {
    id: 'res-3',
    slug: 'connect-claude-to-your-ad-account',
    title: 'Conecte o Claude à Sua Conta de Anúncios',
    category: 'AI ADS',
    description: 'A configuração completa de 10 minutos para conectar o Claude Code à sua conta de anúncios no Meta para analisar campanhas e otimizar anúncios pelo chat.',
    subtitle: 'No fim disso o Claude Code puxa suas campanhas e otimiza seus anúncios direto do chat. Cerca de 10 minutos.',
    estimatedReadTime: '10 min de leitura',
    difficulty: 'Advanced',
    updatedDate: 'Agosto de 2026',
    isFeatured: true,
    tags: ['Anúncios Meta', 'Google Ads', 'Claude MCP', 'ROAS', 'Tráfego Pago'],
    whatYouWillDo: [
      'Conectar o Claude Code direto à sua conta de anúncios no Meta.',
      'Puxar campanhas, gasto, ROAS e CPA sem abrir o Gerenciador.',
      'Pausar os fracos e escalar os campeões digitando o que você quer.'
    ],
    beforeYouStart: [
      'Uma conta do Facebook que seja dona (ou tenha acesso) da sua conta de anúncios.',
      'Claude Code instalado e rodando.',
      'Um token de acesso é a chave da sua conta de anúncios. Nunca cole em lugar público.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Crie um app de desenvolvedor no Meta',
        description: 'Vá em developers.facebook.com e entre com a conta do Facebook que é dona da sua conta de anúncios. Clique em Meus Apps → Criar App.\n\nEm "o que você quer que seu app faça", escolha Outro, depois o tipo Empresa e siga. Dê um nome qualquer (por exemplo, "Claude Ads"), coloque seu e-mail e clique em Criar app. Você cai no Painel do app.'
      },
      {
        stepNumber: 2,
        title: 'Ative a Marketing API',
        description: 'No Painel, encontre a Marketing API na lista de produtos e clique em Configurar. É isso que dá ao seu app acesso aos dados de anúncio.'
      },
      {
        stepNumber: 3,
        title: 'Gere um token de acesso',
        description: 'Vá em Ferramentas → Graph API Explorer no menu superior. No painel da direita, selecione o seu app no menu suspenso. Clique em Adicionar Permissões e marque as três abaixo.\n\nClique em Gerar Token de Acesso, aprove o pop-up e copie o token. Atenção: esse expira em cerca de uma hora — o passo 6 torna permanente.',
        copyableText: `ads_read
ads_management
business_management`
      },
      {
        stepNumber: 4,
        title: 'Pegue o ID da conta de anúncios',
        description: 'Abra o Gerenciador de Anúncios do Meta. O ID da conta é o número ao lado do nome dela (também em Configurações do Negócio → Contas → Contas de Anúncios).\n\nPara a API você usa com o prefixo `act_` — por exemplo, `act_1234567890`.'
      },
      {
        stepNumber: 5,
        title: 'Conecte o Claude Code',
        description: 'Abra o Claude Code e cole o bloco abaixo, preenchendo o token e o ID. Ele monta as chamadas de API e reporta de volta. Se listar suas campanhas, você está conectado.',
        copyableText: `Quero que você gerencie meus anúncios do Meta.
Use a Marketing API (Graph API) com este token de acesso: <TOKEN>
e esta conta de anúncios: act_<SEU_ID>.

Configure e depois confirme que funciona listando minhas
campanhas ativas com o gasto de cada uma.`
      },
      {
        stepNumber: 6,
        title: 'Torne o token permanente',
        description: 'O token do Graph Explorer é de vida curta e morre em cerca de uma hora. Dois jeitos de resolver.\n\n**Fácil** — peça ao Claude Code para trocar por um token de longa duração (cerca de 60 dias) usando o App ID e o App Secret em Configurações → Básico.\n\n**Melhor** — em Configurações do Negócio, vá em Usuários do Sistema, crie um, atribua sua conta de anúncios e gere um token que nunca expira. Entregue esse ao Claude.'
      },
      {
        stepNumber: 7,
        title: 'Comece por leitura, depois otimize',
        description: 'Conectado. Comece com perguntas de diagnóstico por algumas semanas antes de deixar ele alterar qualquer coisa — você vai descobrir onde ele acerta e onde interpreta errado o seu contexto de negócio.',
        copyableText: `Liste minhas campanhas com gasto, ROAS e CPA dos últimos 7 dias.

Quais 3 criativos têm o melhor ROAS nesta semana?

Pause todo conjunto de anúncios com CPA acima de R$ 200.

Aumente em 20% o orçamento da campanha com melhor desempenho.`
      }
    ],
    troubleshooting: [
      '"(#200) Permissions error" → falta o escopo ads_management. Refaça o passo 3 e adicione.',
      '"Unsupported get request / invalid account" → confira o ID da conta e se ele tem o prefixo act_.',
      '"Session/token expired" → seu token venceu. Use o de longa duração ou o de usuário do sistema, do passo 6.',
      'O app ficou preso em modo Desenvolvimento → tudo bem, ele continua funcionando na sua própria conta de anúncios.',
      'Os números não batem com o Gerenciador → quase sempre é janela de atribuição ou fuso. Peça que ele declare a janela usada em toda análise.'
    ],
    goDeeperLinks: [
      { label: 'O MCP oficial de anúncios do Meta', url: '#/recursos/meta-just-dropped-an-ads-mcp' },
      { label: 'Espione os anúncios dos concorrentes', url: '#/recursos/spy-on-competitor-meta-ads' }
    ]
  },
  {
    id: 'res-9',
    slug: 'meta-just-dropped-an-ads-mcp',
    title: 'O Meta Lançou um MCP Oficial de Anúncios',
    category: 'AI ADS',
    description: 'Conecte o Claude Code à sua conta de anúncios e lance campanhas completas com testes A/B a partir de um único prompt. Passo a passo + configuração.',
    subtitle: 'O Meta lançou um MCP oficial de anúncios — um conector que pluga sua conta direto no Claude Code. Sem ficar clicando no Gerenciador.',
    estimatedReadTime: '8 min de leitura',
    difficulty: 'Intermediate',
    updatedDate: 'Agosto de 2026',
    tags: ['Anúncios Meta', 'MCP', 'Claude', 'Marketing IA'],
    promptText: `https://mcp.facebook.com/ads

No Claude Code, adicione um conector personalizado, cole essa URL,
nomeie como "Meta Ads" e confirme. Ele conduz o OAuth na sua conta.`,
    whatYouWillDo: [
      'Perguntar ao Claude Code como seus anúncios estão performando e receber números reais.',
      'Criar, editar e gerenciar campanhas a partir de um prompt.',
      'Montar um ciclo de otimização — o Claude lê o que está ganhando e diz onde escalar.'
    ],
    beforeYouStart: [
      'Claude Code instalado e logado.',
      'Uma conta Meta Business com uma conta de anúncios onde você é administrador.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Pegue a URL do conector',
        description: 'Este é o conector MCP oficial do Meta — a peça que pluga o Meta no Claude Code. A URL é `https://mcp.facebook.com/ads`.\n\nA diferença em relação ao caminho manual pela Graph API é grande: aqui as operações vêm descritas e tipadas, então o Claude sabe quais campos existem e o que cada chamada devolve. Some as duas falhas mais comuns — inventar um campo e interpretar errado a resposta.'
      },
      {
        stepNumber: 2,
        title: 'Adicione ao Claude Code',
        description: 'No Claude Code, adicione um conector personalizado, cole a URL, nomeie como "Meta Ads" e confirme.'
      },
      {
        stepNumber: 3,
        title: 'Autorize',
        description: 'Ele conduz o OAuth na sua conta de anúncios do Meta. Aprove as permissões para o Claude conseguir ler e gerenciar seus anúncios.'
      },
      {
        stepNumber: 4,
        title: 'Coloque para trabalhar — leitura primeiro',
        description: 'Agora é só pedir. Comece somente com leitura até confiar, depois deixe construir.',
        copyableText: `Puxe os últimos 7 dias de desempenho da minha conta de anúncios.

Analise e me diga como um gestor de tráfego sênior:
1. Qual campanha está queimando orçamento sem retorno? Mostre os números.
2. Qual merece mais verba e por quê?
3. Algum criativo com sinal de fadiga — frequência subindo e CTR caindo?

Cite os números de onde tirou cada conclusão. Se o dado for
insuficiente, diga isso em vez de inferir.`
      },
      {
        stepNumber: 5,
        title: 'Quando for criar, crie pausado',
        description: 'Nunca deixe uma campanha ser criada e ativada no mesmo comando. A revisão manual entre criar e ativar é a única proteção real contra um orçamento digitado com um zero a mais.\n\nCheque três coisas no Gerenciador antes de ativar: o valor do orçamento, o público selecionado e o evento de conversão.',
        copyableText: `Crie uma campanha de teste PAUSADA com três variações de anúncio:

OBJETIVO: conversão — evento [nome]
ORÇAMENTO: R$ [valor]/dia
PÚBLICO: [nome do público salvo]
CRIATIVOS: mesmo vídeo, 3 ganchos de texto diferentes: [A], [B], [C]
DESTINO: [URL]

Estrutura: 1 campanha, 1 conjunto, 3 anúncios.
Deixe tudo PAUSADO. Eu ativo manualmente.
Antes de criar, me mostre a estrutura completa para aprovação.`
      },
      {
        stepNumber: 6,
        title: 'Escale em degraus',
        description: 'Ganhou o teste? Não triplique o orçamento no dia seguinte. Aumentos abruptos jogam a campanha de volta na fase de aprendizado.\n\nO padrão que funciona: até 20% ao dia, observando se o CPA se mantém. Quando o CPA começar a subir junto com o orçamento, você achou o teto daquele público — o próximo movimento é criativo novo ou público novo, não mais verba.'
      }
    ],
    troubleshooting: [
      '"Not an approved user/app" → o conector é restrito; confirme que sua conta Meta tem acesso.',
      'O OAuth falha → você não é administrador da conta de anúncios, ou a conta Business selecionada está errada. Ajuste a atribuição em Configurações do Negócio.',
      'Ele não enxerga sua conta → confirme que a conta de anúncios está atribuída ao seu usuário em Configurações do Negócio.',
      'A campanha foi criada ativa → repita a regra "criar sempre pausado" nas instruções do projeto, não só no prompt da vez.',
      'O evento de conversão está errado → confira no Gerenciador de Eventos. Nenhuma otimização funciona com evento errado.'
    ],
    goDeeperLinks: [
      { label: 'Conecte o Claude à sua conta de anúncios', url: '#/recursos/connect-claude-to-your-ad-account' },
      { label: 'Espione os anúncios dos concorrentes', url: '#/recursos/spy-on-competitor-meta-ads' }
    ]
  }
];
