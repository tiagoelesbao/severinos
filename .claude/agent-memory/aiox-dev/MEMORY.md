# Memory Index — @dev (Dex)

- [Sinais de verificação que mentem](project_build_verification_traps.md) — `tsc --noEmit` sub-reporta por cache; `next build` sai 1 com build verde; a suíte podia montar a base de um schema velho.
- [Exportação proibida em "use server"](project_use_server_export_trap.md) — exportar não-função zera TODAS as exportações do módulo no cliente; o erro acusa outro arquivo e `tsc` não vê.
- [Varredura de fonte em teste](feedback_source_scan_assertions.md) — os comentários escrevem a forma proibida para condená-la; varrer código, nunca texto.
- [Laço de feedback da suíte do lotemania](project_lotemania_suite_feedback_loop.md) — um arquivo custa ~75s e não 10 min; `console.log` do teste não sai, a informação vem por mensagem de asserção.
- [Varredura global mata o contador](project_global_sweep_kills_the_counter.md) — tornar global o que contava "na próxima visita do dono" apaga a penalidade em silêncio; verde na suíte, feature morta.
- [Defeitos conhecidos da reserva do lotemania](project_lotemania_reserve_known_defects.md) — identidade do comprador em `INSERT` cru contra índice único (medido, não consertado); varredura sem teto de lote.
