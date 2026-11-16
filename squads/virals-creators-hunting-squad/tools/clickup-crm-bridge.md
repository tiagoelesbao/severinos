# Tool: ClickUp CRM Bridge

**Type:** Service Bridge
**Service:** `../../services/clickup/`
**Agents:** @hunter-manager (Jason)

## Description

Bridge para o serviço ClickUp existente. Gerencia tasks nas lists de Prospecção e CRM Hunter.

## Key Files

| File | Purpose |
|:-----|:--------|
| `services/clickup/client.js` | Axios client (API v2, auth via .env) |
| `services/clickup/tasks.js` | CRUD: createTask, updateTask, getTasks, setCustomField |
| `services/clickup/mapping.js` | ID resolution por nome humanizado |

## Lists

| List | ID | Uso |
|:-----|:---|:----|
| Prospecção | 901325463808 | Pipeline de prospects |
| CRM Hunter | 901325463813 | Creators ativas |

## Usage

```javascript
const { createTask, updateTask, getTasks } = require('../../services/clickup/tasks');

// Create prospect
await createTask('901325463808', '@creator', 'Score: 8.5/10', 'qualified');

// List all prospects
const result = await getTasks('901325463808');

// Move to CRM
await createTask('901325463813', '@creator', 'Contracted', 'onboarding');
```

## Integration Point

Used by `scripts/clickup-pipeline-sync.js` for bidirectional sync.
