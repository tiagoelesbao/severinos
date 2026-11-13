@echo off
echo ===================================================
echo INICIANDO FILA DE RENDERIZACAO - CANAL ESTOICO
echo ===================================================
echo.

echo [1/3] Renderizando LB1-aceitar...
node --experimental-strip-types scripts/export-local.ts canal-estoico LB1-aceitar
if %errorlevel% neq 0 (
    echo ERRO NO RENDER DO LA1! Abortando fila.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Renderizando LB2-paz-interior...
node --experimental-strip-types scripts/export-local.ts canal-estoico LB2-paz-interior
if %errorlevel% neq 0 (
    echo ERRO NO RENDER DO LA2! Abortando fila.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Renderizando LB3-primeiros-minutos...
node --experimental-strip-types scripts/export-local.ts canal-estoico LB3-primeiros-minutos
if %errorlevel% neq 0 (
    echo ERRO NO RENDER DO LA3! Abortando fila.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo RENDERIZACAO CONCLUIDA COM SUCESSO!
echo Os videos estao na pasta exports de cada criativo.
echo ===================================================
pause
