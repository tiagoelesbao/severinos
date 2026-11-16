
# Guia de Setup — Campanhas 2, 3 e 4 (Império Prêmios) — patamar R$2.000/dia

**Para quem executa:** este guia é pra criar no Ads Manager, campo a campo, as 3 campanhas que ainda não existem. A Campanha 1 (Advantage+) já existe e não precisa de nada aqui — só é citada como referência de conta/pixel. Nenhuma campanha foi criada por mim neste documento — é execução com dinheiro real, fica pra quem opera a conta revisar e ativar (mesmo princípio do `campaign-plan-wave1.md` §8).

**Fundamentação:** `campaign-plan-wave2.md` (estrutura e orçamento), `campaign-plan-wave1.md` (specs originais das campanhas 2/3, ainda válidas), `copy-angles-2026-10-09.md` (copy pronta), `utm-convention.md` (parâmetros), `funil-conversao.md` (audiências), changelog do card ClickUp "Império Prêmios — Kickoff Meta Ads" (lição de contaminação por cliente existente, 2026-10-07).

---

## ⚠️ AUDITORIA 2026-10-10 — LEIA ANTES DE EXECUTAR

Este guia foi escrito em 09/10. Auditado em 10/10 contra os assets reais e os achados do dia. **Campanha 2 está pronta pra subir. Campanhas 3 e 4 estão bloqueadas** pelos motivos abaixo.

| # | Bloqueio | Afeta | Gravidade |
|---|---|---|---|
| **B1** | As 3 listas de cliente estão cadastradas em *Configurações de Publicidade > Clientes Existentes* — isso é **classificação de conta**, que alimenta o Existing Customer Budget Cap e as Regras de Valor. **Não é a mesma coisa que Custom Audience selecionável** em segmentação/exclusão de conjunto. O próprio `gates-status.yaml` já registrava essa dúvida sem nunca ter sido confirmada. | C3 (exclusão) e C4 (segmentação inteira) | **Bloqueante** |
| **B2** | **Campanha 3 não tem criativo.** O ângulo Prova depende de depoimento/imagem de ganhador — direito de imagem está liberado, mas o material nunca foi selecionado nem produzido. Não há nenhum asset de Prova em `creatives/`. | C3 | **Bloqueante** |
| **B3** | **Campanha 4 não tem criativo utilizável.** Os únicos assets de Acessibilidade (`acessibilidade_apenas-7reais/8reais_*.mov`) estão em `campanha-1-advantage-vendas/` — a leva **reprovada pela Meta** em 06/10, que o `gates-status.yaml` manda explicitamente não reutilizar. Além disso citam preço ("apenas 7 reais"), promessa que a copy atual já abandonou. | C4 | **Bloqueante** |
| **B4** | A audiência de exclusão "Clientes Ativos Recentes" (pré-requisito da seção 1) **continua não existindo**. | C2 e C3 | Alto |

**Risco estratégico adicional na Campanha 3 (não é bloqueio, é alerta):** a base real tem apenas **2.045 clientes únicos em 90 dias** (medido 10/10) e o Pixel cobre 5 domínios, incluindo o site de sorteios. Uma audiência "visitantes do site 30 dias" será **dominada por quem já compra** — é exatamente a armadilha de 07/10, onde o agregado mostrava ROAS ~7x enquanto a prospecção real estava em 0,47x. **Sem B1 e B4 resolvidos, a Campanha 3 paga para alcançar cliente que já compraria sozinho.**

**Números atualizados em 10/10** (as audiences foram regeradas hoje sobre base reconstruída): recompra **1.524** (era 1.538), alto valor **409** (era 420), EMQ do Compra **7.4/10** (era 7.5).

---

## 0. Dados da conta (iguais nas 3 campanhas)

| Campo | Valor |
|---|---|
| Business Manager | IP Realiza (business_id `3640550059575630`) |
| Conta de anúncio | CA IP Realiza - 02 (`act_2076716696539325`) |
| Pixel / Dataset | `2276849516022676` |
| Evento de conversão | `Purchase` (Pixel + CAPI, já validado — EMQ 7.5/10 hoje) |

---

## 1. Pré-requisito obrigatório — antes de criar QUALQUER uma das 3

**Construir a audiência de exclusão "Clientes Ativos Recentes".** Isto não existe hoje. O achado de 07/10 (registrado no card ClickUp) provou que, sem EXCLUIR cliente existente do direcionamento (reduzir lance via Regra de Valor não basta), uma campanha de prospecção pode ler ROAS agregado de ~7x enquanto o público realmente novo está em 0,47x — prejuízo real. Isso vale pra Campanha 2 e Campanha 3 tanto quanto valeu pra Campanha 1.

- **Fonte:** pedidos pagos dos últimos 30 dias (mesma base que já usamos pra gerar `audiencia_recompra_90dias.csv`, só com janela mais curta).
- **Como subir:** Configurações de Publicidade → Públicos → Criar público personalizado → Lista de clientes → upload do CSV (telefone/email, mesmo formato das listas já carregadas).
- **Onde usar:** Exclusão de audiência no nível do conjunto de anúncios, nas Campanhas 2 e 3 (a 1 já tem Regra de Valor + Existing Customer Budget Cap ativos — não mexer nela).

