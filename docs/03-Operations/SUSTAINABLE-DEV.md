# Guia de Desenvolvimento Sustentável (Virals OPS)

Este guia define como manter o projeto organizado e documentado sem sacrificar a velocidade de execução. O princípio central é: **A Documentação é o Código.**

## 1. O Fluxo de Trabalho AIOS (Story-Driven)
Nenhum código entra no repositório sem seguir este fluxo:
1.  **Story Creation:** Define a intenção e os critérios de aceitação.
2.  **Spec/Design (se complexo):** Documenta a lógica técnica em `docs/02-Architecture`.
3.  **Implementation:** O código é escrito seguindo a Story.
4.  **Validation (QA):** Verificação contra os critérios da Story.

## 2. Documentação Automática vs. Manual
*   **Manual (Estratégica):** Princípios, Visão, Arquitetura de Alto Nível (em `docs/01` e `docs/02`).
*   **Automática/Rastreada (Tática):** Stories, Change Logs e File Lists (em `docs/stories`).

## 3. Manutenção da Pasta `docs/`
*   **Escalabilidade:** Novos produtos devem ter sua própria pasta em `docs/04-Products/nome-do-produto`.
*   **Higiene:** Stories concluídas devem ser revisadas e, se necessário, transformadas em documentação permanente nos diretórios de Estratégia ou Operações.

## 4. O Papel dos Agentes
*   **@dalio:** Audita se os princípios estão sendo seguidos.
*   **@sm:** Garante que o backlog está fragmentado corretamente.
*   **@architect:** Garante que a documentação técnica não está defasada.

---
**"Dor + Reflexão = Progresso. Se não está documentado, não aconteceu."**
