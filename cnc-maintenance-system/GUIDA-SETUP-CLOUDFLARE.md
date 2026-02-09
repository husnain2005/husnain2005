# Guida Setup - CNC Maintenance System con Cloudflare Tunnel

Questa guida ti permette di rendere il sistema accessibile da qualsiasi luogo tramite internet, in modo sicuro e gratuito.

## Prerequisiti

- Windows 10/11 con WSL2
- Docker Desktop installato
- Un account Cloudflare (gratuito)
- Un dominio (opzionale, puoi usare un sottodominio gratuito)

---

## PARTE 1: Configurazione Cloudflare (una volta sola)

### Step 1: Crea Account Cloudflare

1. Vai su https://dash.cloudflare.com/sign-up
2. Registrati con la tua email aziendale
3. Conferma l'email

### Step 2: Aggiungi un Dominio (opzionale)

Se hai già un dominio:
1. Clicca "Add a Site"
2. Inserisci il tuo dominio
3. Seleziona il piano "Free"
4. Segui le istruzioni per cambiare i nameserver

**Se non hai un dominio**, puoi usare un sottodominio gratuito tramite Cloudflare Tunnel.

### Step 3: Crea il Tunnel

1. Vai su https://one.dash.cloudflare.com/
2. Nel menu a sinistra, clicca **"Networks"** → **"Tunnels"**
3. Clicca **"Create a tunnel"**
4. Scegli **"Cloudflared"** come tipo
5. Dai un nome al tunnel (es. "cnc-maintenance")
6. Clicca **"Save tunnel"**

### Step 4: Copia il Token

Dopo aver creato il tunnel, vedrai una schermata con le istruzioni di installazione.

1. Cerca la sezione con il comando che contiene `--token`
2. Copia SOLO il token (la lunga stringa dopo `--token`)
3. Esempio: `eyJhIjoiNWY0ZjQ3MjE...` (molto lungo)

### Step 5: Configura il Routing

1. Nella pagina del tunnel, vai alla tab **"Public Hostname"**
2. Clicca **"Add a public hostname"**
3. Configura così:

   | Campo | Valore |
   |-------|--------|
   | Subdomain | `cnc` (o quello che preferisci) |
   | Domain | Seleziona il tuo dominio |
   | Type | `HTTP` |
   | URL | `nginx:80` |

4. Clicca **"Save hostname"**

---

## PARTE 2: Configurazione Locale

### Step 1: Configura il File .env

1. Apri la cartella del progetto
2. Copia `.env.cloudflare.example` come `.env`:
   ```
   copy .env.cloudflare.example .env
   ```

3. Modifica il file `.env` con Notepad:
   ```
   notepad .env
   ```

4. **IMPORTANTE**: Modifica questi valori:
   - `DB_PASSWORD` → Una password sicura
   - `JWT_SECRET` → Una stringa lunga e casuale
   - `CLOUDFLARE_TUNNEL_TOKEN` → Il token copiato da Cloudflare
   - `PUBLIC_URL` → Il tuo URL (es. `https://cnc.tuodominio.com`)

### Step 2: Primo Avvio

1. Fai doppio click su **`START-CNC.bat`**
2. Attendi che Docker si avvii
3. Attendi che tutti i servizi si avviino (2-5 minuti la prima volta)
4. Il browser si aprirà automaticamente

---

## PARTE 3: Utilizzo Quotidiano

### Avviare il Sistema

**Metodo 1 - Un Click:**
- Fai doppio click su `START-CNC.bat`

**Metodo 2 - PowerShell (più dettagliato):**
- Click destro su `Start-CNC.ps1` → "Esegui con PowerShell"

### Fermare il Sistema

Apri PowerShell/Terminale nella cartella del progetto:
```powershell
docker compose -f docker-compose.cloudflare.yml down
```

### Vedere i Log

```powershell
docker compose -f docker-compose.cloudflare.yml logs -f
```

### Riavviare un Servizio

```powershell
docker compose -f docker-compose.cloudflare.yml restart backend
```

---

## PARTE 4: Sicurezza

### Protezione Accesso (Opzionale ma Consigliato)

Puoi aggiungere un ulteriore livello di sicurezza con **Cloudflare Access**:

1. Vai su https://one.dash.cloudflare.com/
2. **"Access"** → **"Applications"**
3. **"Add an application"** → **"Self-hosted"**
4. Configura:
   - Application name: `CNC Maintenance`
   - Session duration: `24 hours`
   - Application domain: `cnc.tuodominio.com`
5. In **"Policies"**, crea una regola:
   - Policy name: `Solo Dipendenti`
   - Action: `Allow`
   - Include: `Emails ending in` → `@tuaazienda.com`
6. Salva

Ora solo le email della tua azienda potranno accedere!

### Backup Database

Per fare backup del database:
```powershell
docker exec cnc_maintenance_db pg_dump -U postgres cnc_maintenance > backup.sql
```

Per ripristinare:
```powershell
docker exec -i cnc_maintenance_db psql -U postgres cnc_maintenance < backup.sql
```

---

## Risoluzione Problemi

### Il tunnel non si connette

1. Verifica che il token sia corretto in `.env`
2. Controlla i log: `docker logs cnc_cloudflare_tunnel`
3. Assicurati che Docker abbia accesso a internet

### 502 Bad Gateway

1. Attendi qualche secondo, i servizi potrebbero essere ancora in avvio
2. Controlla i log del backend: `docker logs cnc_maintenance_backend`
3. Verifica che il database sia avviato: `docker logs cnc_maintenance_db`

### Errore "Token non valido"

1. Vai su Cloudflare Dashboard
2. Elimina il tunnel esistente
3. Crea un nuovo tunnel
4. Copia il nuovo token nel file `.env`
5. Riavvia: `docker compose -f docker-compose.cloudflare.yml up -d`

### Docker non si avvia

1. Apri Docker Desktop manualmente
2. Attendi che sia completamente avviato (icona verde)
3. Poi esegui lo script

---

## Contatti Supporto

Per problemi tecnici:
- Cloudflare Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Docker Docs: https://docs.docker.com/

---

*Guida creata per CNC Maintenance System v1.0*
