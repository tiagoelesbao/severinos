# Refresh automático do BI Império — roda via Windows Task Scheduler.
# 1. Reagrega dados reais (bi_aggregator.py) — grava os 4 data-*.json local
#    E publica no Supabase Storage (bucket "catalogo").
#
# SEM deploy (removido 2026-11-03): api/dados.js lê do Storage, então o
# dado fica fresco sem precisar de "vercel --prod" a cada ciclo. Isso
# importava especialmente aqui — o refresh de 15min do Império sozinho
# já consumia quase toda a cota de 100 deploys/dia da conta Vercel
# (compartilhada com todos os outros projetos, inclusive o Garantido).
$ErrorActionPreference = "Stop"
# Fix de encoding (2026-10-08) — mesmo bug documentado em capi_realtime.ps1:
# sem isto, o stdout capturado de "python ... 2>&1" e "vercel ... 2>&1" é
# decodificado com o codepage OEM do console em vez de UTF-8, e os
# emojis/acentos chegam ao log como lixo ("CompletingÔÇª", "Ôû▓ Aliased").
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
$scriptDir = $PSScriptRoot
$logFile = Join-Path $scriptDir "refresh.log"

function Log($msg) {
    "$(Get-Date -Format o) $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

try {
    Log "===== Iniciando refresh ====="
    $repoRoot = Resolve-Path (Join-Path $scriptDir "..\..\..")
    $aggregator = Join-Path $repoRoot "services\Meta\imperio-premios\bi_aggregator.py"

    Set-Location $repoRoot
    # Achado 2026-11-08: com $ErrorActionPreference="Stop", "2>&1" numa
    # chamada nativa vira NativeCommandError a cada linha de stderr —
    # inclusive avisos inofensivos (DeprecationWarning do numpy, "Token
    # expirado, reautenticando..." do client_api.py) — e aborta o script
    # ANTES de gravar os data-*.json, mesmo quando o Python ia terminar
    # com sucesso. 14h de refresh "falhando" sem o JSON nunca ter sido
    # realmente quebrado. Mesmo padrão de fix já usado pro "vercel --prod"
    # neste arquivo antes dele ser removido (2026-11-03).
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $aggOutput = & python $aggregator --dias 14 2>&1
    $ErrorActionPreference = $prevEAP
    $aggOutput | Out-File -Append -FilePath $logFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "bi_aggregator.py falhou (exit $LASTEXITCODE)" }
    Log "data-*.json atualizados (local + Supabase Storage)"

    Log "===== Refresh concluido ====="
} catch {
    Log "ERRO: $_"
    exit 1
}
