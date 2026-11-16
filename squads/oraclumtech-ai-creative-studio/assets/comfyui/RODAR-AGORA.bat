@echo off
REM ===========================================================================
REM  RODAR-AGORA.bat  -  a fila do dia 06/09, na ordem do caminho critico
REM
REM  ORDEM, E O PORQUE DELA
REM    1. NARRACAO do episodio de futebol   -> o video sai HOJE; e o unico item
REM                                            com prazo. Vai primeiro.
REM    2. CORRECAO das imagens do curto     -> leve, ~5 min, destrava a inspecao
REM    3. PONTE output -> input             -> sem ela o take nao acha a imagem
REM    4. UM take de video (c01, preset maximo, ~90 min)
REM
REM  So UM take de propósito: o founder sai e volta no meio. Um take basta para
REM  medir o tempo real do preset `maximo` -- que ate agora e projecao, nao
REM  medicao. Com esse numero na mao, a fila da proxima madrugada e dimensionada
REM  de verdade em vez de estimada (foi a estimativa que perdeu a noite de 05/09).
REM
REM  O take escolhido e o c01 porque e o plano do HOOK -- o unico em que o
REM  movimento realmente se paga.
REM ===========================================================================
setlocal
cd /d "%~dp0"

set REPO=%~dp0..\..\..\..
for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set HOJE=%%c%%b%%a
set LOG=_dia-%HOJE%.log

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo  INICIO %date% %time% >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo  Fila do dia - 06/09
echo    log: %LOG%
echo.

curl -s -m 5 http://127.0.0.1:8188/system_stats >nul 2>&1
if errorlevel 1 (
    echo  ERRO: ComfyUI nao respondeu. Abra e rode de novo.
    echo  ERRO: ComfyUI ausente >> "%LOG%"
    pause
    exit /b 1
)
echo  ComfyUI respondeu.
curl -s -X POST -m 30 -H "Content-Type: application/json" -d "{\"unload_models\":true,\"free_memory\":true}" http://127.0.0.1:8188/free >nul 2>&1
echo.

REM -- 1. NARRACAO DO FUTEBOL (caminho critico) -----------------------------
echo  [1/3] Narracao do episodio de futebol...
echo ---------- 1. NARRACAO FUTEBOL  %time% ---------- >> "%LOG%"
pushd "%REPO%\apps\canal-futebol"
python -X utf8 narra_comfy.py 2026-09-06-arbitragem-flu-vasco >> "%~dp0%LOG%" 2>&1
popd
echo      feito.

REM -- 2. CORRECAO DAS IMAGENS DO CURTO -------------------------------------
echo  [2/3] Regerando c04 (3 sementes) e c03-s3 com os prompts corrigidos...
echo ---------- 2. CORRECAO IMAGENS  %time% ---------- >> "%LOG%"
python run_batch.py --only curto-la1p1-c04,curto-la1p1-c03-de-pe-templo-s3 >> "%LOG%" 2>&1
echo      feito.

REM -- 3. PONTE -------------------------------------------------------------
echo  [3/3] Copiando imagens para o input...
echo ---------- 3. PONTE  %time% ---------- >> "%LOG%"
python copia_para_input.py curtos/la1-p1/cru curtos-la1p1 >> "%LOG%" 2>&1
echo      feito.

REM -- 4. (REMOVIDO) --------------------------------------------------------
REM  O take de I2V saiu daqui em 06/09, por decisao do founder: os videos do dia
REM  passam a ser gerados FORA, em ferramentas com credito (BytePlus/Seedance,
REM  TikTok Symphony). O ComfyUI local fica com o que ele faz melhor e barato --
REM  imagem e narracao -- e nao gasta 90 min de GPU por take.
REM
REM  O kit para a geracao externa (imagens + prompts de movimento prontos para
REM  colar) sai em: outputs/curtos/la1-p1/kit-i2v-externo/

echo. >> "%LOG%"
echo  FIM %date% %time% >> "%LOG%"

echo.
echo  Terminou. Resumo:
echo.
findstr /C:"ok em" /C:"FALHOU" /C:"TIMEOUT" /C:"concluido" /C:"copia]" /C:"[mem]" "%LOG%"
echo.
echo  Log completo: %~dp0%LOG%
echo.
pause
endlocal
