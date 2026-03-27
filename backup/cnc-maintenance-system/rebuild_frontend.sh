#!/bin/bash
# Rebuild e deploy del frontend senza problemi di cache Docker
set -e

FRONTEND_DIR="$(dirname "$0")/frontend"
CONTAINER="cnc_maintenance_frontend"

echo "--- Build frontend ---"
cd "$FRONTEND_DIR"

# Installa dipendenze se necessario
if [ ! -d "node_modules" ]; then
  npm ci
fi

npm run build

echo "--- Deploy nel container ---"
docker cp "$FRONTEND_DIR/dist/." "$CONTAINER:/usr/share/nginx/html/"
docker exec "$CONTAINER" nginx -s reload

echo "--- Fatto! Frontend aggiornato su localhost:3000 ---"
