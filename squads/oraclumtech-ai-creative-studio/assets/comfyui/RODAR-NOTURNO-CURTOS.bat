@echo off
REM ===========================================================================
REM  RODAR-NOTURNO-CURTOS.bat  -  fila completa do curto 9:16, sem intervencao
REM
REM  Clique duas vezes antes de dormir. Ele faz as TRES fases sozinho:
REM
REM    FASE 1  narracoes (3) + imagens cruas (12)
REM    PONTE   copia as imagens de output/ para input/   <- sem isto o I2V falha
REM    FASE 2  upscale fallback (4) + takes I2V (12) + upscales bonus (8)
REM
REM  POR QUE A PONTE EXISTE
REM    O SaveImage grava em output/. O LoadImage, que alimenta o I2V e o upscale,
REM    so enxerga input/. Numa fila unica os dois lados nunca se encontram e a
REM    noite inteira falha em sequencia. Nao ha hook entre jobs no run_batch, por
REM    isso a ponte e um passo separado aqui no meio.
REM
REM  A ORDEM DA FASE 2 E POR RODADA, NAO POR PLANO
REM    Rodada 1 = uma semente de CADA plano. Se a noite acabar no meio, o curto
REM    ainda e montavel. Por plano, acabaria com tres versoes do plano 1 e
REM    nenhuma do resto.
REM
REM  ORCAMENTO DA NOITE  (janela tipica 23h -> 9h = ~590 min)
REM    narracoes            3 x  ~2 min =   ~6 min
REM    imagens cruas       12 x  ~2 min =  ~24 min
REM    upscale fallback     4 x  ~3 min =  ~12 min
REM    takes I2V           12 x 30-45   = 360-540 min   <- domina tudo
REM    upscales bonus       8 x  ~3 min =  ~24 min
REM    O timeout por job e 45 min (TIMEOUT_POR_JOB_S). Se os takes ficarem no
REM    teto, a fila NAO termina - e por isso que a ordem importa.
REM
REM  USO
REM    RODAR-NOTURNO-CURTOS.bat            preset `maximo` (4x, RIFE x2, 30 passos)
REM    RODAR-NOTURNO-CURTOS.bat validado   mais rapido, 20 passos
REM
REM  NAO usar `suave`: RIFE x4 dobra o pico para ~17 GB e a maquina tem 16.
REM ===========================================================================
setlocal

cd /d "%~dp0"

set PRESET_CURTO=%1
if "%PRESET_CURTO%"=="" set PRESET_CURTO=maximo

for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set HOJE=%%c%%b%%a
set LOG=_noturno-curtos-%HOJE%.log

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo  INICIO %date% %time%  ^|  preset I2V: %PRESET_CURTO% >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo  Fila noturna - CURTO 9:16 LA1-P1
echo    preset I2V: %PRESET_CURTO%
echo    log:        %LOG%
echo.

REM -- espera o ComfyUI responder, ate 5 min ---------------------------------
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
curl -s -X POST -m 10 -H "Content-Type: application/json" -d "{\"clear\":true}" http://127.0.0.1:8188/queue >nul 2>&1
curl -s -X POST -m 30 -H "Content-Type: application/json" -d "{\"unload_models\":true,\"free_memory\":true}" http://127.0.0.1:8188/free >nul 2>&1
echo  Fila limpa e modelos descarregados.
echo.

REM -- FASE 1: narracoes e imagens cruas -------------------------------------
echo  [FASE 1] narracoes + imagens cruas
echo. >> "%LOG%"
echo ---------- FASE 1: narracoes + imagens cruas  %time% ---------- >> "%LOG%"
python run_batch.py --only curto-la1p1-narracao,curto-la1p1-c0 >> "%LOG%" 2>&1

REM -- PONTE: output -> input ------------------------------------------------
echo  [PONTE]  copiando imagens para o input do ComfyUI
echo. >> "%LOG%"
echo ---------- PONTE: output para input  %time% ---------- >> "%LOG%"
python copia_para_input.py curtos/la1-p1/cru curtos-la1p1 >> "%LOG%" 2>&1
if errorlevel 1 (
    echo.
    echo  ERRO: a ponte falhou - a fase 1 nao produziu imagens.
    echo  Sem imagem no input, os takes de video nao tem o que animar.
    echo  A fase 2 fica de fora. Veja o log: %LOG%
    echo  ERRO: ponte falhou, fase 2 cancelada >> "%LOG%"
    goto FIM
)

REM -- FASE 2: upscale fallback, takes I2V, upscales bonus -------------------
echo  [FASE 2] upscale de fallback + takes I2V + upscales bonus
echo    (os takes dominam a noite: 30-45 min cada)
echo. >> "%LOG%"
echo ---------- FASE 2: upscale + I2V  %time% ---------- >> "%LOG%"
python run_batch.py --only curto-la1p1-upscale,curto-la1p1-i2v >> "%LOG%" 2>&1

:FIM
echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo  FIM %date% %time% >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo  Terminou. Resumo:
echo.
findstr /C:"ok em" /C:"FALHOU" /C:"TIMEOUT" /C:"concluido" /C:"copia]" "%LOG%"
echo.
echo  Log completo: %~dp0%LOG%
echo.
pause
endlocal
