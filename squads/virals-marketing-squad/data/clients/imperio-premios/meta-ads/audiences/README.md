# Audiências — Império Prêmios

- `audiencia_alto_valor_90dias.csv` — 420 contatos, top 20% por gasto (quantile 0.80 de `Valor_Total_Gasto`). Gerado por `reports.py`. Formato simples `nome,phone`. Rotulada no Ads Manager como **"Clientes Alto Valor"**.
- `audiencia_recompra_90dias.csv` — 1.538 contatos com ≥2 compras pagas. Gerado por `reports.py`. Usar como **exclusão** nas campanhas de aquisição (já são clientes recorrentes) ou isolar num conjunto de reativação/retenção com orçamento próprio.
- `facebook_audience_1500_quentes.csv` — 1.529 contatos, formato oficial de upload Meta (`email,email,email,phone,phone,phone,madid,fn,ln,zip,ct,st,country,dob,doby,gen,age,uid,value`) **com coluna `value`** (LTV/gasto por contato) — base maior e mais robusta que a de alto valor pra Lookalike por valor. Rotulada no Ads Manager como **"Clientes Gerais"**.
- `facebook_audience_500k2.csv` — **550.763 contatos**, base histórica dormente (clientes que pararam de comprar). Rotulada no Ads Manager como **"Clientes Desinteressados"**. Uso: reativação em fase futura (Wave 1 não usa — budget de R$1k/dia é raso demais pra essa base sem diluir o resto, ver `campaign-plan-wave1.md`), nunca como público de aquisição fria.

**Status 2026-10-05:** as 3 audiências foram setadas em Configurações de
Publicidade > Clientes Existentes da conta de anúncio (CA IP Realiza). Isso
classifica quem conta como "cliente existente" pro Advantage+ (Existing
Customer Budget Cap) — **confirmar separadamente** se também aparecem como
Custom Audience selecionável dentro da criação de conjunto de anúncios
(Audience > Custom Audiences), que é o que as campanhas de retargeting/LAL
do `campaign-plan-wave1.md` precisam.

Formato `nome,phone`: telefone em dígitos puros com DDI 55 (sem `+`), pronto
para upload direto em Públicos Personalizados do Meta Ads Manager (Customer
List → Phone).

**Regenerar** (com dados mais recentes): `python services/Meta/imperio-premios/collector.py 90 && python services/Meta/imperio-premios/reports.py 90` — os CSVs saem em `services/Meta/imperio-premios/` e devem ser copiados pra cá manualmente após conferência.
