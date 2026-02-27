# Checklist de Saude Operacional (Virals)

Este documento e utilizado trimestralmente para auditar se o sistema operacional da Virals esta saudavel ou se esta acumulando "lixo sistemico".

## 1. Transparencia e Principios (Peso 40%)
*   [ ] 100% das metricas criticas estao visiveis no Dashboard/CLI?
*   [ ] Houve algum caso de ocultacao de erro ou metrica ruim?
*   [ ] Os principios de `PRINCIPLES.md` foram referenciados em decisoes reais este trimestre?

## 2. Higiene de Documentacao e Pipeline (Peso 30%)
*   [ ] Existem Stories "orfas" (sem Epico) na pasta `docs/stories`?
*   [ ] O pipeline temporal (`active`/`done`) esta sendo respeitado?
*   [ ] A pasta `docs/04-Products` reflete a realidade atual do software?

## 3. Qualidade de Decisao (Peso 30%)
*   [ ] Decisoes tecnicas importantes possuem uma ADR correspondente?
*   [ ] O Protocolo de Meritocracia foi usado para resolver algum impasse?
*   [ ] As decisoes estao sendo tomadas baseadas em evidencias ou em "achismo"?

## Scorecard de Saude (0 a 10)
*   **8-10 (Saudavel):** Continue escalando.
*   **6-7 (Alerta):** Dedique o proximo ciclo a limpar dividas de governanca.
*   **Abaixo de 6 (Critico):** PARE a execucao. Refaca a fundacao antes de prosseguir.

---
*Auditoria realizada por: [NOME/AGENTE]*
*Data:* [DATA]
*Nota Final:* [NOTA]
