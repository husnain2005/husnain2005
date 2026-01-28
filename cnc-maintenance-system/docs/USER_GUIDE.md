# Guida Utente

Manuale completo per l'utilizzo del sistema CNC Maintenance Management.

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Accesso al Sistema](#2-accesso-al-sistema)
3. [Dashboard](#3-dashboard)
4. [Gestione Macchine](#4-gestione-macchine)
5. [Gestione Problematiche](#5-gestione-problematiche)
6. [Gestione Clienti](#6-gestione-clienti)
7. [Mappa Geografica](#7-mappa-geografica)
8. [Import da PDF](#8-import-da-pdf)
9. [Installazione App (PWA)](#9-installazione-app-pwa)
10. [Modalità Offline](#10-modalità-offline)
11. [Sicurezza Account (MFA)](#11-sicurezza-account-mfa)
12. [Gestione Utenti](#12-gestione-utenti)
13. [FAQ](#13-faq)

---

## 1. Introduzione

### 1.1 Cos'è CNC Maintenance

CNC Maintenance è un sistema gestionale progettato per:
- Tracciare macchine CNC installate presso i clienti
- Registrare e gestire problematiche e manutenzioni
- Visualizzare la posizione geografica delle macchine
- Importare dati storici da documenti PDF
- Mantenere uno storico completo di tutte le attività

### 1.2 Tipi di Utente

| Ruolo | Può fare |
|-------|----------|
| **Admin** | Tutto: gestione utenti, eliminazione, audit log |
| **Tecnico** | Creare/modificare macchine, problematiche, upload file |
| **Lettura** | Solo visualizzazione di tutti i dati |

### 1.3 Tipi di Macchine Gestite

**TORNI**
- Tradizionali: GGL, GGTRONIC
- Verticali: TORNIO_VERTICALE

**FORATRICI**
- Modello: GGB

**PICO**
- Modello unico PICO

---

## 2. Accesso al Sistema

### 2.1 Pagina di Login

1. Apri il browser e vai all'indirizzo del sistema (es. http://localhost:3000)
2. Vedrai la pagina di login

```
┌────────────────────────────────────────┐
│                                        │
│           🔧 CNC Maintenance           │
│      Sistema di gestione manutenzioni  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Username o User ID               │  │
│  │ [________________________]       │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Password                         │  │
│  │ [________________________] 👁    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │            ACCEDI                │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 2.2 Come Accedere

1. Inserisci il tuo **username**, **email**, o **User ID**
2. Inserisci la **password**
3. Clicca su **Accedi**

> 💡 **Suggerimento:** Puoi cliccare sull'icona 👁 per visualizzare la password mentre la digiti.

### 2.3 Credenziali Dimenticate

Se hai dimenticato la password, contatta l'amministratore del sistema.

### 2.4 Logout

1. Clicca sul tuo nome utente in basso a sinistra nella sidebar
2. Clicca su **Logout**

---

## 3. Dashboard

La Dashboard è la pagina principale che vedi dopo il login.

### 3.1 Panoramica

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                       │
│  Panoramica del sistema di manutenzione CNC                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    15    │  │    8     │  │    12    │  │    10    │        │
│  │ Macchine │  │ Aperte   │  │ Totali   │  │ Clienti  │        │
│  │  Totali  │  │          │  │ Issues   │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │   Stato Problematiche   │  │    Tipo Problematiche       │   │
│  │   ○ Aperte: 5           │  │    ⚡ Elettriche: 4         │   │
│  │   ○ In Lavorazione: 3   │  │    ⚙️ Meccaniche: 8         │   │
│  │   ○ Risolte: 2          │  │                             │   │
│  │   ○ Chiuse: 2           │  │                             │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   Problematiche Recenti                         Vedi tutte│  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Titolo          │ N.Commessa  │ Stato    │ Priorità│ Data │  │
│  │ Vibrazione...   │ COM-2024-001│ in_lav.  │ alta    │ 10/06│  │
│  │ Errore encoder  │ COM-2024-002│ aperta   │ critica │ 12/06│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ + Nuova     │  │ 🔍 Cerca    │  │ 📄 Importa PDF          │  │
│  │Problematica │  │  Macchina   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Elementi della Dashboard

**Statistiche in alto:**
- **Macchine Totali:** Numero di macchine registrate
- **Problematiche Aperte:** Problematiche ancora da risolvere
- **Totale Problematiche:** Tutte le problematiche registrate
- **Clienti:** Numero di clienti

**Grafici:**
- **Stato Problematiche:** Distribuzione per stato
- **Tipo Problematiche:** Elettriche vs Meccaniche

**Tabella Problematiche Recenti:**
- Ultimi 10 problemi registrati
- Clicca su un titolo per vedere i dettagli

**Azioni Rapide:**
- **Nuova Problematica:** Crea subito un nuovo problema
- **Cerca Macchina:** Vai alla ricerca macchine
- **Importa PDF:** Importa dati da documenti

---

## 4. Gestione Macchine

### 4.1 Lista Macchine

Vai a **Macchine** dal menu laterale.

```
┌─────────────────────────────────────────────────────────────────┐
│  Macchine                                                        │
│  Gestione e ricerca macchine CNC                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  ┌─────────┐           │
│  │ 🔍 Cerca per numero commessa...    │  │ Filtri  │           │
│  └────────────────────────────────────┘  └─────────┘           │
├─────────────────────────────────────────────────────────────────┤
│ N.Commessa    │Tipo/Modello │Taglia│Cliente     │Controllo│Prob│
│───────────────┼─────────────┼──────┼────────────┼─────────┼────│
│ COM-2024-001  │TORNIO GGTR. │ 2000 │Acciaierie  │FANUC    │ 2  │
│ COM-2024-002  │TORNIO GGTR. │ 3000 │Meccanica P │SIEMENS  │ 1  │
│ COM-2023-015  │FORATRICE GGB│ 2000 │Fonderie N. │CSE      │ 0  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Ricerca Macchine

**Ricerca per Numero Commessa (metodo principale):**
1. Digita il numero commessa nella barra di ricerca
2. I risultati si aggiornano automaticamente

**Ricerca con Filtri:**
1. Clicca su **Filtri**
2. Seleziona i criteri:
   - Tipo Macchina (Tornio/Foratrice/PICO)
   - Modello
   - Cliente
   - Controllo
3. I filtri si combinano tra loro

### 4.3 Dettaglio Macchina

Clicca su un numero commessa per vedere i dettagli:

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Torna alle macchine                                          │
│                                                      [+ Nuova]  │
│  COM-2024-001                                       Problematica│
│  TORNIO GGTRONIC - 2000                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────┐  ┌───────────────────────┐ │
│  │ 🔧 Dettagli Tecnici             │  │ 🏢 Cliente            │ │
│  │                                 │  │                       │ │
│  │ Tipo: TORNIO                    │  │ Acciaierie Riunite SpA│ │
│  │ Categoria: TRADIZIONALE         │  │ CLI001                │ │
│  │ Modello: GGTRONIC               │  │ Via Industriale 45    │ │
│  │ Taglia: 2000                    │  │ Brescia               │ │
│  │ Assi: SINGOLA XZ                │  │ +39 030 1234567       │ │
│  │ Controllo: FANUC                │  │                       │ │
│  │ Seriale: SN-GGT-001             │  └───────────────────────┘ │
│  │ Anno: 2024                      │                            │
│  └─────────────────────────────────┘  ┌───────────────────────┐ │
│                                        │ 📍 Posizione          │ │
│  ┌─────────────────────────────────┐  │ Via Industriale 45,   │ │
│  │ ⚠️ Problematiche (2)            │  │ Brescia               │ │
│  │                                 │  │ [Visualizza mappa →]  │ │
│  │ ┌─────────────────────────────┐│  └───────────────────────┘ │
│  │ │ in_lav. MECCANICO alta     ││                            │
│  │ │ Vibrazione anomala durante ││  ┌───────────────────────┐ │
│  │ │ rotazione                  ││  │ 📅 Date Importanti    │ │
│  │ │ Testa Porta Pezzo          ││  │ Installazione: 15/03/24│ │
│  │ └─────────────────────────────┘│  │ Scad. Garanzia: 15/03/26│
│  │                                 │  │ Registrazione: 15/01/24│ │
│  │ ┌─────────────────────────────┐│  └───────────────────────┘ │
│  │ │ aperta ELETTRICO media     ││                            │
│  │ │ Intasamento sistema        ││                            │
│  │ │ refrigerante               ││                            │
│  │ └─────────────────────────────┘│                            │
│  └─────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Informazioni Visualizzate

**Dettagli Tecnici:**
- Tipo, Categoria, Modello
- Taglia, Assi, Controllo
- Numero seriale, Anno produzione
- Note

**Cliente:**
- Nome e codice cliente
- Indirizzo
- Telefono e email

**Posizione:**
- Indirizzo installazione
- Link alla mappa

**Date:**
- Data installazione
- Scadenza garanzia
- Data registrazione nel sistema

**Problematiche:**
- Lista di tutte le problematiche
- Badge colorati per stato/tipo/priorità

---

## 5. Gestione Problematiche

### 5.1 Lista Problematiche

Vai a **Problematiche** dal menu.

### 5.2 Filtri Disponibili

| Filtro | Opzioni |
|--------|---------|
| Numero Commessa | Ricerca testuale |
| Stato | aperta, in_lavorazione, risolta, chiusa |
| Tipo | ELETTRICO, MECCANICO |
| Priorità | bassa, media, alta, critica |
| Gruppo | Testa, Contropunta, Carro, etc. |

### 5.3 Creare una Nuova Problematica

1. Clicca su **+ Nuova Problematica**
2. Compila il form:

```
┌─────────────────────────────────────────────────────────────────┐
│  Nuova Problematica                                             │
│  Registra una nuova problematica o manutenzione                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  Identificazione Macchina                                        │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  Numero Commessa *                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ es. COM-2024-001                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ℹ️ Se la macchina esiste nel sistema verrà collegata           │
│                                                                  │
│  — oppure se non conosci il numero commessa —                   │
│                                                                  │
│  Tipo Macchina            Modello                                │
│  ┌───────────────┐        ┌───────────────────────────────┐     │
│  │ Seleziona ▼   │        │ es. GGTRONIC                  │     │
│  └───────────────┘        └───────────────────────────────┘     │
│                                                                  │
│  Cliente                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Nome cliente                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  Dettagli Problema                                               │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  Titolo *                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Descrizione breve del problema                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Tipo Problema *          Gruppo Macchina                        │
│  ┌───────────────┐        ┌────────────────────────────────┐    │
│  │ Meccanico ▼   │        │ Seleziona gruppo ▼             │    │
│  └───────────────┘        └────────────────────────────────┘    │
│                                                                  │
│  Priorità                 Assegna a                              │
│  ┌───────────────┐        ┌────────────────────────────────┐    │
│  │ Media ▼       │        │ Non assegnato ▼                │    │
│  └───────────────┘        └────────────────────────────────┘    │
│                                                                  │
│  Descrizione Dettagliata                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Descrivi il problema in dettaglio: sintomi, quando si   │    │
│  │ presenta, condizioni operative, ecc.                    │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ──────────────────────────────────────────────────────────     │
│                              [Annulla]  [Crea Problematica]     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Campi Obbligatori

| Campo | Obbligatorio | Note |
|-------|--------------|------|
| Numero Commessa | Consigliato | Inserisci se disponibile |
| Tipo Problema | Sì | ELETTRICO o MECCANICO |
| Titolo | Sì | Breve descrizione |

> 💡 Se non conosci il numero commessa, inserisci almeno tipo macchina, modello o cliente.

### 5.5 Dettaglio Problematica

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Torna alle problematiche                         [Modifica]  │
│                                                                  │
│  [in_lav.] [MECCANICO] [alta]                                   │
│  Vibrazione anomala durante rotazione                           │
│  Creato da Amministratore Sistema il 10 Giu 2024 08:00          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────┐  ┌─────────────────────┐ │
│  │ Descrizione                       │  │ 🔧 Macchina         │ │
│  │                                   │  │                     │ │
│  │ Si rileva una vibrazione anomala  │  │ COM-2024-001        │ │
│  │ del mandrino durante la rotazione │  │ TORNIO GGTRONIC     │ │
│  │ a velocità superiori a 1500 RPM.  │  │ Acciaierie Riunite  │ │
│  │ Il cliente segnala un             │  │                     │ │
│  │ peggioramento della finitura      │  ├─────────────────────┤ │
│  │ superficiale dei pezzi lavorati.  │  │ ⚠️ Dettagli         │ │
│  │                                   │  │                     │ │
│  └───────────────────────────────────┘  │ Gruppo: Testa Porta │ │
│                                          │ Tipo: MECCANICO     │ │
│  ┌───────────────────────────────────┐  │ Stato: in_lavoraz.  │ │
│  │ 📎 Allegati (2)                   │  │ Priorità: alta      │ │
│  │                                   │  │ Assegnato: Mario R. │ │
│  │  [img1.jpg]  [doc.pdf]           │  │                     │ │
│  │                                   │  ├─────────────────────┤ │
│  │  [+ Carica file]                 │  │ 🕐 Timeline         │ │
│  └───────────────────────────────────┘  │                     │ │
│                                          │ Creato: 10/06 08:00 │ │
│  ┌───────────────────────────────────┐  │ Aggiornato: 12/06   │ │
│  │ 💬 Commenti (2)                   │  │                     │ │
│  │                                   │  └─────────────────────┘ │
│  │ [M] Mario Rossi - 10 Giu 10:00   │                          │
│  │ Ho verificato la macchina. La    │                          │
│  │ vibrazione sembra provenire dal  │                          │
│  │ cuscinetto anteriore del mandrino│                          │
│  │                                   │                          │
│  │ [L] Luigi Bianchi - 11 Giu 09:00 │                          │
│  │ Ordinato cuscinetto sostitutivo. │                          │
│  │ Consegna prevista in 3 giorni.   │                          │
│  │                                   │                          │
│  │ ┌─────────────────────────────┐  │                          │
│  │ │ Aggiungi un commento...    │📤│                          │
│  │ └─────────────────────────────┘  │                          │
│  └───────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Gestire gli Allegati

**Caricare file:**
1. Nella sezione Allegati, clicca su **Seleziona file**
2. Scegli uno o più file (max 10, max 10MB ciascuno)
3. Clicca su **Carica**

**Tipi supportati:**
- Immagini: JPEG, PNG, GIF, WebP
- Documenti: PDF, Word, Excel, Testo

**Visualizzare:**
- Clicca sulla miniatura per aprire l'immagine
- Clicca sul nome per scaricare

### 5.7 Aggiungere Commenti

1. Scrivi il commento nel campo in basso
2. Clicca sull'icona di invio (📤) o premi Invio

### 5.8 Modificare una Problematica

1. Clicca su **Modifica** in alto a destra
2. Modifica i campi desiderati:
   - Titolo
   - Descrizione
   - Stato (aperta → in_lavorazione → risolta → chiusa)
   - Priorità
   - Note risoluzione
3. Clicca su **Salva**

---

## 6. Gestione Clienti

### 6.1 Lista Clienti

Vai a **Clienti** dal menu.

```
┌─────────────────────────────────────────────────────────────────┐
│  Clienti                                                         │
│  Gestione anagrafica clienti                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔍 Cerca cliente per nome, codice o città...            │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ 🏢 Acciaierie   │  │ 🏢 Meccanica    │  │ 🏢 Fonderie    │  │
│  │ Riunite SpA    │  │ Precision Srl  │  │ del Nord       │  │
│  │ CLI001    🔧 3 │  │ CLI002    🔧 2 │  │ CLI003    🔧 2 │  │
│  │ 📍 Brescia, BS │  │ 📍 Torino, TO  │  │ 📍 Milano, MI  │  │
│  │ 📞 030 1234567 │  │ 📞 011 9876543 │  │ 📞 02 5551234  │  │
│  │ ✉️ info@acc... │  │ ✉️ info@mec... │  │ ✉️ contact@... │  │
│  │ ──────────────│  │ ──────────────│  │ ──────────────│  │
│  │ Vedi macchine │  │ Vedi macchine │  │ Vedi macchine │  │
│  │      Mappa    │  │      Mappa    │  │      Mappa    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Informazioni Cliente

- **Codice:** Identificativo univoco (CLI001)
- **Nome:** Ragione sociale
- **Indirizzo:** Sede legale/operativa
- **Contatti:** Telefono, Email
- **Macchine:** Numero macchine installate

### 6.3 Azioni Disponibili

- **Vedi macchine:** Vai alla lista macchine filtrata per questo cliente
- **Mappa:** Visualizza la posizione sulla mappa

---

## 7. Mappa Geografica

### 7.1 Visualizzazione Mappa

Vai a **Mappa** dal menu.

```
┌─────────────────────────────────────────────────────────────────┐
│  Mappa Macchine                                                  │
│  15 macchine geolocalizzate       ● OK  ● Problemi attivi       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    🗺️ MAPPA INTERATTIVA                         │
│                                                                  │
│     ┌──────────────────────────────────────────────────────┐   │
│     │                                          ●            │   │
│     │         ●                                             │   │
│     │                    ●    ●                             │   │
│     │              ●                    ●                   │   │
│     │     ●                                      ●          │   │
│     │                         ●                             │   │
│     │                              ●        ●               │   │
│     │        ●                                              │   │
│     │                    ●                    ●             │   │
│     │                                                       │   │
│     └──────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ COM-2024-001                                      [X]   │   │
│  │ TORNIO - GGTRONIC                                       │   │
│  │ Acciaierie Riunite SpA                                  │   │
│  │ ⚠️ 2 problematiche aperte                               │   │
│  │                                                         │   │
│  │ [Dettagli]          [Nuovo Problema]                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Legenda Marker

| Colore | Significato |
|--------|-------------|
| 🟢 Verde | Macchina OK, nessun problema attivo |
| 🔴 Rosso | Macchina con problemi aperti/in lavorazione |

### 7.3 Interazione

**Zoom:**
- Usa la rotella del mouse
- Usa i pulsanti +/- sulla mappa

**Pan:**
- Clicca e trascina

**Marker:**
1. Clicca su un marker per vedere il popup
2. Nel popup trovi:
   - Numero commessa
   - Tipo e modello
   - Cliente
   - Numero problemi aperti
   - Link ai dettagli

**Pannello Informativo:**
- Appare quando selezioni una macchina
- Mostra informazioni riassuntive
- Accesso rapido a dettagli e creazione problema

---

## 8. Import da PDF

### 8.1 Panoramica

La funzione Import PDF permette di:
1. Caricare documenti PDF storici
2. Estrarre automaticamente i dati
3. Revisionare e correggere
4. Creare problematiche dal documento

### 8.2 Processo di Import

```
┌─────────────────────────────────────────────────────────────────┐
│  Import da PDF                                                   │
│  Estrai dati da documenti PDF per creare problematiche          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │                         │  │                             │   │
│  │  Carica PDF             │  │  Revisione Dati Estratti    │   │
│  │                         │  │                             │   │
│  │  ┌───────────────────┐  │  │  N. Commessa               │   │
│  │  │                   │  │  │  ┌─────────────────────┐   │   │
│  │  │   📄 Trascina o   │  │  │  │ COM-2023-015        │   │   │
│  │  │   clicca per      │  │  │  └─────────────────────┘   │   │
│  │  │   caricare        │  │  │  Confidenza: 90%           │   │
│  │  │                   │  │  │                             │   │
│  │  └───────────────────┘  │  │  Tipo Macchina             │   │
│  │                         │  │  ┌─────────────────────┐   │   │
│  │  Importazioni Recenti   │  │  │ TORNIO ▼            │   │   │
│  │                         │  │  └─────────────────────┘   │   │
│  │  ┌───────────────────┐  │  │                             │   │
│  │  │ 📄 manutenzione_  │  │  │  Modello                   │   │
│  │  │ 2024.pdf          │  │  │  ┌─────────────────────┐   │   │
│  │  │ Da revisare       │  │  │  │ GGTRONIC            │   │   │
│  │  └───────────────────┘  │  │  └─────────────────────┘   │   │
│  │  ┌───────────────────┐  │  │                             │   │
│  │  │ 📄 report_marzo.  │  │  │  Cliente                   │   │
│  │  │ pdf               │  │  │  ┌─────────────────────┐   │   │
│  │  │ Completato        │  │  │  │ Acciaierie Riunite  │   │   │
│  │  └───────────────────┘  │  │  └─────────────────────┘   │   │
│  │                         │  │                             │   │
│  └─────────────────────────┘  │  Tipo Problema             │   │
│                                │  ┌─────────────────────┐   │   │
│                                │  │ MECCANICO ▼         │   │   │
│                                │  └─────────────────────┘   │   │
│                                │                             │   │
│                                │  Titolo                     │   │
│                                │  ┌─────────────────────┐   │   │
│                                │  │ Perdita olio contr. │   │   │
│                                │  └─────────────────────┘   │   │
│                                │                             │   │
│                                │  Descrizione               │   │
│                                │  ┌─────────────────────┐   │   │
│                                │  │ Rilevata perdita... │   │   │
│                                │  │                     │   │   │
│                                │  └─────────────────────┘   │   │
│                                │                             │   │
│                                │  [Conferma e Crea] [🗑️]    │   │
│                                └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Step per Step

**1. Carica il PDF:**
- Trascina il file nell'area di upload
- Oppure clicca e seleziona il file

**2. Attendi l'elaborazione:**
- Il sistema estrae automaticamente il testo
- I dati vengono analizzati e strutturati

**3. Revisiona i dati:**
- Controlla i campi estratti
- La "confidenza" indica quanto il sistema è sicuro dell'estrazione
- Correggi eventuali errori

**4. Conferma:**
- Clicca su **Conferma e Crea**
- Viene creata la problematica collegata al PDF

### 8.4 Dati Estratti Automaticamente

| Campo | Pattern Riconosciuti |
|-------|---------------------|
| Numero Commessa | COM-YYYY-NNN, N. Commessa, Order N. |
| Data | DD/MM/YYYY, YYYY-MM-DD |
| Tipo Macchina | "tornio", "foratrice", "pico" |
| Modello | GGTRONIC, GGL, GGB |
| Tipo Problema | "elettrico", "meccanico" |
| Gruppo | "contropunta", "mandrino", etc. |

### 8.5 Suggerimenti

> 💡 Per una migliore estrazione:
> - Usa PDF con testo selezionabile (non scansioni)
> - Documenti strutturati funzionano meglio
> - Rivedi sempre i dati prima di confermare

---

## 9. Installazione App (PWA)

CNC Maintenance può essere installato come applicazione nativa su qualsiasi dispositivo.

### 9.1 Cos'è una PWA?

Una Progressive Web App (PWA) è un'applicazione web che si comporta come un'app nativa:
- Si installa sul dispositivo
- Ha un'icona nella home screen / desktop
- Funziona anche offline
- Riceve aggiornamenti automatici

### 9.2 Installazione su Desktop (Chrome/Edge)

1. Apri CNC Maintenance nel browser
2. Cerca l'icona di installazione nella barra degli indirizzi (⊕ o ⬇️)
3. Clicca su **"Installa CNC Maintenance"**
4. L'app apparirà come applicazione installata

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 CNC Maintenance                    ⊕ Installa │
│ http://localhost:3000                              │
└─────────────────────────────────────────────────────────┘
                          ↓
              Clicca sull'icona ⊕
                          ↓
┌─────────────────────────────────────┐
│  Installare CNC Maintenance?        │
│                                     │
│  [Installa]         [Annulla]       │
└─────────────────────────────────────┘
```

### 9.3 Installazione su Smartphone/Tablet

**Android (Chrome):**
1. Apri il sito in Chrome
2. Tocca i tre puntini (⋮) in alto a destra
3. Seleziona **"Aggiungi a schermata Home"**
4. Conferma toccando **"Aggiungi"**

**iPhone/iPad (Safari):**
1. Apri il sito in Safari
2. Tocca l'icona **Condividi** (quadrato con freccia)
3. Scorri e seleziona **"Aggiungi a Home"**
4. Conferma toccando **"Aggiungi"**

### 9.4 Banner di Installazione

Se disponibile, vedrai un banner automatico:

```
┌─────────────────────────────────────────────────────────┐
│ 📱 Installa CNC Maintenance per un accesso più rapido!  │
│                                                         │
│ [Installa Ora]                               [Chiudi X] │
└─────────────────────────────────────────────────────────┘
```

### 9.5 Aggiornamenti Automatici

L'app si aggiorna automaticamente. Quando è disponibile un aggiornamento:

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Nuova versione disponibile!                          │
│ Aggiorna per ottenere le ultime funzionalità.           │
│                                                         │
│ [Aggiorna Ora]                           [Più Tardi]    │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Modalità Offline

Il sistema funziona anche senza connessione Internet.

### 10.1 Come Funziona

- **Lettura dati:** I dati visualizzati di recente sono disponibili offline
- **Creazione/Modifica:** Le operazioni vengono salvate localmente
- **Sincronizzazione:** Quando torni online, i dati si sincronizzano automaticamente

### 10.2 Indicatore Offline

Quando sei senza connessione, vedrai un banner giallo:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Sei offline - Le modifiche verranno sincronizzate   │
│    quando tornerai online                               │
└─────────────────────────────────────────────────────────┘
```

### 10.3 Coda di Sincronizzazione

Le modifiche offline vengono accumulate in una coda:

```
┌─────────────────────────────────────────────────────────┐
│ 📤 3 modifiche in attesa di sincronizzazione            │
│ ────────────────────────────────────────────────────────│
│ • Nuova problematica - COM-2024-015                     │
│ • Commento aggiunto - Issue #234                        │
│ • Stato aggiornato - Issue #233                         │
└─────────────────────────────────────────────────────────┘
```

### 10.4 Sincronizzazione Automatica

Quando torni online:
1. Il banner giallo scompare
2. Compare brevemente un messaggio "Sincronizzazione in corso..."
3. I dati vengono inviati al server
4. Ricevi conferma "Sincronizzazione completata!"

### 10.5 Limitazioni Offline

| Funzione | Disponibile Offline |
|----------|---------------------|
| Visualizza macchine | Sì (cache) |
| Visualizza problematiche | Sì (cache) |
| Crea problematica | Sì (coda) |
| Aggiungi commento | Sì (coda) |
| Carica allegati | No |
| Import PDF | No |
| Mappa | Parziale (cache tiles) |

---

## 11. Sicurezza Account (MFA)

L'autenticazione a due fattori (MFA) aggiunge un livello extra di sicurezza.

### 11.1 Cos'è l'MFA?

MFA (Multi-Factor Authentication) richiede due elementi per accedere:
1. **Qualcosa che conosci:** La tua password
2. **Qualcosa che possiedi:** Un codice dal tuo telefono

### 11.2 Attivare l'MFA

**Prerequisiti:**
- Un'app di autenticazione sul telefono:
  - Google Authenticator (consigliato)
  - Microsoft Authenticator
  - Authy

**Procedura:**

1. Vai su **Profilo** > **Sicurezza**
2. Clicca su **"Attiva MFA"**
3. Appare un QR Code:

```
┌─────────────────────────────────────────────────────────┐
│  Configura Autenticazione a Due Fattori                 │
│ ────────────────────────────────────────────────────────│
│                                                         │
│  1. Scarica Google Authenticator                        │
│                                                         │
│  2. Scansiona questo QR Code:                           │
│     ┌─────────────────┐                                 │
│     │ ▓▓░░▓▓▓░░▓▓░░▓ │                                 │
│     │ ▓░░▓▓░░▓░░▓▓░▓ │                                 │
│     │ ░▓░▓▓░▓▓░▓░░▓░ │                                 │
│     │ ▓▓░░▓░░▓▓░▓▓░▓ │                                 │
│     │ ░▓▓░░▓▓░░▓░░▓▓ │                                 │
│     └─────────────────┘                                 │
│                                                         │
│  3. Inserisci il codice a 6 cifre:                      │
│     ┌────────────────────────────┐                      │
│     │ [______]                   │                      │
│     └────────────────────────────┘                      │
│                                                         │
│  [Verifica e Attiva]                                    │
└─────────────────────────────────────────────────────────┘
```

4. Scansiona il QR con l'app Authenticator
5. Inserisci il codice a 6 cifre mostrato nell'app
6. Clicca **"Verifica e Attiva"**

> ⚠️ **IMPORTANTE:** Salva i codici di backup in un posto sicuro!

### 11.3 Login con MFA

Dopo aver attivato MFA, il login diventa:

1. Inserisci username e password
2. Clicca **Accedi**
3. Ti viene richiesto il codice:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│           🔐 Verifica in due passaggi                   │
│                                                         │
│  Inserisci il codice a 6 cifre dalla tua app           │
│  di autenticazione                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [_ _ _ _ _ _]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Verifica]                                             │
│                                                         │
│  💡 Il codice si rinnova ogni 30 secondi               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

4. Apri l'app Authenticator sul telefono
5. Inserisci il codice a 6 cifre corrente
6. Clicca **Verifica**

### 11.4 Disattivare l'MFA

Se necessario, puoi disattivare l'MFA:

1. Vai su **Profilo** > **Sicurezza**
2. Clicca su **"Disattiva MFA"**
3. Inserisci il codice di conferma dall'app
4. Conferma la disattivazione

> ⚠️ **Nota:** Disattivare MFA riduce la sicurezza del tuo account. Ti consigliamo di tenerlo attivo.

### 11.5 Recupero Accesso

Se hai perso l'accesso al telefono con l'app Authenticator:

1. Usa uno dei **codici di backup** che hai salvato
2. Oppure contatta l'amministratore per reset

---

## 12. Gestione Utenti

> ⚠️ Questa sezione è accessibile solo agli **Admin**.

### 12.1 Lista Utenti

Vai a **Utenti** dal menu.

```
┌─────────────────────────────────────────────────────────────────┐
│  Gestione Utenti                               [+ Nuovo Utente] │
│  Amministrazione utenti del sistema                             │
├─────────────────────────────────────────────────────────────────┤
│ Utente              │User ID │Email           │Ruolo  │Stato   │
│─────────────────────┼────────┼────────────────┼───────┼────────│
│ 👤 Amministratore   │USR001  │admin@cnc.com   │admin  │Attivo  │
│    @admin           │        │                │       │        │
│─────────────────────┼────────┼────────────────┼───────┼────────│
│ 👤 Mario Rossi      │USR002  │mario@cnc.com   │tecnico│Attivo  │
│    @mario.rossi     │        │                │       │        │
│─────────────────────┼────────┼────────────────┼───────┼────────│
│ 👤 Paolo Neri       │USR005  │paolo@cnc.com   │lettura│Attivo  │
│    @paolo.neri      │        │                │       │        │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Creare un Utente

1. Clicca su **+ Nuovo Utente**
2. Compila il form:
   - **User ID:** Codice univoco (es. USR011)
   - **Username:** Nome utente per login
   - **Email:** Email dell'utente
   - **Password:** Minimo 8 caratteri
   - **Nome Completo:** Nome e cognome
   - **Ruolo:** admin, tecnico, o lettura
3. Clicca su **Crea**

### 12.3 Modificare un Utente

1. Clicca sull'icona **✏️** nella riga dell'utente
2. Modifica:
   - Nome Completo
   - Ruolo
3. Clicca su **Salva**

### 12.4 Abilitare/Disabilitare Utenti

- Clicca sull'icona **✓** o **✗** per cambiare lo stato
- Un utente disabilitato non può accedere al sistema

---

## 13. FAQ

### Domande Frequenti

**Q: Come cerco una macchina?**
A: Vai su Macchine e inserisci il numero commessa nella barra di ricerca. Puoi anche usare i filtri avanzati.

**Q: Posso modificare una problematica creata da altri?**
A: Sì, se sei il creatore, l'assegnatario, o un admin.

**Q: Quali tipi di file posso caricare?**
A: Immagini (JPEG, PNG, GIF, WebP), documenti (PDF, Word, Excel), e file di testo. Max 10MB per file.

**Q: Come cambio la mia password?**
A: Attualmente devi chiedere all'amministratore.

**Q: Posso eliminare una problematica?**
A: Sì, se sei il creatore o un admin.

**Q: Come funziona l'import PDF?**
A: Carica un PDF, il sistema estrae i dati automaticamente. Rivedi e correggi se necessario, poi conferma per creare la problematica.

**Q: Perché alcuni marker sulla mappa sono rossi?**
A: I marker rossi indicano macchine con problematiche aperte o in lavorazione.

**Q: Chi può vedere i log di audit?**
A: Solo gli amministratori possono accedere ai log di audit.

**Q: Come aggiungo un nuovo tipo di macchina?**
A: Contatta l'amministratore di sistema. Richiede modifiche al database.

**Q: Posso esportare i dati?**
A: Al momento l'export non è disponibile nell'interfaccia. Contatta l'amministratore per richieste specifiche.

**Q: Come installo l'app sul mio telefono?**
A: Apri il sito nel browser, cerca l'opzione "Aggiungi a schermata Home" nel menu del browser. Vedi sezione 9.

**Q: Posso usare l'app senza Internet?**
A: Sì, l'app funziona offline. I dati vengono salvati localmente e sincronizzati quando torni online. Alcune funzioni (upload file, import PDF) richiedono connessione.

**Q: Cos'è l'MFA e devo attivarlo?**
A: MFA (Multi-Factor Authentication) aggiunge sicurezza richiedendo un codice dal telefono oltre alla password. È consigliato per tutti gli utenti con accesso a dati sensibili.

**Q: Ho perso il telefono, come accedo con MFA attivo?**
A: Usa uno dei codici di backup che hai salvato durante l'attivazione, oppure contatta l'amministratore per disattivare temporaneamente MFA.

**Q: L'app chiede di aggiornarsi, cosa devo fare?**
A: Clicca "Aggiorna Ora" per ottenere l'ultima versione. L'app si ricaricherà automaticamente con le nuove funzionalità.

**Q: Come faccio a sapere se sono offline?**
A: Un banner giallo apparirà in alto nella pagina indicando "Sei offline". Le modifiche fatte verranno sincronizzate automaticamente quando torni online.

---

## Supporto

Per assistenza:
1. Consulta questa guida
2. Contatta l'amministratore del sistema
3. Segnala problemi tecnici al supporto IT
