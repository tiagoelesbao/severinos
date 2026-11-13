# Atualiza o snapshot dos sorteios ativos que alimenta a página /catalogo da
# pressel. Roda via Windows Task Scheduler a cada 5 minutos.
#
# Por que LOCAL e não na Vercel (achado 2026-10-11, causa raiz provada):
# o Cloudflare do cliente barra IP de datacenter — a serverless function
# tomava 403 com página de desafio do Cloudflare mesmo enviando headers
# completos de navegador. Do IP residencial daqui, o login devolve 200.
#
# Intervalo de 5 min: sorteio encerra rápido (85 `active` viraram `done` ao
# longo de um dia, ~7 ativos por vez), e catálogo mostrando sorteio morto
# manda clique pago para "Erro 404 - Campanha não encontrada".
$ErrorActionPreference = "Stop"

# Fix de encoding (mesmo motivo documentado em capi_realtime.ps1): sem isto
# o PowerShell 5.1 decodifica o stdout capturado do Python com o codepage
# OEM do console, não UTF-8, e os acentos/emojis chegam ao log como lixo.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

$scriptDir = $PSScriptRoot
$logFile = Join-Path $scriptDir "snapshot_sorteios.log"

function Log($msg) {
    "$(Get-Date -Format o) $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

try {
    Set-Location $scriptDir
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $saida = & python snapshot_sorteios.py 2>&1
    $saida | Out-File -Append -FilePath $logFile -Encoding utf8

    $ErrorActionPreference = $prevEAP
} catch {
    Log "ERRO: $_"
    exit 1
}
