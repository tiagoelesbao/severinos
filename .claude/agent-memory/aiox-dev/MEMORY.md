# Memory Index — @dev (Dex)

- [Sinais de verificação que mentem](project_build_verification_traps.md) — `tsc --noEmit` sub-reporta por cache; `next build` sai 1 com build verde; a suíte podia montar a base de um schema velho.
- [Exportação proibida em "use server"](project_use_server_export_trap.md) — exportar não-função zera TODAS as exportações do módulo no cliente; o erro acusa outro arquivo e `tsc` não vê.
- [Varredura de fonte em teste](feedback_source_scan_assertions.md) — os comentários escrevem a forma proibida para condená-la; varrer código, nunca texto.
- [Laço de feedback da suíte do lotemania](project_lotemania_suite_feedback_loop.md) — arquivo ~38s, suíte inteira ~590s e estoura o teto de 10 min do Bash; com agente paralelo a contagem de testes não é sua.
- [Varredura global mata o contador](project_global_sweep_kills_the_counter.md) — tornar global o que contava "na próxima visita do dono" apaga a penalidade em silêncio; verde na suíte, feature morta.
- [Defeitos de identidade do comprador no lotemania](project_lotemania_reserve_known_defects.md) — a reserva foi consertada (LTM-23); `bonus-play.ts` tem cópia byte-a-byte do mesmo check-then-act; varredura sem teto de lote.
