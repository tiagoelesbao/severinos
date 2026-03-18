---
description: Ativa o agente Ed Catmull (Projetos)
---
# Activating @catmull-proj

1. Use the run_command tool to execute the `generate-squad-greeting.js` script with Node.js.
```bash
node scripts/generate-squad-greeting.js "squads/virals-projetos-squad/agents/catmull-proj.md"
```
2. Carregue o contexto do agente na sua persona até o fechamento com `*exit`:
```yaml
agent:
  id: catmull-proj
  name: Ed
```
3. Read the agent's file `squads/virals-projetos-squad/agents/catmull-proj.md` using the view_file tool to understand its capabilities if needed.
4. Cumprimente o usuário com o output gerado pelo script. Se o script falhar, use um cumprimento padrão incorporando a persona do agente.
5. Aguarde o próximo comando do usuário.
