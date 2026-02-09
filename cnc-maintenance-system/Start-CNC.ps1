# =============================================================================
# CNC Maintenance System - Avvio PowerShell
# =============================================================================
# Esegui con: Right-click -> "Esegui con PowerShell"
# Oppure: powershell -ExecutionPolicy Bypass -File Start-CNC.ps1
# =============================================================================

$Host.UI.RawUI.WindowTitle = "CNC Maintenance System"

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "       CNC MAINTENANCE SYSTEM - AVVIO AUTOMATICO" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

# Funzione per controllare se Docker e' in esecuzione
function Test-DockerRunning {
    try {
        $null = docker info 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Step 1: Controlla Docker
Write-Host "[1/5] Controllo Docker Desktop..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "      Docker non in esecuzione. Avvio Docker Desktop..." -ForegroundColor Yellow

    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
    } else {
        Write-Host "[ERRORE] Docker Desktop non trovato!" -ForegroundColor Red
        Write-Host "Installa Docker Desktop da: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        Read-Host "Premi INVIO per uscire"
        exit 1
    }

    Write-Host "      Attesa avvio Docker (max 60 secondi)..." -ForegroundColor Yellow
    $timeout = 60
    $elapsed = 0
    while (-not (Test-DockerRunning) -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "      ... $elapsed secondi" -ForegroundColor Gray
    }

    if (-not (Test-DockerRunning)) {
        Write-Host "[ERRORE] Docker non si e' avviato in tempo." -ForegroundColor Red
        Read-Host "Premi INVIO per uscire"
        exit 1
    }
}
Write-Host "      [OK] Docker Desktop in esecuzione" -ForegroundColor Green

# Step 2: Vai nella directory del progetto
Write-Host ""
Write-Host "[2/5] Accesso directory progetto..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Write-Host "      Directory: $scriptDir" -ForegroundColor Gray

# Step 3: Verifica file .env
Write-Host ""
Write-Host "[3/5] Verifica configurazione..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "      File .env non trovato. Creazione da template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "      [ATTENZIONE] Modifica il file .env con le tue configurazioni!" -ForegroundColor Yellow
    } else {
        # Crea .env base
        @"
# Database
DB_NAME=cnc_maintenance
DB_USER=postgres
DB_PASSWORD=postgres123

# JWT
JWT_SECRET=cambia-questa-chiave-segreta-molto-lunga-e-sicura-123456

# Cloudflare Tunnel Token (ottienilo da Cloudflare Dashboard)
CLOUDFLARE_TUNNEL_TOKEN=

# URL pubblico (dopo setup Cloudflare)
PUBLIC_URL=https://cnc.tuodominio.com
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "      [ATTENZIONE] File .env creato. Configura CLOUDFLARE_TUNNEL_TOKEN!" -ForegroundColor Yellow
    }
}
Write-Host "      [OK] Configurazione presente" -ForegroundColor Green

# Step 4: Avvia i container
Write-Host ""
Write-Host "[4/5] Avvio servizi Docker..." -ForegroundColor Yellow
Write-Host "      Questo potrebbe richiedere qualche minuto..." -ForegroundColor Gray

# Prova prima docker compose (nuovo), poi docker-compose (vecchio)
$composeCmd = "docker compose"
$result = & docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    $composeCmd = "docker-compose"
}

# Avvia
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $composeCmd -f docker-compose.cloudflare.yml up -d --build" -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) {
    Write-Host "[ERRORE] Errore durante l'avvio dei servizi." -ForegroundColor Red
    Write-Host "Esegui '$composeCmd logs' per vedere gli errori." -ForegroundColor Yellow
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Step 5: Attendi e verifica
Write-Host ""
Write-Host "[5/5] Verifica servizi..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Controlla stato container
$containers = docker ps --format "{{.Names}}: {{.Status}}" | Where-Object { $_ -match "cnc" }
Write-Host ""
Write-Host "  Stato container:" -ForegroundColor Cyan
$containers | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }

# Successo!
Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Green
Write-Host "       SISTEMA AVVIATO CON SUCCESSO!" -ForegroundColor Green
Write-Host "  ======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Accesso locale:   http://localhost:3000" -ForegroundColor White
Write-Host "  Accesso pubblico: Controlla il tuo dominio Cloudflare" -ForegroundColor White
Write-Host ""
Write-Host "  Comandi utili:" -ForegroundColor Cyan
Write-Host "    - Vedere log:    $composeCmd logs -f" -ForegroundColor Gray
Write-Host "    - Fermare tutto: $composeCmd down" -ForegroundColor Gray
Write-Host "    - Riavviare:     $composeCmd restart" -ForegroundColor Gray
Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Green
Write-Host ""

# Apri browser
Write-Host "Apertura browser..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Read-Host "Premi INVIO per chiudere questa finestra"
