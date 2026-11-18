# Memory Index — @dev (Dex)

- [Sinais de verificação que mentem](project_build_verification_traps.md) — `tsc --noEmit` sub-reporta por cache; `next build` sai 1 com build verde; a suíte podia montar a base de um schema velho.
- [Exportação proibida em "use server"](project_use_server_export_trap.md) — exportar não-função zera TODAS as exportações do módulo no cliente; o erro acusa outro arquivo e `tsc` não vê.
- [Varredura de fonte em teste](feedback_source_scan_assertions.md) — os comentários escrevem a forma proibida para condená-la; varrer código, nunca texto.
