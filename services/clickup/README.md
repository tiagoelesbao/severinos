# 🌐 Virals ClickUp Service

Centralized integration layer for accessing ClickUp across all AIOS Squads. This service abstracts away complex Space, Folder, and List IDs by utilizing the Virals hierarchical mapping structure.

## Quick Start (CLI for Agents)

Agents should invoke these scripts natively from the CLI inside their workflows.

### Creating a Task
```bash
node services/clickup/tasks.js create \
    --name "Escrever novo Copy" \
    --department "Marketing" \
    --area "Produção de conteúdo" \
    --process "Process de Copywriting" \
    --description "Detalhes do copy..."
```

*(Note: The `department`, `area`, e `process` MUST match the text exactly as defined in the Virals Master Strategy document)*

### Listing Tasks
```bash
node services/clickup/tasks.js list \
    --department "Operações" \
    --area "Lançamentos" \
    --process "Processos de Lançamentos"
```

## Programmatic Usage (Node.js)

If you are writing another `.js` script in the AIOS ecosystem, you can import this service natively:

```javascript
const clickup = require('../../services/clickup');

const listId = clickup.mapping.getListId('Marketing', 'Traffic Performance & Growth', 'Gestão de Campanhas');
const tasks = await clickup.tasks.getTasks(listId);
```

## Setup & Configuration
1. Ensure `CLICKUP_API_KEY` is present in the root `.env` file of the workspace.
2. In `services/clickup/mapping.js`, replace the placeholder IDs (`SPACE_ID_MARKETING`, `LIST_ID_COPYWRITING`, etc) with real ClickUp IDs.
3. Run `npm install` inside the `services/clickup/` folder to download Axios.
