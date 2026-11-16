# Checa o sinal "Sincronizar agora" (botão na Visão Executiva) a cada 1min
# via Windows Task Scheduler. Barato quando não há pedido (1 GET); só roda o
# refresh pesado (bi_aggregator.py + vercel --prod) quando o founder clicou
# o botão. Log separado do refresh.log normal pra não poluir o ciclo de 15min.
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$logFile = Join-Path $scriptDir "check_sync.log"

function Log($msg) {
    "$(Get-Date -Format o) $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
}

try {
    $repoRoot = Resolve-Path (Join-Path $scriptDir "..\..\..")
    $script = Join-Path $repoRoot "services\Meta\imperio-premios\check_sync_signal.py"

    Set-Location $repoRoot
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & python $script 2>&1
    $ErrorActionPreference = $prevEAP

    # "nada pendente" é o caminho normal (roda a cada 1min) — só loga quando
    # há sync de verdade acontecendo, pra não inflar o arquivo de log.
    if ($output -notmatch "nada pendente") {
        Log "----"
        $output | Out-File -Append -FilePath $logFile -Encoding utf8
    }
} catch {
    Log "ERRO: $_"
    exit 1
}
