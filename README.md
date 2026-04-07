# GlowApp

GlowApp e una web app Next.js per costruire una moodboard visiva, descriverla con modelli AI, sintetizzarla in un prompt unico e generare un'immagine ispirazionale a partire da una foto reale.

## Produzione

L'istanza pubblica attualmente disponibile vive su Vercel:

- https://glowapp-mm.vercel.app/

Al momento questo e l'unico deploy pubblico ufficiale.

## Cosa fa

GlowApp permette di:

- cercare immagini ispirazionali da provider esterni;
- selezionare fino a 5 riferimenti in ordine di priorita;
- generare o rifinire manualmente le descrizioni delle immagini selezionate;
- fondere le descrizioni in un prompt unico, coerente e focalizzato su una sola persona;
- caricare una foto locale oppure acquisirla da webcam;
- generare una nuova immagine ispirazionale con Replicate;
- scegliere il backend di generazione tra Replicate Qwen e OpenAI GPT-Image-1;
- salvare piu varianti nella galleria progressi e scaricarle localmente.

## Requisiti di sistema

Prima di iniziare, assicurati di avere installato:

| Software | Versione minima | Link download |
|---|---|---|
| **Node.js** | 18 LTS o superiore | https://nodejs.org/ |
| **Git** | qualsiasi versione recente | https://git-scm.com/ |
| **VS Code** *(opzionale)* | qualsiasi versione recente | https://code.visualstudio.com/ |

Verifica che Node.js sia installato correttamente:

```powershell
node --version   # deve mostrare v18.x o superiore
npm --version
```

---

## 1 — Clona il repository

```powershell
git clone <URL-del-tuo-repository> glowapp
cd glowapp
```

Se il progetto è già presente sul disco, entra direttamente nella cartella:

```powershell
cd C:\percorso\alla\cartella\glowup
```

---

## 2 — Installa le dipendenze Node

```powershell
npm install
```

Questo scarica tutti i pacchetti definiti in `package.json` (Next.js, React, Prisma, OpenAI SDK, Replicate SDK ecc.).

---

## 3 — Ottieni le chiavi API

L'app richiede account e chiavi sui seguenti servizi:

| Servizio | Dove ottenerla | Variabile d'ambiente |
|---|---|---|
| **Replicate** | https://replicate.com → Account → API Tokens | `REPLICATE_API_KEY` |
| **Unsplash** | https://unsplash.com/developers → New Application | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | https://www.pexels.com/api/ → Get Started | `PEXELS_API_KEY` |
| **OpenAI** | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |

> **Nota OpenAI:** l'API key è separata dall'abbonamento ChatGPT. Puoi aggiungere credito direttamente su https://platform.openai.com/settings/organization/billing

---

## 4 — Configura le variabili d'ambiente

Copia il file di esempio e compilalo con le tue chiavi:

```powershell
Copy-Item .env.example .env.local
```

Apri `.env.local` e inserisci i valori:

```env
# API esterne
REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
UNSPLASH_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PEXELS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database remoto PostgreSQL (Supabase/Neon/Railway)
DATABASE_URL=postgresql://user:password@host.pooler.supabase.com:5432/postgres?sslmode=require
```

Se una chiave manca, la parte corrispondente non funzionerà ma il resto dell'app rimarrà operativo.

---

## 5 — Configura PostgreSQL remoto (cache descrizioni AI)

Il database serve a memorizzare le descrizioni generate dall'AI così da non ricalcolarle ogni volta per la stessa immagine.

Provider con piano free compatibili:

- **Neon** — https://neon.tech (PostgreSQL serverless, molto semplice)
- **Supabase** — https://supabase.com
- **Railway** — https://railway.app
- **Render** — https://render.com

Crea un database su uno di questi servizi, copia la stringa di connessione fornita e incollala come `DATABASE_URL` in `.env.local`.

---

## 6 — Inizializza Prisma (schema del database)

Dopo aver configurato `DATABASE_URL`, esegui:

```powershell
# genera il client TypeScript da schema.prisma
npm run prisma:generate

# crea/aggiorna le tabelle nel database
npm run prisma:push
```

Devi ripetere `prisma:push` ogni volta che modifichi `prisma/schema.prisma`.

---

## 7 — Avvia l'app

### Sviluppo

```powershell
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`. Il server ricarica automaticamente al salvataggio di ogni file.

### Con VS Code — avvio in un solo click

Il progetto include una configurazione Run & Debug per VS Code che avvia il server Next.js:

1. Apri il progetto in VS Code
2. Vai in **Run and Debug** (icona play nella barra laterale) oppure premi `Ctrl+Shift+D`
3. Seleziona **GlowApp: Dev Server** dal menu a tendina
4. Premi **F5** (o il pulsante play verde)

### Build di produzione locale

```powershell
npm run build
npm run start
```

---

## Come si usa

1. Apri GlowApp in locale oppure su Vercel.
2. Cerca immagini ispirazionali usando una query testuale.
3. Seleziona le immagini da usare e ordinale per priorita.
4. Genera tutte le descrizioni oppure modificale manualmente.
5. Controlla il prompt unificato e, se serve, rigeneralo o ritoccalo.
6. Carica la tua immagine oppure usa la webcam.
7. Premi `Genera immagine ispirazionale`.
8. Salva il risultato nella galleria progressi o scaricalo sul computer.

## Deploy

Il progetto e pensato per Vercel e oggi il deploy pubblico esiste solo li.

Per pubblicarne una copia:

1. importa il repository in Vercel;
2. configura le stesse variabili d'ambiente presenti in `.env.local`;
3. esegui il deploy;
4. verifica che le API route funzionino anche nell'ambiente cloud.

Nota database su Vercel:

- il database SQL non vive "dentro" il runtime Vercel;
- Vercel si collega a un DB esterno via `DATABASE_URL` (es. Neon, Supabase, Railway, Render, PlanetScale);
- molti provider offrono un piano gratuito piccolo, spesso sufficiente per una cache testuale come questa.

## Stack tecnico

- Next.js App Router
- React 18
- TypeScript
- API route server-side in Next.js
- OpenAI per l'unificazione dei prompt
- Replicate per captioning e image generation

## Architettura

La pagina principale e stata refactorata in componenti, hook, tipi e utility dedicate.

Per una spiegazione completa dell'architettura attuale vedi:

- [architecture.md](architecture.md)

## Note operative

- la webcam richiede permessi browser e un device non occupato da altre applicazioni;
- la generazione finale dipende dalla disponibilita dei provider esterni;
- l'API OpenAI non e normalmente inclusa nell'abbonamento ChatGPT: usa una fatturazione API separata;
- i prompt configurabili sono centralizzati in `lib/prompts.ts`.

## Licenza e note

Repository applicativo interno / progetto sperimentale.
