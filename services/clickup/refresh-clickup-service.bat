@echo off
echo ======================================================
echo 🪨 Gino Wickman - ClickUp Service Refresh
echo SINCRONIZANDO COM O ORACLUM...
echo ======================================================

:: Navega para o diretório do script caso seja executado de fora
cd /d "%~dp0"

:: Verifica se o node_modules existe, senão instala
if not exist "node_modules\" (
    echo [!] Dependências não encontradas. Instalando...
    npm install
)

:: 1. Extrai Dados do ClickUp
echo [1/2] Extraindo metadados do ClickUp...
node extract-data.js

if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO NA EXTRAÇÃO. Verifique sua CLICKUP_API_KEY no .env
    pause
    exit /b %ERRORLEVEL%
)

:: 2. Sincroniza Mapeamentos
echo [2/2] Sincronizando mapping.js e hierarchy.json...
node sync-mappings.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ REFRESH GERAL CONCLUÍDO COM SUCESSO!
    echo Todos os mapeamentos estão atualizados.
) else (
    echo.
    echo ❌ ERRO NA SINCRONIZAÇÃO DOS MAPEAMENTOS.
)

echo ======================================================
pause
