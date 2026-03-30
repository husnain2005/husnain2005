# Guida Completa: Hosting Gestionale Aziendale
## Giuseppe Giana - Setup Hetzner + Coolify

---

## RIEPILOGO COSTI

| Voce | Costo | Frequenza |
|------|-------|-----------|
| Server Hetzner CX22 | 4,85 EUR | /mese |
| Backup automatici | 1,20 EUR | /mese |
| Dominio .it | ~10-12 EUR | /anno |
| Dominio .com | ~9-10 EUR | /anno |
| Coolify | GRATIS | - |
| PostgreSQL | GRATIS (incluso) | - |
| SSL/HTTPS | GRATIS (incluso) | - |

### TOTALE: ~7-8 EUR/mese + ~10 EUR/anno per dominio

---

## PASSO 1: Creare Account Hetzner

1. Vai su: https://www.hetzner.com/cloud
2. Clicca **"Sign Up"** o **"Register"**
3. Inserisci:
   - Email aziendale
   - Password sicura
4. Conferma l'email ricevuta
5. Inserisci i dati di fatturazione (carta di credito o PayPal)

**Tempo: 5 minuti**

---

## PASSO 2: Creare il Server

1. Accedi a Hetzner Cloud Console: https://console.hetzner.cloud
2. Clicca **"+ Create Server"**

