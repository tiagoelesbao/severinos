# Setup: ClickUp Custom Fields

Guia para criar os custom fields necessários nas lists do Hunter no ClickUp.

## Pré-requisitos

- Acesso admin ao ClickUp workspace
- Space: Comercial (ID: 901312526794)

---

## List: Prospecção (ID: 901325463808)

**Localização:** Comercial > Hunter ADS System > Prospecção

O field `Cliente` (drop_down) já existe. Criar os seguintes:

| # | Nome | Tipo | Opções (se aplicável) |
|:--|:-----|:-----|:----------------------|
| 1 | Instagram Handle | Short Text | — |
| 2 | TikTok Handle | Short Text | — |
| 3 | Nicho | Dropdown | fitness, beauty, estudos, lifestyle, food, tech, moda, pets |
| 4 | Followers | Number | — |
| 5 | Engagement Rate | Number | — |
| 6 | Creator Score | Number | — |
| 7 | Fonte | Dropdown | hashtag, competitor, ads_library, referral, organic |
| 8 | Link Perfil | URL | — |
| 9 | Data Discovery | Date | — |
| 10 | Notas | Text | — |

### Passos:

1. Abrir ClickUp > Space "Comercial" > Folder "Hunter ADS System" > List "Prospecção"
2. Clicar em "⚙️ Settings" da list (ou "..." > "List settings")
3. Ir em "Custom Fields"
4. Clicar "+ Add Field" para cada campo
5. Após criar, copiar o Field ID e atualizar `config/clickup-ids.yaml`

---

## List: CRM Hunter (ID: 901325463813)

**Localização:** Comercial > CRM Hunter > List

Criar TODOS os fields (não tem nenhum existente):

| # | Nome | Tipo | Opções (se aplicável) |
|:--|:-----|:-----|:----------------------|
| 1 | Cliente | Dropdown | (mesmas do "Cliente" da prospecção) |
| 2 | Instagram Handle | Short Text | — |
| 3 | TikTok Handle | Short Text | — |
| 4 | Nicho | Dropdown | fitness, beauty, estudos, lifestyle, food, tech, moda, pets |
| 5 | Tipo Contrato | Dropdown | starter, growth, premium |
| 6 | Valor Base | Currency (BRL) | — |
| 7 | Comissão % | Number | — |
| 8 | Data Contratação | Date | — |
| 9 | Performance Score | Number | — |
| 10 | Entregáveis/Mês | Number | — |
| 11 | Status Creator | Dropdown | ativa, pausada, desligada |

---

## Após Criar os Fields

1. Para cada field criado, copie o Field ID (visível na URL ou via API)
2. Atualize `config/clickup-ids.yaml` trocando `id: null` pelo ID real
3. Teste: `node scripts/clickup-pipeline-sync.js --dry-run`