Se preferir, me avise e eu gero esse CSV a partir da base de pedidos antes de você montar o conjunto — é rápido, só não fiz ainda porque não foi pedido explicitamente até agora.

---

## 2. Campanha 2 — CBO Teste de Criativos — R$400/dia

| Config | Valor |
|---|---|
| Objetivo (ODAX) | `OUTCOMES_SALES` |
| Tipo | Advantage+ Sales / CBO — **nunca** "ASC" legado |
| Otimização | **VALUE** (mesma lógica da Campanha 1 — concentração de 85,3% do faturamento nos 10% maiores compradores) |
| Meta de desempenho | "Maximizar o valor de conversão" — se a conta ainda não tiver isso liberado (Business Verification), usar "Maximizar o número de conversões" como fallback |
| Estrutura | 1 conjunto pra começar (ver nota abaixo sobre o 2º ângulo) |
| Audiência | Advantage+ Audience (broad), **excluir** a lista do passo 1 |
| Atribuição | Clique = 1 dia · Visualização = nenhuma · Engajamento = nenhuma — mesma config que você já aplicou na Campanha 1 hoje, e pela mesma razão (bug de fbc congelado ainda em mitigação parcial; janela maior = mais superfície de contaminação) |
| Orçamento | CBO R$400/dia |
| Nome da campanha | `Campanha 2 — CBO Teste de Criativos` |
| Nome do conjunto | `Conjunto 1 — Teste Comunidade` |

**Criativo — ângulo Comunidade** (único ângulo com creative já pronto e renderizado pra esta campanha — ver `copy-angles-2026-10-09.md` §4):

> **Headline:** "Entra no grupo. Fica por dentro de tudo. De graça."
> **Corpo:** "A Império tem uma comunidade que avisa resultado, bastidor e próxima rodada em primeira mão — direto no seu WhatsApp. Sem compromisso pra entrar, sem nada pra pagar."
> **CTA:** "Entrar no grupo e acompanhar de perto" → aponta pro botão **primário** da LP (grupo WhatsApp) — é o ÚNICO ângulo que deve rotear pra lá, os outros 4 vão pro site.

Assets já renderizados prontos pra subir (não precisam de produção nova):
- `creatives/campanha-1-whitelist-social/.../comunidade_nao-sorteia-so-premio_video_20261006.mp4`
- `creatives/campanha-1-whitelist-social/.../comunidade_100numeros-sorte_video_20261006.mp4`

**Nome do anúncio (padrão `utm-convention.md`):** `comunidade_{gancho}_video_20261009`

**Decisão em aberto, não inventada aqui:** o protocolo 3:2:2 completo (Módulo 07) pede 2 ângulos nesta campanha. Os outros 4 ângulos já têm casa decidida (Prêmio/Confiança/Acessibilidade → Campanha 1 e 4, Prova → Campanha 3) — não há um 6º ângulo escrito pra ser o 2º conjunto da Campanha 2. Duas opções, sua escolha: (a) começar só com 1 conjunto (Comunidade) e pedir ao @ladeira um ângulo novo quando quiser expandir; (b) usar um hook alternativo do MESMO ângulo Comunidade como 2º conjunto, testando gancho em vez de ângulo. Recomendo (a) — mais limpo, não força uma variação artificial.

---

## 3. Campanha 3 — Retargeting (Site) — R$300/dia

| Config | Valor |
|---|---|
| Objetivo | `OUTCOMES_SALES`, otimização VALUE |
| Audiência (inclusão) | Custom Audience — **Website, visitantes 30 dias** (evento `PageView`) |
| **Confirmar antes de ativar** | Que o Pixel está mesmo capturando `PageView` no site (Événements Manager → evento Ver conteúdo/PageView, já em 8.5-8.7/10 hoje — provavelmente ok, mas confirme o volume dos últimos 30d antes de publicar) |
| Audiência (exclusão) | `audiencia_recompra_90dias.csv` (1.538 contatos, ≥2 compras — já são recorrentes, não pagar CAC de novo) **+** a lista do passo 1 (clientes ativos recentes) |
| Atribuição | Mesma config da Campanha 2 (clique 1 dia, sem view/engajamento) |
| Orçamento | 1 conjunto, R$300/dia |
| Nome da campanha | `Campanha 3 — Retargeting (Site)` |
| Nome do conjunto | `Conjunto 1 — Visitantes 30 Dias` |

**Criativo — ângulo Prova** (`copy-angles-2026-10-09.md` §5):

> **Headline:** "Resultado público, sempre. Você confere, não só confia."
> **Corpo:** "Enquanto outros escondem número e resultado, a Império publica tudo — você acompanha a extração e confere o ganhador na hora."
> **CTA:** "Ver o que está disponível agora" → site.

**🚫 BLOQUEIO B2 — não existe asset deste ângulo.** Direito de imagem está liberado (confirmado pelo founder em 09/10), mas nenhum material de ganhador foi selecionado nem produzido. Varredura em `creatives/` em 10/10 confirma: zero arquivos de Prova.

