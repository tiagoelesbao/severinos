# Playbook Meta Ads — Virals/Oraclum

**Fonte da metodologia:** `docs/meta_mba/` (MBA Meta Performance Engineering,
16 módulos + 10 docs de contexto). Este playbook é a versão **genérica e
replicável** do Kickoff Kit do Módulo 01 — extraída depois de aplicar a
metodologia num cliente real (Império Prêmios, nicho sorteios). Mesma lógica
do Capstone do Módulo 16: não generalizar antes de validar em conta real.

**Para quem é:** `@marketing-chief`, `@perry-marshall`, `@ezra-firestone` e
qualquer humano fazendo o kickoff de um cliente novo de tráfego pago Meta
Ads na Virals/Oraclum.

---

## 1. O que todo cliente novo precisa passar — os 5 Gates

Framework completo: `docs/meta_mba/Apostila/MODULO_01_FUNDAMENTOS_OFICIAIS_ECOSSISTEMA_E_ESTRUTURA.md`
seção 6. Resumo operacional:

| Gate | Pergunta de aprovação | Bloqueia o quê se não resolvido |
|---|---|---|
| **0 — Elegibilidade** | A oferta é permitida pela Meta e legal no país? Tem margem para anunciar? | Tudo — não gastar mídia sem isso |
| **1a — Governança** | Pixel/Dataset e pagamento estão em BMs separadas da execução? | Risco de contaminação entre ativos |
| **1b — Sinais** | Evento de otimização chega via Pixel+CAPI, deduplicado, EMQ ≥ 8.0? | Qualidade do leilão (Módulo 02) |
| **2 — Estrutura/Criativo** | Orçamento cobre 50 eventos/7d? ≥3 ângulos distintos? | Fase de aprendizado instável (Módulo 03) |
| **3 — Lançamento** | Go-live com orçamento calculado? | — |
| **4 — Medição** | Como saberemos se é incremental? | Decisões de escala sem evidência (Módulo 11/12) |

**Regra:** nenhuma campanha sobe sem Gates 0-2 resolvidos. Gate 3 e 4 podem
amadurecer depois do go-live, mas não antes dele.

---

## 2. Decisão de arquitetura de tracking: qual caminho usar

```
O cliente tem API/backend com dados de pedido/compra?
├── SIM → CAPI direto via backend do cliente (como Império Prêmios)
│          Vantagem: controle total sobre quais campos extrair/enviar,
│          sem depender de terceiro. Exige: script de extração +
│          cliente CAPI próprio (ver services/Meta/<slug>/).
│
└── NÃO → CAPI Gateway (solução hospedada tipo Stape/CloudFlare Worker)
           ou implementação direta no checkout/site do cliente (requer
           acesso ao time de dev do cliente). Mais lento de configurar,
           mas não exige credenciais de backend do cliente.
```

Em ambos os casos: Pixel client-side continua rodando em paralelo (redundância
híbrida, Módulo 08) — CAPI nunca substitui o Pixel, complementa.

### 2.1 Checklist técnico do CAPI (qualquer caminho)

- [ ] `event_id` = identificador único e ESTÁVEL do pedido/transação (nunca inventar — usar o que a API/backend já gera, ex. order id do Mongo/SQL)
- [ ] `event_time` = timestamp de confirmação de pagamento, não de criação do pedido
- [ ] `em`/`ph` com SHA-256 **somente quando o campo existir** (nunca hash de string vazia)
- [ ] `fbp`/`fbc` sempre em texto puro (nunca hashear)
- [ ] Telefone: usar o E.164 que a API do cliente já fornece quando existir (ex: `userId.phoneDetails.e164`) — não reinventar normalização manual por padrão
- [ ] Medir EMQ real via Dataset Quality API antes de declarar "pronto"

---

## 3. Brief de kickoff (template replicável)

Copiar para `squads/virals-marketing-squad/data/clients/<slug>/meta-ads/brief.yaml`:

```yaml
cliente: NOME
vertical: sorteios | ecommerce | infoproduto | servicos | outro
oferta:
  descricao: ""
  ticket_medio: 0.0
  margem_contribuicao_pct: 0.0
  modelo: site | whatsapp | lead
politica:
  enquadramento: livre | restrita | gambling
  autorizacao_meta: nao_aplicavel | pendente | aprovada
  licenca_regulatoria: nao_aplicavel | pendente | ok
  age_gate_18: false
ativos:
  bm_ativos_separada_da_execucao: false
  dominio_verificado: false
  dataset_id: ""
tracking:
  pixel: false
  capi: false
  event_id_dedup: false
  emq_atual: 0.0
orcamento:
  cpa_alvo: 0.0
  budget_dia_disponivel: 0.0
criativo:
  angulos_distintos: 0
  formatos_distintos: 0
```

