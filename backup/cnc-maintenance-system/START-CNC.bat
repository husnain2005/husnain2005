@echo off
:: =============================================================================
:: CNC Maintenance System - Avvio con Un Click
:: =============================================================================
:: Questo script avvia automaticamente Docker Desktop e il sistema CNC
:: Basta fare doppio click su questo file per avviare tutto!
:: =============================================================================

title CNC Maintenance System - Avvio
color 0A

echo.
echo  ======================================================
echo       CNC MAINTENANCE SYSTEM - AVVIO AUTOMATICO
echo  ======================================================
echo.

:: Controlla se Docker Desktop e' in esecuzione
echo [1/4] Controllo Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo       Docker non in esecuzione. Avvio Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo       Attendi 30 secondi per l'avvio di Docker...
    timeout /t 30 /nobreak >nul

    :: Verifica nuovamente
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  [ERRORE] Docker Desktop non si e' avviato correttamente.
        echo  Per favore avvia Docker Desktop manualmente e riprova.
        pause
        exit /b 1
    )
)
echo       [OK] Docker Desktop in esecuzione

:: Vai nella directory del progetto
echo.
echo [2/4] Accesso alla directory del progetto...
cd /d "%~dp0"
echo       Directory: %cd%

:: Avvia i container con docker-compose
echo.
echo [3/4] Avvio servizi CNC Maintenance...
echo       Questo potrebbe richiedere qualche minuto al primo avvio...
echo.

:: Usa WSL per eseguire docker-compose
wsl -e bash -c "cd '$(wslpath '%cd%')' && docker compose -f docker-compose.cloudflare.yml up -d --build"

if %errorlevel% neq 0 (
    echo.
    echo  [ERRORE] Errore durante l'avvio dei servizi.
    echo  Controlla i log con: docker-compose logs
    pause
    exit /b 1
)

:: Attendi che i servizi siano pronti
echo.
echo [4/4] Attesa avvio servizi...
timeout /t 15 /nobreak >nul

:: Mostra stato
echo.
echo  ======================================================
echo       SISTEMA AVVIATO CON SUCCESSO!
echo  ======================================================
echo.
echo  Il sistema CNC Maintenance e' ora accessibile:
echo.
echo  - Locale:   http://localhost:3000
echo  - Pubblico: Controlla il tuo dominio Cloudflare
echo.
echo  Per vedere i log: docker-compose logs -f
echo  Per fermare:      docker-compose down
echo.
echo  ======================================================
echo.

:: Apri il browser
echo Apertura browser...
start http://localhost:3000

pause
