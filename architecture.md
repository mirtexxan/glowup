# GlowApp Architecture

Questo documento descrive l'architettura corrente di GlowApp dopo il refactor della home page in moduli separati.

## Obiettivo architetturale

L'obiettivo del refactor e stato separare tre responsabilita che prima erano mischiate dentro `app/page.tsx`:

- composizione della pagina;
- stato e orchestrazione del flusso;
- rendering delle singole sezioni.

Il risultato attuale e una struttura a tre livelli:

1. `app/page.tsx` come composition root;
2. `app/home/hooks/useGlowupStudio.ts` come orchestratore client-side;
3. `app/home/components/*` come componenti presentazionali.

## Vista d'insieme

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    generate/route.ts
    img2text/route.ts
    unify-prompt/route.ts
    unsplash-search/route.ts
  home/
    components/
      AutoResizeTextarea.tsx
      DescriptionsSection.tsx
      GenerationSection.tsx
      ImagePopup.tsx
      SearchSection.tsx
      UnifiedPromptSection.tsx
      UploadSection.tsx
    hooks/
      useGlowupStudio.ts
    types.ts
    utils.ts
lib/
  prompts.ts
```

## Layer 1: Routing e shell globale

### `app/layout.tsx`

Ruolo:

- definisce il layout root dell'app App Router;
- importa `app/globals.css`;
- imposta metadata globali.

Questo file non contiene logica di business. E l'infrastruttura minima della UI globale.

### `app/page.tsx`

Ruolo:

- monta il hook `useGlowupStudio()`;
- riceve tutto lo stato e tutti gli handler dal hook;
- distribuisce i dati alle sezioni della pagina.

Questo file oggi e volutamente sottile: il suo compito e comporre la pagina, non governarne il comportamento.

## Layer 2: Orchestrazione client-side

### `app/home/hooks/useGlowupStudio.ts`

Questo hook e il cuore dell'app client.

Responsabilita principali:

- gestione dello stato della ricerca immagini;
- gestione delle selezioni e delle priorita;
- upload file e flusso webcam;
- generazione delle descrizioni delle immagini ispirazionali;
- generazione del prompt unificato;
- generazione dell'immagine finale;
- gestione della galleria progressi;
- gestione errori e loading state.

### Stato contenuto nel hook

Categorie di stato principali:

- input utente: query, source provider, immagine utente, file locale;
- moodboard: risultati ricerca, immagini selezionate, ordine di priorita;
- captioning: descrizioni per immagine, modello scelto, card aperte;
- prompt unificato: testo finale, stato editing, loading, cancellazione richieste stale;
- output finale: immagine generata, prompt usato, immagini salvate;
- UI: popup immagine, errori, spinner, stato webcam.

### Gestione della webcam

Il hook mantiene:

- `videoRef` per il tag video;
- `canvasRef` per la cattura del frame;
- `webcamStreamRef` per lo stream `MediaStream` attivo.

Il flusso e:

1. `startWebcam()` chiede accesso al device;
2. se lo stream viene ottenuto, aggiorna `showWebcam` e aggancia lo stream al video;
3. `captureWebcam()` disegna il frame su canvas e lo trasforma in base64;
4. `closeWebcam()` o il cleanup fermano tutte le track.

Questo evita stream orfani e rende espliciti i casi di errore come device occupato o permesso negato.

### Gestione del prompt unificato

Una parte delicata del hook e la sincronizzazione del prompt unificato.

Punti chiave:

- il prompt non viene rigenerato indiscriminatamente a ogni render;
- il refresh viene governato da flag in ref come `shouldRefreshUnifiedPromptRef`;
- durante batch captioning il refresh viene sospeso con `suppressUnifiedPromptRefreshRef`;
- le richieste stale vengono abortite tramite `AbortController`;
- un `requestId` impedisce che risposte vecchie sovrascrivano lo stato corrente.

Questa parte esiste per evitare race condition quando l'utente cambia selezione, priorita o testi rapidamente.

## Layer 3: Componenti presentazionali

I componenti sotto `app/home/components` ricevono dati e callback dal hook. In generale non possiedono logica di business complessa.

### `SearchSection.tsx`

Mostra:

- scelta del provider immagini;
- input di ricerca;
- griglia risultati;
- selezione e gestione priorita;
- apertura popup immagine.

### `UploadSection.tsx`

Mostra:

- upload file locale;
- avvio webcam;
- preview dell'immagine utente.

Non gestisce direttamente stream o canvas: delega tutto al hook.

### `DescriptionsSection.tsx`

Gestisce la sezione in cui:

- si generano tutte le descrizioni;
- si genera la descrizione di una singola immagine;
- si modificano manualmente i testi;
- si chiudono i campi in blur.

Usa `AutoResizeTextarea.tsx` per evitare logica duplicata sui campi multilinea.

### `UnifiedPromptSection.tsx`

Mostra il prompt unificato e permette:

- rigenerazione;
- editing manuale;
- ritorno automatico a vista compatta quando il campo perde focus.

### `GenerationSection.tsx`

Gestisce il rendering della parte finale:

- bottone di generazione;
- strip riferimenti desktop e mobile;
- confronto reale / ispirazionale;
- galleria progressi;
- download e salvataggio locale;
- visualizzazione del prompt inviato.

### `ImagePopup.tsx`

E un componente UI puro per lo zoom delle immagini.

## Tipi condivisi e utility

### `app/home/types.ts`

Contiene i contratti TypeScript condivisi dal flusso home, per esempio:

- `PinterestImage`
- `ImageSource`
- `SavedGeneratedImage`
- `CaptionModel`

Vantaggio:

- i componenti non duplicano i tipi;
- il hook e le props usano un lessico comune.

### `app/home/utils.ts`

Contiene logica pura e riusabile.

Attualmente l'utility principale e `orderImagesByPriority`, che riordina i risultati mantenendo coerente la priorita della selezione.

## Prompt centralizzati

### `lib/prompts.ts`

Qui sono raccolti i prompt usati dai diversi step AI:

- captioning;
- unificazione prompt;
- image generation.

Questa scelta evita stringhe lunghe sparse nelle API route o nel hook e rende la modifica dei prompt molto piu semplice.

## API server-side

Le integrazioni con servizi esterni sono incapsulate in API route Next.js.

### `app/api/unsplash-search/route.ts`

Responsabilita:

- interrogare il provider immagini scelto;
- normalizzare i risultati in un formato consumabile dal client.

### `app/api/img2text/route.ts`

Responsabilita:

- inviare l'immagine selezionata a un caption model;
- restituire una descrizione testuale dettagliata.

### `app/api/unify-prompt/route.ts`

Responsabilita:

- ricevere piu descrizioni testuali;
- fonderle in un unico prompt coerente;
- far rispettare il vincolo fondamentale di una sola persona descritta.

### `app/api/generate/route.ts`

Responsabilita:

- ricevere la foto utente e il prompt finale;
- costruire il prompt completo con l'istruzione di generazione;
- chiamare Replicate;
- restituire l'immagine finale in formato utilizzabile dal client.

## Flusso end-to-end

Il percorso principale dell'utente e questo:

1. cerca immagini;
2. seleziona i riferimenti e li ordina;
3. genera o modifica le descrizioni;
4. ottiene il prompt unificato;
5. carica o scatta la foto personale;
6. genera il risultato finale;
7. salva il risultato nella galleria progressi.

## Stato dell'architettura oggi

Punti forti:

- `app/page.tsx` e molto piu leggibile;
- le responsabilita visive sono separate dalla logica;
- i prompt AI sono centralizzati;
- la logica di sincronizzazione del prompt unificato e piu robusta;
- la UI mobile e desktop condividono una struttura piu chiara.

Limiti attuali:

- `useGlowupStudio.ts` e ancora un hook grande;
- alcune micro-stilizzazioni inline sono ancora presenti nei componenti;
- non c'e ancora una suite di test per i flussi critici.

## Direzione naturale per un refactor successivo

Se servirà un secondo step architetturale, la divisione piu sensata e interna al hook:

- `useImageSearch`
- `useInspirationSelection`
- `usePromptGeneration`
- `useUserImageInput`
- `useFinalGeneration`

Questo ridurrebbe la dimensione del controller centrale mantenendo invariata la struttura visibile dell'app.