# Refresh automático do BI Garantido — mesmo padrão do Império
# (apps/BI/imperio-premios/refresh.ps1).
# 1. Reagrega dados reais (bi_aggregator.py) — grava os 4 data-*.json local
#    E publica no Supabase Storage (bucket "catalogo").
# SEM deploy (removido 2026-11-03): api/dados.js lê do Storage, então o
# dado fica fresco sem gastar a cota de 100 deploys/dia da conta Vercel
# (compartilhada com todos os outros projetos).
$ErrorActionPreference = "Stop"
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
    $aggregator = Join-Path $repoRoot "services\Meta\garantido-premios\bi_aggregator.py"

    Set-Location $repoRoot
    # Mesmo fix preventivo do refresh.ps1 do Império (achado 2026-11-08):
    # com $ErrorActionPreference="Stop", "2>&1" numa chamada nativa vira
    # NativeCommandError a cada linha de stderr (mesmo avisos inofensivos)
    # e aborta o script ANTES de gravar os data-*.json.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $aggOutput = & python $aggregator --dias 30 2>&1
    $ErrorActionPreference = $prevEAP
    $aggOutput | Out-File -Append -FilePath $logFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "bi_aggregator.py falhou (exit $LASTEXITCODE)" }
    Log "data-*.json atualizados (local + Supabase Storage)"

    Log "===== Refresh concluido ====="
} catch {
    Log "ERRO: $_"
    exit 1
}
