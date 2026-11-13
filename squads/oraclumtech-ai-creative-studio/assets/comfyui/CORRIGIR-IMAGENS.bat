@echo off
REM ===========================================================================
REM  CORRIGIR-IMAGENS.bat  -  regera so o que a inspecao reprovou
REM
REM  LEVE: da para rodar com o PC em uso. Cada imagem crua leva 10-80 s
REM  (medido em 05/09) e nao ha video aqui.
REM
REM  O QUE REGERA, E POR QUE
REM    c04 (3 sementes)  a figura saiu DENTRO da zona de legenda -- o prompt
REM                      pedia "low in the frame" e o modelo obedeceu. Nenhuma
REM                      das tres serve; nao ha o que escolher.
REM    c03 semente 3     "shaft of light from high above" virou um SPOT EMBUTIDO
REM                      no teto: luminaria moderna dentro de templo antigo.
REM                      Anacronismo nao se conserta com upscale.
REM
REM  As sementes sao as MESMAS (11, 2027, 90210). O que mudou foi o prompt, e e
REM  isso que se quer testar -- semente nova junto com prompt novo nao diria
REM  qual dos dois resolveu.
REM
REM  O ComfyUI escreve _00002_ ao lado do _00001_ em vez de sobrescrever. A
REM  ponte para o input pega sempre o de maior contador, entao o antigo fica
REM  como registro sem atrapalhar.
REM ===========================================================================
setlocal
cd /d "%~dp0"

for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set HOJE=%%c%%b%%a
set LOG=_correcao-imagens-%HOJE%.log

echo.
echo  Correcao de imagens - curto LA1-P1
echo    c04 (3 sementes) + c03 semente 3
echo    log: %LOG%
echo.

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
echo.

echo ============================================================ >> "%LOG%"
echo  CORRECAO %date% %time% >> "%LOG%"
echo ============================================================ >> "%LOG%"

python run_batch.py --only curto-la1p1-c04,curto-la1p1-c03-de-pe-templo-s3 >> "%LOG%" 2>&1

REM Reponte: as novas versoes precisam chegar ao input para o I2V usar.
echo  Atualizando o input do ComfyUI com as versoes novas...
python copia_para_input.py curtos/la1-p1/cru curtos-la1p1 >> "%LOG%" 2>&1

echo.
echo  Terminou. Resumo:
echo.
findstr /C:"ok em" /C:"FALHOU" /C:"TIMEOUT" /C:"copia]" "%LOG%"
echo.
echo  Agora INSPECIONE as novas antes de rodar os videos:
echo    - a figura do c04 esta ACIMA dos 22%% inferiores do quadro?
echo    - o c03-s3 continua com luminaria no teto?
echo.
pause
endlocal
