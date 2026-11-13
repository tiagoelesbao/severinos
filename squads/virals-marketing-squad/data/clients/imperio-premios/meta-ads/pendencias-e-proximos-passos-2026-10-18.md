# Império Prêmios — Pendências e Próximos Passos (18/10)

> Documento de transição — resumo enxuto do que falta, não um log de investigação.
> Histórico completo e achados técnicos detalhados: [`status-campanhas-e-proximos-passos-2026-10-15.md`](status-campanhas-e-proximos-passos-2026-10-15.md).

## O que já está resolvido (não precisa de ação)

- Tracking: Pixel padrão (poluído pelo pixel nativo da plataforma do cliente) e conjunto "Plataforma" (`PurchasePlataforma` etc., nosso, limpo) rodando em paralelo — GTM v14, CAPI ajustado, dedup validado ao vivo.
- fbc realinhado por sessão (captura fresca via GTM, não o fbc stale que a plataforma do cliente reenvia por meses) — rodando desde 07-08/10.
- UTM corrigida nos 12 anúncios ativos das Campanhas 1, 2, 2.1 e 3 — convenção `utm_source=meta&utm_medium=paid-social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}` em todos.
- BI: funil Pressel/Catálogo/Site/Plataforma separados, breakdown de UTM por criativo (não só por campanha), reconciliação ROAS Meta vs. ROAS real, baixas manuais isoladas no card de lucro, faturamento em janela de negócio (21h30) e janela 24h lado a lado.
- Exclusão de clientes existentes (`audiencia_clientes_ativos_recentes_30dias`, 1.042 contatos) aplicada nas Campanhas 2 e 3 — ambas agora rodam em modo "Conquistar novos clientes".

## Pendências — decisão sua

- [ ] **Campanha 3**: pausar, reduzir ou manter? Agora com rastreamento e exclusão corrigidos — espere 48-72h de dado novo (até ~20-21/10) antes de decidir com número confiável, não decida com o dado antigo (estava "cego" de UTM até ontem).
- [ ] **Conversão Personalizada** (`PurchasePlataforma`) como evento de otimização, no lugar do "Comprar" padrão poluído — meu conselho: vale a pena, mas só depois de observar o volume real pós-correção de hoje (alguns dias), pra não resetar o aprendizado dos conjuntos de anúncios à toa.
- [ ] **SendFlow** (clique-por-LP → compra-por-LP): precisa de link separado por LP + credencial de API própria. Só vale o esforço se granularidade por LP específica virar prioridade.

## Pendências técnicas nossas (sem bloqueio em você)

- [ ] Por que a audiência "All Viewers" (antiga) fica pequena mesmo com 97,7% do PageView sendo navegador real — não fechado, menos crítico agora que "Pressel - Todos os Visitantes" existe como alternativa.
- [ ] Isolar se o `fbc` vazio em alguns eventos da API de Conversões (achado no Events Manager) é do nosso envio ou do servidor nativo do cliente.

## Próximos passos recomendados (ordem sugerida)

1. Deixar as correções de hoje (UTM + exclusão de clientes) rodarem 48-72h sem mexer em mais nada — qualquer leitura de ROAS real antes disso ainda estará diluída pelo dado histórico contaminado.
2. Revisar `apps/BI/imperio-premios/operacional.html` (aba Operacional, seção UTM → Meta Ads) com o founder: volume real por campanha e por criativo começando a aparecer.
3. Decisão da Campanha 3 (pausar/reduzir/manter) com base no dado da semana 20-21/10.
4. Se o volume justificar (~50 conversões confirmadas/semana por conjunto), migrar a otimização pra `PurchasePlataforma`.
