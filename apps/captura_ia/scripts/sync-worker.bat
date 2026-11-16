@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM  ORACLUM TECH - worker de sincronizacao Calendly -> ClickUp
REM
REM  Chama /api/sync-calendly a cada 5 minutos enquanto a maquina estiver ligada.
REM  Serve para o card sair de "oportunidade" e ir para "reuniao agendada"
REM  poucos minutos depois de o lead concluir no Calendly, em vez de esperar
REM  o cron diario da Vercel.
REM
REM  O card em si NAO depende deste worker: ele e criado na hora do clique.
REM
REM  Para rodar junto com o Windows:
REM    Win+R  ->  shell:startup  ->  criar atalho para este .bat
REM
REM  Alternativa mais robusta (sobrevive a fechar a janela sem querer):
REM    Agendador de Tarefas -> Nova Tarefa -> disparador "a cada 5 minutos"
REM    -> Acao: este .bat com o argumento  once
REM
REM  Sem acentos e com quebras CRLF de proposito: o cmd.exe quebra com os dois.
REM ============================================================================

set "APP_DIR=%~dp0.."
set "ENV_FILE=%APP_DIR%\.env.local"
set "LOG_FILE=%APP_DIR%\sync-worker.log"
set "ENDPOINT=https://oraclumtech-cofre.vercel.app/api/sync-calendly"
set "INTERVALO=300"

if not exist "%ENV_FILE%" goto sem_env

set "CRON_SECRET="
for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if /i "%%A"=="CRON_SECRET" set "CRON_SECRET=%%B"
)
set "CRON_SECRET=%CRON_SECRET:"=%"

if "%CRON_SECRET%"=="" goto sem_segredo

if /i "%~1"=="once" goto modo_once

echo ============================================================
echo   Worker de sincronizacao ORACLUM TECH
echo   Endpoint : %ENDPOINT%
echo   Intervalo: %INTERVALO% segundos
echo   Log      : %LOG_FILE%
echo.
echo   Deixe esta janela aberta. Ctrl+C encerra.
echo ============================================================
echo.

:loop
call :sincronizar
timeout /t %INTERVALO% /nobreak >nul
goto loop

REM ---------------------------------------------------------------------------
REM Execucao unica, usada pelo Agendador de Tarefas. O codigo de saida precisa
REM chegar ao Agendador para o historico distinguir sucesso de falha de rede.
:modo_once
call :sincronizar
exit /b %errorlevel%

REM ---------------------------------------------------------------------------
:sincronizar
set "AGORA=%date% %time:~0,8%"
set "RESP="

for /f "delims=" %%R in ('curl -s -m 60 -w "#%%{http_code}" -X POST "%ENDPOINT%" -H "Authorization: Bearer %CRON_SECRET%" 2^>nul') do set "RESP=%%R"

REM Sentinela na frente: quando o corpo vem vazio (falha de conexao),
REM o "#" inicial viraria separador e deslocaria os tokens.
set "PARSE=X!RESP!"
for /f "tokens=1,2 delims=#" %%X in ("!PARSE!") do (
  set "CORPO=%%X"
  set "CODIGO=%%Y"
)
set "CORPO=!CORPO:~1!"

REM curl com -w escreve o codigo mesmo quando a conexao falha (000),
REM entao toda falha chega aqui: nao existe caminho de resposta vazia.
if "!CODIGO!"=="200" (
  echo [!AGORA!] OK  !CORPO!
  echo !CORPO! | findstr /C:"\"movidos\":0,\"cancelados\":0" >nul
  if errorlevel 1 echo [!AGORA!] !CORPO!>>"%LOG_FILE%"
  exit /b 0
)

if "!CODIGO!"=="000" (
  echo [!AGORA!] SEM CONEXAO - rede fora ou endpoint indisponivel
  echo [!AGORA!] SEM CONEXAO>>"%LOG_FILE%"
  exit /b 1
)

echo [!AGORA!] HTTP !CODIGO!  !CORPO!
echo [!AGORA!] HTTP !CODIGO! !CORPO!>>"%LOG_FILE%"
exit /b 2

REM ---------------------------------------------------------------------------
:sem_env
echo [ERRO] Nao encontrei %ENV_FILE%
echo O segredo do endpoint fica nesse arquivo.
pause
exit /b 1

:sem_segredo
echo [ERRO] CRON_SECRET nao encontrado em %ENV_FILE%
pause
exit /b 1
