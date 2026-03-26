
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
- salvare piu varianti nella galleria progressi e scaricarle localmente.

## Requisiti

- Node.js 18 o superiore
- npm
- chiavi API valide per i servizi esterni usati dall'app

## Variabili d'ambiente

Copia `.env.example` in `.env.local` e compila i valori richiesti.

```powershell
Copy-Item .env.example .env.local
```

Variabili richieste:

- `REPLICATE_API_KEY`: captioning e generazione immagine
- `UNSPLASH_ACCESS_KEY`: ricerca immagini Unsplash
- `PEXELS_API_KEY`: ricerca immagini Pexels
- `OPENAI_API_KEY`: unificazione del prompt

Se una chiave manca, la parte corrispondente del flusso non funzionera.

## Installazione locale

Se il progetto e gia presente sul tuo disco, entra direttamente nella cartella. Se devi clonarlo, usa l'URL del repository che stai effettivamente usando.

```powershell
npm install
```

Avvio in sviluppo:

```powershell
npm run dev
```

L'app sara disponibile su `http://localhost:3000`.

Build di produzione locale:

```powershell
npm run build
npm run start
```

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
- i prompt configurabili sono centralizzati in `lib/prompts.ts`.

## Licenza e note

Repository applicativo interno / progetto sperimentale.
