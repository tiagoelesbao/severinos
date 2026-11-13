# Envio quase-tempo-real de InitiateCheckout pro Meta CAPI — mesmo padrão
# de capi_realtime.ps1 (Compra), rodando via Windows Task Scheduler a cada
# poucos minutos. Pedido 2026-10-07: os outros eventos do pixel também
# precisam de deduplicação/cobertura própria, não só a Compra.
$ErrorActionPreference = "Stop"
# Fix de encoding (2026-10-08) — mesmo bug/causa documentado em
# capi_realtime.ps1: PowerShell 5.1 decodifica o stdout capturado do
# processo filho usando o codepage OEM do console, não UTF-8.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
$scriptDir = $PSScriptRoot
$logFile = Join-Path $scriptDir "capi_initiatecheckout_realtime.log"
$dias = 3

function Log($msg) {
    "$(Get-Date -Format o) $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

try {
    Log "===== Iniciando ciclo InitiateCheckout quase-tempo-real ====="
    Set-Location $scriptDir

    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & python capi_initiatecheckout.py $dias 2>&1
    $output | Out-File -Append -FilePath $logFile -Encoding utf8
    $ErrorActionPreference = $prevEAP

    Log "===== Ciclo concluido ====="
} catch {
    Log "ERRO: $_"
    exit 1
}
