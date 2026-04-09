@echo off
:: ============================================================
:: CNC Maintenance System - Avvio automatico container Docker
:: Mettere questo file nella cartella Startup di Windows:
::   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
:: ============================================================

:: Avvia i container in background tramite WSL (nessuna finestra)
wsl -d Ubuntu -- bash -c "cd ~/husnain2005/cnc-maintenance-system && docker compose up -d > /tmp/cnc-startup.log 2>&1"