3. **Seleziona Location (posizione server):**
   - Consigliato: **Falkenstein** o **Nuremberg** (Germania, vicino all'Italia)
   - Alternativa: **Helsinki** (Finlandia)

4. **Seleziona Image (sistema operativo):**
   - Scegli: **Ubuntu 24.04**

5. **Seleziona Type (tipo server):**
   - Scegli: **CX22** (Shared vCPU, x86)
   - Specifiche: 2 vCPU, 4 GB RAM, 40 GB SSD
   - Costo: **4,85 EUR/mese**

6. **Networking:**
   - Lascia le impostazioni predefinite
   - IPv4 e IPv6 saranno assegnati automaticamente

7. **SSH Keys (opzionale ma consigliato):**
   - Se hai una chiave SSH, aggiungila qui
   - Altrimenti, riceverai la password root via email

8. **Backups:**
   - **ATTIVA questa opzione!** (importante per dati aziendali)
   - Costo aggiuntivo: 1,20 EUR/mese (20% del costo server)

9. **Name:**
   - Dai un nome al server, es: `gestionale-giana`

10. Clicca **"Create & Buy Now"**

**Tempo: 5 minuti**
**Costo: 4,85 + 1,20 = 6,05 EUR/mese**

---

## PASSO 3: Annotare l'Indirizzo IP

1. Dopo la creazione, il server appare nella lista
2. Copia l'**indirizzo IP** (es: `168.119.xxx.xxx`)
3. Salvalo, ti servirà per:
   - Collegarti al server
   - Configurare il dominio

---

## PASSO 4: Collegarsi al Server

### Da Windows:
1. Scarica **PuTTY**: https://www.putty.org/
2. Apri PuTTY
3. In "Host Name" inserisci l'IP del server
4. Clicca **"Open"**
5. Username: `root`
6. Password: quella ricevuta via email (o la tua chiave SSH)

### Da Mac/Linux:
1. Apri il Terminale
2. Scrivi:
```bash
ssh root@TUO_INDIRIZZO_IP
```
3. Inserisci la password

**Tempo: 2 minuti**

---

## PASSO 5: Installare Coolify

Una volta collegato al server, esegui questi comandi:

### 5.1 Aggiornare il sistema:
```bash
apt update && apt upgrade -y
```
Attendi 1-2 minuti.

### 5.2 Installare Coolify:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```
Attendi 3-5 minuti. Vedrai molto testo scorrere, e' normale.

### 5.3 Al termine vedrai:
```
Coolify installed successfully!
Access it at: http://TUO_IP:8000
```

**Tempo: 10 minuti**

---

## PASSO 6: Configurare Coolify

1. Apri il browser
2. Vai su: `http://TUO_IP:8000`
3. Crea l'account amministratore:
   - Email
   - Password (FORTE! Min 12 caratteri)
4. Segui il wizard di configurazione iniziale
5. Coolify e' pronto!

**Tempo: 5 minuti**

---

## PASSO 7: Installare PostgreSQL

1. Nel pannello Coolify, vai su **"Resources"**
2. Clicca **"+ New"**
3. Seleziona **"Database"**
4. Scegli **"PostgreSQL"**
5. Configura:
   - Name: `gestionale-db`
   - Database Name: `gestionale`
   - Username: `giana_admin` (esempio)
   - Password: **genera una password forte**
6. Clicca **"Start"**

**Salva queste credenziali! Ti serviranno per collegare l'applicazione.**

**Tempo: 5 minuti**

---

## PASSO 8: Comprare il Dominio (Cloudflare)

1. Vai su: https://www.cloudflare.com
2. Crea un account (gratuito)
3. Vai su **"Domain Registration"** > **"Register Domains"**
4. Cerca il dominio desiderato:
   - Es: `giuseppegiana.it` o `gestionegiana.it`
5. Aggiungi al carrello e completa l'acquisto

**Costo dominio .it: ~10-12 EUR/anno**
**Costo dominio .com: ~9-10 EUR/anno**

**Tempo: 10 minuti**

---

## PASSO 9: Collegare il Dominio al Server

### In Cloudflare:

1. Vai su **"DNS"** per il tuo dominio
2. Clicca **"+ Add Record"**
3. Aggiungi questi record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | TUO_IP_SERVER | OFF (DNS only) |
| A | www | TUO_IP_SERVER | OFF (DNS only) |
| A | gestionale | TUO_IP_SERVER | OFF (DNS only) |

4. Salva

**Nota:** Disattiva il proxy (nuvola arancione) inizialmente. Potrai attivarlo dopo.

**Tempo: 5 minuti**
**Propagazione DNS: fino a 24 ore (di solito 10-30 minuti)**

---

## PASSO 10: Configurare SSL (HTTPS) in Coolify

1. In Coolify, vai su **"Settings"** > **"SSL"**
2. Abilita **"Let's Encrypt"**
3. Inserisci un'email per le notifiche SSL
4. Salva

Ora il tuo sito avra' il lucchetto verde (HTTPS).

**Tempo: 5 minuti**

---

## PASSO 11: Deploy della tua Applicazione

1. In Coolify, vai su **"Resources"** > **"+ New"**
2. Seleziona **"Application"**
3. Scegli la fonte:
   - **GitHub**: collega il tuo repository
   - **GitLab**: collega il tuo repository
   - **Docker**: se hai un'immagine Docker
4. Configura:
   - Branch: `main` o `master`
   - Build command (se necessario)
   - Port dell'applicazione
5. Aggiungi le **variabili d'ambiente**:
   ```
   DATABASE_URL=postgresql://giana_admin:PASSWORD@localhost:5432/gestionale
   ```
6. Clicca **"Deploy"**

**Tempo: 10-20 minuti (dipende dall'applicazione)**

---

## PASSO 12: Configurare il Dominio nell'Applicazione

1. In Coolify, vai sull'applicazione deployata
2. Vai su **"Settings"** > **"Domains"**
3. Aggiungi:
   - `gestionale.tuodominio.it`
   - oppure `www.tuodominio.it`
4. Abilita **"Generate SSL"**
5. Salva

**Tempo: 5 minuti**

---

## RIEPILOGO FINALE COSTI

### Costi Mensili:
| Voce | Costo |
|------|-------|
| Server Hetzner CX22 | 4,85 EUR |
| Backup automatici | 1,20 EUR |
| **TOTALE MENSILE** | **6,05 EUR** |

### Costi Annuali:
| Voce | Costo |
|------|-------|
| Costi mensili x 12 | 72,60 EUR |
| Dominio .it | ~10 EUR |
| **TOTALE ANNUALE** | **~83 EUR** |

### Gratuito (incluso):
- Coolify (pannello di gestione)
- PostgreSQL (database)
- SSL/HTTPS (certificato)
- Backup giornalieri (con opzione attivata)
- Banda illimitata (20 TB inclusi)

---

## MANUTENZIONE MENSILE

### Ogni mese (5 minuti):
1. Accedi a Coolify
2. Controlla che tutto funzioni
3. Verifica i backup

### Ogni 3 mesi (15 minuti):
1. Collegati al server via SSH
2. Aggiorna il sistema:
```bash
apt update && apt upgrade -y
```
3. Aggiorna Coolify (se disponibile)

---

## SUPPORTO E RISORSE

- **Hetzner Docs**: https://docs.hetzner.com
- **Coolify Docs**: https://coolify.io/docs
- **Coolify Discord**: https://discord.gg/coolify
- **Cloudflare Docs**: https://developers.cloudflare.com

---

## CHECKLIST FINALE

- [ ] Account Hetzner creato
- [ ] Server CX22 creato con Ubuntu 24.04
- [ ] Backup attivati
- [ ] IP del server annotato
- [ ] Coolify installato
- [ ] PostgreSQL configurato
- [ ] Dominio acquistato su Cloudflare
- [ ] DNS configurato
- [ ] SSL attivato
- [ ] Applicazione deployata
- [ ] Dominio collegato all'applicazione
- [ ] Test accesso da rete esterna
- [ ] Credenziali salvate in posto sicuro

---

## NOTE DI SICUREZZA

1. **Password**: Usa password di almeno 16 caratteri con maiuscole, minuscole, numeri e simboli
2. **Backup**: Verifica periodicamente che i backup funzionino
3. **Accesso**: Limita chi ha accesso al pannello Coolify
4. **Aggiornamenti**: Mantieni il sistema aggiornato
5. **Firewall**: Coolify configura automaticamente il firewall base

---

Documento creato per Giuseppe Giana S.r.l.
Data: Marzo 2026
