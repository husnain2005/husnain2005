# =============================================================
# CNC Maintenance System - Avvio automatico
# =============================================================

# 1. Avvia i container Docker in background
Start-Process -FilePath "wsl" `
  -ArgumentList "-d", "Ubuntu", "--", "bash", "-c", `
    "cd ~/husnain2005/cnc-maintenance-system && docker compose up -d > /tmp/cnc-startup.log 2>&1" `
  -WindowStyle Hidden -Wait

# 2. Aspetta che il frontend risponda (max 120 secondi)
$maxSeconds = 120
$elapsed    = 0

while ($elapsed -lt $maxSeconds) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { break }
    } catch { }
    Start-Sleep -Seconds 2
    $elapsed += 2
}

# 3. Apri l'app nel browser predefinito
Start-Process "http://localhost:3000"
