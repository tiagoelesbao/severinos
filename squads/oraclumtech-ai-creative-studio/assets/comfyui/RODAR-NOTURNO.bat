@echo off
REM ===========================================================================
REM  RODAR-NOTURNO.bat  —  fila da madrugada do squad Oraclum
REM
REM  Clique duas vezes antes de dormir. Ele:
REM    1. espera o ComfyUI responder
REM    2. limpa fila residual e descarrega modelo preso
REM    3. roda a fila escolhida, UM JOB POR VEZ
REM    4. grava tudo em _noturno-<data>.log
REM    5. mostra o resumo no fim
REM
REM  O ComfyUI precisa estar ABERTO. Este script nao o inicia de proposito:
REM  subir o ComfyUI daqui esconderia erro de inicializacao no log de outro processo.
REM
REM  USO
REM    RODAR-NOTURNO.bat                    12 takes do Airbnb, preset validado
REM    RODAR-NOTURNO.bat airbnb- nitido     idem, preset nitido
REM    RODAR-NOTURNO.bat nar-               as narracoes
REM    RODAR-NOTURNO.bat fid-               a modelagem de fidelidade
REM
REM  OS PRESETS DE VIDEO
REM    validado  upscale 4x  RIFE x2  32 fps  20 passos  gera 720x960
REM              o seu fluxo, com o RIFE em bfloat16 — mesma imagem, metade da
REM              memoria, e e o que faz 65 quadros caberem em 16 GB.
REM              NAO troque por float16: em 31/08 ele derrubou o ComfyUI inteiro
REM              com access violation (crash nativo, nao OOM). Mesma conta de
REM              memoria; o que muda e a faixa de expoente.
REM    nitido    upscale 2x  RIFE x2  32 fps  30 passos  gera 832x1120
REM              menos ampliacao, mais geracao. Pixel de verdade em vez de
REM              interpolado, e mais passos = melhor coerencia de movimento
REM    suave     upscale 4x  RIFE x4  64 fps  20 passos  gera 720x960
REM              movimento mais liquido; dobra a memoria do RIFE
REM
REM  A REGRA DE FPS: o Wan entrega 16 fps. fps = 16 x multiplicador do RIFE.
REM  x2 -> 32 (validado)   x4 -> 64.  Usar 32 com x4 nao da erro: da camera lenta.
REM ===========================================================================
setlocal

cd /d "%~dp0"

set FILTRO=%1
if "%FILTRO%"=="" set FILTRO=airbnb-

set PRESET_WAN=%2
if "%PRESET_WAN%"=="" set PRESET_WAN=validado

for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set HOJE=%%c%%b%%a
set LOG=_noturno-%HOJE%.log

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo  INICIO %date% %time%  ^|  filtro: %FILTRO%  ^|  preset: %PRESET_WAN% >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo  Fila noturna Oraclum
echo    filtro: %FILTRO%
echo    preset: %PRESET_WAN%
echo    log:    %LOG%
echo.

REM ── espera o ComfyUI responder, ate 5 min ─────────────────────────────────
echo  Procurando o ComfyUI em 127.0.0.1:8188 ...
set /a TENTATIVA=0
:ESPERA
curl -s -m 5 http://127.0.0.1:8188/system_stats >nul 2>&1
if %errorlevel%==0 goto ACHOU
set /a TENTATIVA+=1
if %TENTATIVA% GEQ 30 goto SEM_COMFY
timeout /t 10 /nobreak >nul
goto ESPERA

:SEM_COMFY
echo.
echo  ERRO: o ComfyUI nao respondeu em 5 minutos.
echo  Abra o ComfyUI e rode este script de novo.
echo  ERRO: ComfyUI ausente >> "%LOG%"
echo.
pause
exit /b 1

:ACHOU
echo  ComfyUI respondeu.

REM ── fila residual e modelo preso atrasam a noite inteira ─────────────────
curl -s -X POST -m 10 -H "Content-Type: application/json" -d "{\"clear\":true}" http://127.0.0.1:8188/queue >nul 2>&1
curl -s -X POST -m 30 -H "Content-Type: application/json" -d "{\"unload_models\":true,\"free_memory\":true}" http://127.0.0.1:8188/free >nul 2>&1
echo  Fila limpa e modelos descarregados. Comecando.
echo.

REM ── a fila. run_batch.py roda UM JOB POR VEZ. Uma falha isolada nao para
REM    a noite; TRES SEGUIDAS param, porque ai a causa e do ambiente (memoria,
REM    modelo ausente) e insistir gastaria a madrugada inteira sem produzir.
REM    Interromper pelo /interrupt tambem para a fila — e sempre intencional.
python run_batch.py --only %FILTRO% >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo  FIM %date% %time% >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo  Terminou. Resumo:
echo.
findstr /C:"ok em" /C:"FALHOU" /C:"erro em" /C:"concluido" "%LOG%"
echo.
echo  Log completo: %~dp0%LOG%
echo.
pause
endlocal
