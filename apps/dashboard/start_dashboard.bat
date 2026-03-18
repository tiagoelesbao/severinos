@echo off
TITLE AIOS Dashboard Starter
cd /d "%~dp0"

echo [1/2] Iniciando Servidor de Monitoramento (Backend)...
:: Garante que o Bun esteja no PATH (conforme ambiente do usuario)
set "PATH=%PATH%;C:\Users\Pichau\.bun\bin"

:: Inicia o backend em uma nova janela
start "AIOS Monitor Server" cmd /k "cd server && bun run dev"

echo [2/2] Iniciando Dashboard UI (Frontend)...
:: Inicia o frontend em uma nova janela
start "AIOS Dashboard UI" cmd /k "npm run dev"

echo.
echo ===================================================
echo   Dashboard do AIOS em inicializacao!
echo.
echo   - Backend (Monitor): http://localhost:4001
echo   - Frontend (Kanban): http://localhost:3000
echo.
echo   Pode fechar esta janela principal se desejar.
echo ===================================================
echo.
pause
