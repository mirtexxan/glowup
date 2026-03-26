
# Glowup - Costruire e Sorvegliare il Sé

Webapp Next.js per esplorare l'identità visiva tramite moodboard AI e generazione di immagini aspirazionali.

## Descrizione del progetto

Glowup è una webapp didattica che permette di:

- Cercare immagini ispirazionali (Unsplash/Pexels) tramite parola chiave
- Selezionare fino a 5 immagini per la moodboard
- Generare automaticamente (o modificare manualmente) descrizioni dettagliate delle immagini selezionate tramite AI (BLIP-2/BLIP-3)
- Unificare le descrizioni in un unico prompt visivo (OpenAI)
- Caricare una propria foto o scattarla da webcam
- Generare una versione "aspirazionale" della propria immagine tramite AI (Replicate)
- Visualizzare a confronto la foto reale e quella generata

## Installazione e setup

1. **Clona il repository**
	 ```sh
	 git clone https://github.com/mirtexxan/glowup-costruire-e-sorvegliare-il-se.git
	 cd glowup-costruire-e-sorvegliare-il-se
	 ```

2. **Installa le dipendenze**
	 ```sh
	 npm install
	 ```

3. **Configura le variabili d’ambiente**
	 - Copia `.env.example` in `.env.local` e inserisci le tue API key:
		 ```sh
		 cp .env.example .env.local
		 # poi modifica .env.local con le tue chiavi
		 ```
	 - Servono chiavi per:
		 - Replicate (image generation/captioning)
		 - Unsplash (image search)
		 - Pexels (opzionale, image search)
		 - OpenAI (prompt unification)

4. **Avvia il server di sviluppo**
	 ```sh
	 npm run dev
	 ```
	 L’app sarà disponibile su [http://localhost:3000](http://localhost:3000)

## Deploy pubblico (es. per la scuola)

Puoi pubblicare l’app su [Vercel](https://vercel.com/) o [Netlify](https://www.netlify.com/) gratuitamente:

1. Crea un account e importa il repository
2. Imposta le stesse variabili d’ambiente del file `.env.example`
3. Avvia il deploy: riceverai un link pubblico da condividere

## Struttura del codice

- **Frontend**: React + Next.js (app/page.tsx)
	- Ricerca immagini, selezione, upload, webcam, descrizioni, prompt, generazione, confronto
	- UI responsive, auto-resize textarea, popup immagini, spinner, radio per modello AI
- **Backend/API**: Next.js API routes (`app/api/`)
	- `/api/unsplash-search`: ricerca immagini Unsplash/Pexels
	- `/api/img2text`: descrizione automatica immagini (BLIP-2/BLIP-3 via Replicate)
	- `/api/unify-prompt`: unificazione descrizioni in inglese (OpenAI)
	- `/api/generate`: generazione immagine aspirazionale (Replicate)
- **Gestione chiavi/API**: tutte le chiavi sono lette da variabili d’ambiente (`.env.local`)

## Requisiti

- Node.js 18+
- Account Replicate, Unsplash, OpenAI (gratuito o a consumo)

## Personalizzazione avanzata

- Modifica i prompt AI nei file in `app/api/`
- Cambia i modelli Replicate/OpenAI a piacere
- Personalizza la UI in `app/page.tsx` e `app/globals.css`

## FAQ

**Non ho le API key, posso provare l’app?**
> Puoi usare le chiavi gratuite di Unsplash e OpenAI (con limiti). Replicate richiede carta di credito anche per test.

**Posso usare l’app in una rete scolastica?**
> Sì, basta che il computer abbia accesso a internet e le API key siano valide.

**Come mostro l’app agli studenti?**
> Avvia in locale (`npm run dev`) e proietta il browser, oppure pubblica su Vercel/Netlify e condividi il link.

---
© 2026 Glowup - Costruire e Sorvegliare il Sé

© 2026 – Progetto MVP per esplorazione identità visiva con AI
