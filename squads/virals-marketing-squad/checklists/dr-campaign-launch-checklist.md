# Checklist: Lançamento de Campanha DR

**Campanha:** ___________________
**Produto/Oferta:** ___________________
**Gestor:** @perry-marshall
**Data de lançamento:** ___________________

> Atualizado 2026-10-04 com a metodologia de `docs/meta_mba/` (MBA Meta
> Performance Engineering) e o playbook em
> `squads/virals-marketing-squad/docs/meta-ads-playbook.md`. Reflete os
> Gates 1b-3 do Kickoff Kit — rodar `*meta-kickoff` antes deste checklist
> para confirmar Gates 0-1a (compliance e governança).

## Economia & Oferta
- [ ] CAC máximo calculado a partir da MC real (`ROAS_BE = 1/MC%`, `CAC_max = MC - Faturamento×%ML`), não de um CPA "achado"
- [ ] Meta de margem líquida alinhada com o cliente
- [ ] Página de destino no ar e funcionando
- [ ] Checkout funcional (teste real)

## Tracking (Gate 1b — não pular nenhum item)
- [ ] Pixel client-side instalado e disparando
- [ ] CAPI server-side implementado em paralelo (redundância híbrida, não substituição)
- [ ] `event_id` estável vindo do identificador real do pedido/transação (nunca inventado) — garante dedup Pixel+CAPI
- [ ] `event_time` = timestamp de confirmação de pagamento
- [ ] EMQ medido via Dataset Quality API ≥ 8.0 antes do go-live
- [ ] UTM configurada em **100%** dos links de anúncio (ver `utm-convention.md` do cliente) — sem isso não dá pra atribuir qual conjunto/criativo gerou o quê, mesmo com CAPI perfeito

## Criativos
- [ ] ≥3 ângulos **realmente distintos** (argumento/prova/formato diferentes — não cor de legenda ou cópia com hook trocado)
- [ ] Taxonomia de nomenclatura aplicada (`{angulo}_{gancho}_{formato}_{criador}_{data}`)
- [ ] Anúncios submetidos e aprovados pela plataforma

## Configuração de Campanha (Performance 5 / Módulo 01-05)
- [ ] Objetivo ODAX correto para o evento de conversão real (Vendas com `Purchase`, não Tráfego/Engajamento por padrão)
- [ ] **Otimização por VALOR** (não volume) se houver variância de ticket relevante — especialmente se existir concentração alta em poucos clientes de alto valor
- [ ] Audiência **ampla** (Advantage+ Audience) — não restringir manualmente "pra não desperdiçar verba". Restringir só com evidência real de que o broad está performando mal, nunca por padrão
- [ ] Orçamento mínimo por conjunto cobre `50/7 × CPA_alvo` (fórmula do Módulo 01) — menos que isso trava em Learning Limited permanente
- [ ] Estrutura simplificada: campanha principal Advantage+ (70-80% budget) + CBO de teste de ângulos (20-30%)
- [ ] Bid strategy alinhada com CAC máximo (não CPA genérico)

## Monitoramento
- [ ] Dashboard de acompanhamento configurado (ClickUp "Trackeamento & Dashboards")
- [ ] Parâmetros de autonomia documentados no ClickUp
- [ ] Alertas automáticos configurados (budget, CPA, rejeições)
- [ ] Responsável humano de plantão informado
- [ ] Plano de **leitura sem mexer** nos primeiros 7 dias (fase de aprendizado) — nenhuma edição significativa que reinicie o aprendizado

**APROVADO PARA LANÇAR [ ] / NECESSITA AJUSTE [ ]**
