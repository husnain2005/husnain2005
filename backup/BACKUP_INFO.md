# Backup - CNC Maintenance System

**Data backup:** 2026-03-27
**Branch:** main
**Autore:** Husnain (husnain2005)

## Contenuto del backup

| Cartella/File | Descrizione |
|---|---|
| `cnc-maintenance-system/` | App web CNC completa (backend, frontend, docker, nginx, scripts) |
| `claude-memory/` | Memoria Claude (profilo utente, progetto, preferenze lingua) |
| `setup-new-pc.sh` | Script per configurare un nuovo PC da zero |
| `index.html` / `script.js` / `styles.css` | Pagina statica del repo |

## Cosa NON è incluso (escluso dal backup)

- `node_modules/` — da reinstallare con `npm install`
- `.env` — contiene secrets, va ricreato manualmente
- `backend/uploads/` — file generati a runtime
- `frontend/dist/` — build generata, si rigenera con `npm run build`

## Stack tecnologico

- **Backend:** Node.js / Express
- **Frontend:** React / Vite (PWA)
- **Database:** PostgreSQL
- **Infrastruttura:** Docker Compose, Nginx
- **Deploy:** Cloudflare Tunnel

## Come ripristinare

```bash
# Clona il repo
git clone git@github.com:husnain2005/husnain2005.git
cd husnain2005

# Setup automatico (Claude Code + dipendenze + memoria)
bash setup-new-pc.sh

# Crea .env con le credenziali
cp cnc-maintenance-system/.env.example cnc-maintenance-system/.env
nano cnc-maintenance-system/.env

# Avvia l'app
cd cnc-maintenance-system && bash deploy.sh
```
