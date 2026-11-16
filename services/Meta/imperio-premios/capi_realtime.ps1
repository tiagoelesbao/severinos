# Envio quase-tempo-real da nossa própria CAPI (corrigida) — roda via Windows
# Task Scheduler a cada poucos minutos. Substitui a dependência do backend
# do cliente: nós mesmos coletamos os pedidos pagos recentes e enviamos
# Purchase pro Meta, com fbc OMITIDO quando obsoleto (capi_client.py —
# nunca manda clique velho como se fosse recente).
#
# Janela pequena (3 dias) e checkpoint próprio por OrderId (send_backlog.py)
# garantem que isso é seguro de rodar com frequência: nunca reenvia o mesmo
# pedido, e sorteios que saem da janela simplesmente param de ser tocados.
$ErrorActionPreference = "Stop"
# Fix de encoding (2026-10-08): sem isto, o PowerShell 5.1 decodifica o
# stdout capturado do python/vercel usando o codepage OEM do console
# (CP850/437 no Windows em pt-BR), não UTF-8 — os emojis/acentos que os
# scripts imprimem (✅, 🔐, etc.) chegam ao log como lixo tipo "Ô£à" /
# "­ƒöæ". -Encoding utf8 no Out-File só define como ESTE script grava o
# texto no arquivo; não corrige a decodificação feita ao capturar "2>&1"
# de um processo filho. Forçar as duas pontas (o que o Python emite e o
# que o Console usa pra interpretar bytes recebidos) resolve na causa.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
$scriptDir = $PSScriptRoot
$logFile = Join-Path $scriptDir "capi_realtime.log"
$dias = 3

function Log($msg) {
    "$(Get-Date -Format o) $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

try {
    Log "===== Iniciando ciclo CAPI quase-tempo-real ====="
    Set-Location $scriptDir

    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $collectOutput = & python collector.py $dias 2>&1
    $collectOutput | Out-File -Append -FilePath $logFile -Encoding utf8

    $sendOutput = & python send_backlog.py $dias 2>&1
    $sendOutput | Out-File -Append -FilePath $logFile -Encoding utf8

    $ErrorActionPreference = $prevEAP

    Log "===== Ciclo concluido ====="
} catch {
    Log "ERRO: $_"
    exit 1
}
