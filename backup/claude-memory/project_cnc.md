---
name: project_cnc
description: Dettagli del progetto CNC maintenance system
type: project
---

Progetto: CNC Maintenance System — app web full-stack per gestione manutenzione macchine CNC.

**Stack:** Node.js/Express backend, React/Vite frontend, Docker Compose, PostgreSQL, Nginx, PWA.

**Repository GitHub:** git@github.com:husnain2005/husnain2005.git (branch: main)

**Struttura:** Il progetto è in `/home/usnainukhtar/husnain2005/cnc-maintenance-system/` che è una sottodirectory del repo GitHub.

**Deploy:** Usa Cloudflare Tunnel. Script `deploy.sh` e `rebuild_frontend.sh` presenti.

**Why:** L'utente usa più PC e sincronizza tutto via `git push/pull` su GitHub.

**How to apply:** Prima di pushare, verificare che `.env` e `node_modules/` siano nel `.gitignore`. Il file `.env` NON va mai committato — contiene secrets.