Ver `squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/brief.yaml`
para um exemplo preenchido com dados reais.

---

## 4. Estrutura de pastas por cliente

```
squads/virals-marketing-squad/data/clients/<slug>/meta-ads/
├── brief.yaml              # economia, compliance, tracking — template acima
├── bm-map.yaml             # topologia de BMs (Matriz-Pixel, Matriz-Página, Operador, gaps)
├── gates-status.yaml       # status vivo dos 5 Gates, item por item
├── utm-convention.md       # convenção de UTM específica do cliente
└── audiences/              # Custom Audiences exportadas (alto valor, recompra, etc.)

services/Meta/<slug>/
├── client_api.py           # cliente autenticado da API/backend do cliente (se aplicável)
├── collector.py            # coletor resumível/incremental com checkpoint
├── reports.py              # segmentação + relatório financeiro (MC, ROAS_BE, CAC máx)
├── capi_client.py          # monta e envia eventos Purchase ao Meta CAPI
└── send_backlog.py         # orquestrador de envio incremental (Task Scheduler)
```

Registrar o cliente em `squads/virals-marketing-squad/data/clients/_registry.yaml`
com `tipo: cliente_trafego_pago` — resolvido por
`squads/virals-marketing-squad/scripts/_meta_ads_client_resolver.py`, **não**
pelo `_client_resolver.py` do pipeline de criativo (campos diferentes).

---

## 5. Governança de Business Manager (Módulo 14)

```
BM Matriz de Ativos (Pixel/Dataset, Catálogo, Páginas)
BM de Pagamento (cartão corporativo, SEPARADA das de execução)
   │ permissão de uso
   ▼
BM de Execução 01 (conta ativa)      BM de Execução 02 (contingência)
```

- Nunca criar o Pixel e manter o cartão de crédito dentro da mesma BM que
  executa anúncios — uma reprovação/restrição na conta de execução não pode
  comprometer o ativo que alimenta todas as outras contas.
- Sempre ter pelo menos uma conta de contingência — ponto único de falha é
  um risco operacional real, não teórico (visto no cliente Império Prêmios:
  só 1 conta ativa até 2026-10-04).

---

## 6. Sequência de kickoff (ordem real de execução)

1. **Gate 0** — brief.yaml preenchido, compliance resolvido, meta de margem líquida definida com o cliente
2. **Gate 1a** — confirmar/montar topologia de BMs (seção 5)
3. **Gate 1b** — migrar/construir pipeline de extração + CAPI (`services/Meta/<slug>/`), validar com dados reais antes de prosseguir
4. **Gate 2** — ângulos criativos definidos, UTM convention escrita, Custom Audiences preparadas
5. Pixel/Dataset criado no Business Manager + System User token gerado (**ação manual, alto risco — nunca automatizar via browser agent**)
6. **Gate 3** — orçamento calculado (fórmula `50/7 × CPA_alvo` por conjunto, Módulo 01 seção 4.4), estrutura Advantage+ + CBO de teste criada
7. Go-live com **leitura sem mexer** durante a fase de aprendizado (Módulo 03) — zero edições significativas nos primeiros 7 dias
8. **Gate 4** — primeira decisão formal SCALE/HOLD/ITERATE/KILL com CPA marginal (Módulo 12)

---

## 7. Erros comuns a evitar (aprendidos na prática)

- ❌ Audiência "nem muito ampla, nem muito restrita" — contradiz Performance 5/Advantage+, que recomenda broad + deixar o algoritmo encontrar. Erro de checklist pré-MBA, já corrigido em `checklists/dr-campaign-launch-checklist.md`.
- ❌ Otimizar por volume (`OFFSITE_CONVERSIONS`) quando há variância grande de ticket — usar otimização por `VALUE` sempre que o negócio tiver clientes "whale" desproporcionais (padrão comum: 10% dos compradores = 80%+ do faturamento).
- ❌ Deixar credenciais de API de cliente em scripts soltos fora de controle de versão — achado real no kickoff do Império Prêmios (`Desktop/etc/extract.py` com login/senha em texto puro). Toda credencial de cliente entra via `.env`, nunca hardcoded.
- ❌ Subir o primeiro anúncio sem convenção de UTM definida — sem isso, não dá pra separar o que cada conjunto/criativo específico gerou, mesmo com CAPI perfeito.
- ❌ Inventar `event_id` ao invés de usar o identificador que a API do cliente já expõe (ex: via parâmetros de filtro tipo `filterOrderId` que indicam que o campo existe no payload, mesmo que o script de extração atual não o capture).
