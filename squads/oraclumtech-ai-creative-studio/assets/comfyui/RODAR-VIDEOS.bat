@echo off
REM ===========================================================================
REM  RODAR-VIDEOS.bat  -  so os takes I2V do curto, acionado por voce
REM
REM  PESADO. Nao rode com o PC em uso: cada take ocupa a GPU inteira por ~57 min
REM  (preset validado) ou ~90 min (preset maximo).
REM
REM  PRE-REQUISITOS  (o script confere e para se faltar algo)
REM    1. ComfyUI aberto
REM    2. as 12 imagens ja no input/curtos-la1p1  (RODAR-NOTURNO-CURTOS ou
REM       CORRIGIR-IMAGENS deixam elas la)
REM
REM  A INTERCALACAO E PAREADA, de proposito
REM    rodada 1:  c01 maximo | c02 validado | c03 maximo | c04 validado
REM    rodada 2:  c01 validado | c02 maximo | c03 validado | c04 maximo
REM    Cada plano sai NOS DOIS presets. Comparar preset A no plano 1 contra
REM    preset B no plano 2 misturaria preset com assunto; assim a unica coisa
REM    que muda entre os dois arquivos e o preset.
REM
REM  ORCAMENTO
REM    rodada 1  ~2 x 90 + 2 x 57 = ~4h54
REM    rodada 2  ~4h54   -> as duas somam ~9h48
REM    rodada 3  so cobertura, quase certamente nao entra. Tudo bem: e bonus.
REM
REM  O timeout por job e 120 min (era 75 e abortava os takes de 30 passos, que
REM  foi o que perdeu a noite de 05/09). No timeout o script agora chama
REM  /interrupt e libera memoria ANTES do proximo -- sem isso o take abortado
REM  seguia vivo no servidor e dois Wan nao cabem em 16 GB.
REM
REM  USO
REM    RODAR-VIDEOS.bat              rodadas 1 e 2 (a comparacao pareada)
REM    RODAR-VIDEOS.bat r1           so a rodada 1
REM    RODAR-VIDEOS.bat todas        as tres rodadas
REM ===========================================================================
setlocal
cd /d "%~dp0"

set ESCOPO=%1
if "%ESCOPO%"=="" set ESCOPO=r1r2

if /i "%ESCOPO%"=="r1"    set FILTRO=curto-la1p1-i2v-r1
if /i "%ESCOPO%"=="r1r2"  set FILTRO=curto-la1p1-i2v-r1,curto-la1p1-i2v-r2
if /i "%ESCOPO%"=="todas" set FILTRO=curto-la1p1-i2v

for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set HOJE=%%c%%b%%a
set LOG=_videos-%HOJE%.log

echo.
echo  Takes I2V - curto LA1-P1
echo    escopo: %ESCOPO%
echo    log:    %LOG%
echo.

REM -- pre-requisito 1: ComfyUI ---------------------------------------------
echo  Procurando o ComfyUI em 127.0.0.1:8188 ...
curl -s -m 5 http://127.0.0.1:8188/system_stats >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERRO: o ComfyUI nao respondeu. Abra o ComfyUI e rode de novo.
    echo.
    pause
    exit /b 1
)
echo  ComfyUI respondeu.

REM -- pre-requisito 2: as imagens no input ---------------------------------
set IN=C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input\curtos-la1p1
if not exist "%IN%\c01-busto-perfil-s1.png" (
    echo.
    echo  ERRO: nao achei as imagens em %IN%
    echo  Rode CORRIGIR-IMAGENS.bat antes - ele gera e ja copia para o input.
    echo.
    pause
    exit /b 1
)
echo  Imagens encontradas no input.
echo.

REM -- fila limpa antes de comecar ------------------------------------------
curl -s -X POST -m 10 -H "Content-Type: application/json" -d "{\"clear\":true}" http://127.0.0.1:8188/queue >nul 2>&1
curl -s -X POST -m 30 -H "Content-Type: application/json" -d "{\"unload_models\":true,\"free_memory\":true}" http://127.0.0.1:8188/free >nul 2>&1
echo  Fila limpa e modelos descarregados. Comecando.
echo.

echo ============================================================ >> "%LOG%"
echo  VIDEOS %date% %time%  ^|  escopo: %ESCOPO% >> "%LOG%"
echo ============================================================ >> "%LOG%"

python run_batch.py --only %FILTRO% >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo  FIM %date% %time% >> "%LOG%"

echo.
echo  Terminou. Resumo:
echo.
findstr /C:"ok em" /C:"FALHOU" /C:"TIMEOUT" /C:"concluido" /C:"[mem]" "%LOG%"
echo.
echo  Os takes ficam em output\curtos\la1-p1\takes\
echo  Compare os pares: cada plano tem uma versao `maximo` e uma `validado`.
echo.
pause
endlocal