**Caminho mais rápido pra destravar** (ordem de esforço crescente):
1. **Reaproveitar os takes-base já limpos** (`campanha-1-whitelist-social/takes-base/take{1,2,3}_*.mp4`) com a copy de Prova sobreposta — mesmo motor Remotion já usado na Garantido. É o caminho de menor esforço e não depende de material novo do cliente.
2. Pedir ao cliente 1 depoimento/foto de ganhador real (já autorizado) e produzir em cima disso — mais forte como prova, mas depende de terceiro.

**Nome do anúncio:** `prova_{gancho}_video_20261009`

---

## 4. Campanha 4 — Reativação "Desinteressados" — R$100/dia

| Config | Valor |
|---|---|
| Objetivo | `OUTCOMES_SALES` |
| Audiência | Lista dormente **"Clientes Desinteressados"** (550.763 contatos) — já carregada em Configurações de Publicidade, só selecionar |
| Exclusão | **Não precisa** da lista do passo 1 — por definição esta base já não é de clientes ativos |
| Atribuição | Mesma config das outras 2 novas |
| Orçamento | 1 conjunto, R$100/dia |
| Nome da campanha | `Campanha 4 — Reativação (Desinteressados)` |
| Nome do conjunto | `Conjunto 1 — Base Dormente` |

**Criativo — copy de WIN-BACK (nova, escrita em 10/10)**

A copy de Acessibilidade que estava aqui antes abria com *"Primeira vez na Império?"* — errado para este público, que **já comprou e sumiu**. Reescrita no registro certo (`copy-angles-2026-10-09.md` §3 continua valendo para Campanha 1, onde o público é de primeira compra de verdade):

> **Headline:** "Faz tempo que você não aparece. A rodada de hoje já tá aberta."
> **Corpo:** "Tem rodada nova todo dia — 100 números, resultado no mesmo dia, mais de um ganhador por rodada. Se faz tempo que você não entra, dá uma olhada no que tá rolando agora."
> **CTA:** "Ver o que está disponível agora" → site.

**Por que esta copy:** nível de consciência é *most aware* — a pessoa conhece a marca, já comprou, não precisa de explicação de mecanismo nem de prova. Precisa de **motivo pra voltar hoje** e de zero fricção. Não promete bônus de retorno (não existe) nem cita valor de prêmio; os três fatos usados (100 números, resultado no mesmo dia, mais de um ganhador) já estão publicados na LP.

**🚫 BLOQUEIO B3 — não existe asset utilizável.** Os únicos arquivos de Acessibilidade (`acessibilidade_apenas-7reais/8reais_*.mov`) pertencem à leva **reprovada pela Meta** em 06/10 e citam preço, promessa que esta copy abandonou. Mesmo caminho de destrave da Campanha 3: produzir sobre os takes-base limpos.

**Nome do anúncio:** `reativacao_volta-rodada-hoje_video_20261010`

---

## 5. Parâmetro de URL — colar nas 3 campanhas, campo "Parâmetros de URL" (seção Rastreamento, não o "Website URL")

```
utm_source=meta&utm_medium=paid-social&utm_campaign={PREFIXO}-{{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}
```

Troque `{PREFIXO}` por: `camp2-cbo-teste` / `camp3-retargeting` / `camp4-reativacao`, conforme a campanha. `utm_source` sempre `meta` minúsculo.

---

## 6. Checklist final antes de ativar qualquer uma das 3

**Destravar antes de tudo (auditoria 10/10):**
- [ ] **B1** — abrir um conjunto de anúncios e confirmar se as 3 listas aparecem como **Custom Audience selecionável** em segmentação/exclusão, ou se só existem como classificação de conta. Se só existirem como classificação, **subir as listas de novo** como Público Personalizado > Lista de clientes.
- [ ] **B4** — gerar e subir a audiência de exclusão "Clientes Ativos Recentes" (me peça, gero do CSV reconstruído em minutos)
- [ ] **B2/B3** — produzir criativo de Prova (C3) e de Win-back (C4) sobre os takes-base limpos

**Depois, para cada campanha:**
- [ ] Atribuição: clique 1 dia / visualização nenhuma / engajamento nenhuma, nas 3
- [ ] Parâmetro de UTM colado no campo certo (Parâmetros de URL, não Website URL), nas 3
- [ ] Nome de campanha/conjunto/anúncio segue a convenção de `utm-convention.md`
- [ ] Campanha 3: confirmado volume real de `PageView` nos últimos 30 dias antes de publicar
- [ ] Campanha 4: decidir se a headline de Acessibilidade precisa de variação de win-back antes de publicar
- [ ] Depois de publicar as 3: deixar rodar 7 dias corridos sem editar estrutura (gate da seção 5 do `campaign-plan-wave2.md`) antes de julgar performance
- [ ] Ao ler resultado, sempre quebrar por "Novo público" vs "Clientes existentes"/"Público engajado" — nunca confiar no agregado (lição de 07/10)

---

*Este guia não substitui `campaign-plan-wave2.md` — é a tradução dele em passos de execução. Qualquer divergência entre os dois, o wave2 é a fonte de verdade estratégica.*
