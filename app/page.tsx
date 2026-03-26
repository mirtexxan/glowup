
"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";

// Textarea auto-resize per descrizioni ispirazionali
function AutoResizeTextarea({ value, onChange, placeholder, style }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; style?: React.CSSProperties }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <textarea
      ref={taRef}
      rows={1}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  );
}

type PinterestImage = { id: number; src: string; title: string };
type ImageSource = 'pexels' | 'unsplash';

export default function Home() {
  // Stato per webcam
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chiudi webcam
  const closeWebcam = () => {
    setShowWebcam(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  // Avvia webcam
  const startWebcam = async () => {
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setShowWebcam(false);
    }
  };

  // Scatta foto da webcam
  const captureWebcam = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setUserImage(dataUrl);
        setUserFile(null);
        setShowWebcam(false);
        // Ferma webcam
        if (video.srcObject) {
          (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
      }
    }
  };
  const [imageSource, setImageSource] = useState<ImageSource>('pexels');
  // Stato immagini ispirazionali dinamiche
  const [searchQuery, setSearchQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState<PinterestImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState('');
  const [imagesErrorDetail, setImagesErrorDetail] = useState('');
  const [imagesCount, setImagesCount] = useState(10);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [userImage, setUserImage] = useState<string>('');
  const [userFile, setUserFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false); // loading per sezione 5
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false); // loading per sezione 3
  const [usedPrompt, setUsedPrompt] = useState<string>('');
  // Numero massimo di immagini ispirazionali selezionabili
  const MAX_INSPO = 5;
  // Stato per le descrizioni delle immagini ispirazionali, mappate per id immagine
  const [inspoDescriptions, setInspoDescriptions] = useState<Record<number, string>>({});
  // Stato per popup immagine
  const [popupImg, setPopupImg] = useState<string | null>(null);
  // Stato per descrizioni ispirazionali aperte/chiuse (id -> bool)
  const [openDescriptions, setOpenDescriptions] = useState<Record<number, boolean>>({});

  // Stato per rotella su singola descrizione
  const [loadingDescId, setLoadingDescId] = useState<number | null>(null);

  // Stato per modello di captioning (blip2/blip3)
  const [captionModel, setCaptionModel] = useState<'blip2' | 'blip3'>('blip2');

  // Stato per la descrizione unificata
  const [unifiedDescription, setUnifiedDescription] = useState('');

  // Memo per immagini selezionate (serve per useEffect sotto)
  const selectedImages = useMemo(
    () => unsplashImages.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, unsplashImages]
  );

  // Funzione per generare descrizione unificata
  // Fusione AI del prompt ispirazionale
  async function generateUnifiedDescriptionAI(descriptions: string[]) {
    if (descriptions.length === 0) {
      setUnifiedDescription('');
      return;
    }
    setIsGeneratingDescriptions(true);
    setError('');
    try {
      const resp = await fetch('/api/unify-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Errore AI');
        setUnifiedDescription('');
      } else {
        setUnifiedDescription(data.prompt || '');
      }
    } catch (e: any) {
      setError('Errore di rete nella fusione AI.');
      setUnifiedDescription('');
    } finally {
      setIsGeneratingDescriptions(false);
    }
  }

  // Aggiorna la descrizione unificata ogni volta che cambiano le descrizioni ispirazionali
  useEffect(() => {
    const descs = selectedImages.map(img => inspoDescriptions[img.id]).filter(Boolean);
    generateUnifiedDescriptionAI(descs);
  }, [selectedImages, inspoDescriptions]);

  // Bottone elimina tutte le immagini non selezionate
  const handleRemoveUnselected = () => {
    setUnsplashImages(unsplashImages.filter(img => selectedIds.includes(img.id)));
  };

  // Funzione per cercare immagini su Unsplash
  const fetchUnsplashImages = async () => {
    setIsLoadingImages(true);
    setImagesError('');
    setImagesErrorDetail('');
    try {
      const resp = await fetch('/api/unsplash-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, count: imagesCount, source: imageSource }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setImagesError(data.error || 'Errore nella ricerca immagini.');
        setImagesErrorDetail(data.detail || '');
        setUnsplashImages([]);
      } else {
        setUnsplashImages(prev => {
          // Mantieni le immagini selezionate in testa, nell'ordine di selezione
          const selectedImgs = prev.filter(img => selectedIds.includes(img.id)).sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
          const newImgs = (data.images || []).filter((img: PinterestImage) => !selectedIds.includes(img.id));
          return [...selectedImgs, ...newImgs];
        });
        // Non azzerare selezione/descs
      }
    } catch (e: any) {
      setImagesError('Errore di rete nella ricerca immagini.');
      setImagesErrorDetail(e?.message || '');
      setUnsplashImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };



  const canGenerate =
    selectedIds.length >= 1 && userImage && !isGenerating;

  const handleImageToggle = (id: number) => {
    setError('');
    setGeneratedImage('');
    let newSelected;
    if (selectedIds.includes(id)) {
      newSelected = selectedIds.filter((sid) => sid !== id);
    } else {
      if (selectedIds.length >= MAX_INSPO) return; // Limite massimo
      newSelected = [...selectedIds, id];
    }
    setSelectedIds(newSelected);
    // Aggiorna le descrizioni solo per le immagini selezionate
    setInspoDescriptions((prev) => {
      const next: Record<number, string> = {};
      for (const id of newSelected) {
        next[id] = prev[id] || '';
      }
      return next;
    });
  };

  const handleFileUpload = (file?: File) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Solo JPG e PNG sono supportati.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUserImage(reader.result as string);
      setUserFile(file);
      setGeneratedImage('');
    };
    reader.readAsDataURL(file);
  };

  // Gestione modifica descrizioni ispirazionali
  const handleInspoChange = (id: number, value: string) => {
    setInspoDescriptions((prev) => ({ ...prev, [id]: value }));
  };

  // Utility per attendere ms millisecondi


  // Genera descrizione automatica per una singola immagine
  const generateSingleInspoDescription = async (id: number, src: string) => {
    setError('');
    setLoadingDescId(id);
    try {
      const resp = await fetch('/api/img2text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: src, model: captionModel }),
      });
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        setError('Risposta non valida dal backend img2text.');
        setLoadingDescId(null);
        return;
      }
      if (data.description) {
        setInspoDescriptions((prev) => ({ ...prev, [id]: data.description }));
      } else if (data.error) {
        setError(`Errore img2text: ${data.error}`);
      }
    } catch (e) {
      setError('Errore di rete img2text.');
    } finally {
      setLoadingDescId(null);
    }
  };

  // Genera descrizioni automatiche per tutte le immagini selezionate (opzionale)
  const generateInspoDescriptions = async () => {
    if (selectedImages.length === 0) return;
    setError('');
    setIsGeneratingDescriptions(true);
    await Promise.all(selectedImages.map(img => generateSingleInspoDescription(img.id, img.src)));
    setIsGeneratingDescriptions(false);
  };

  const generateAspirational = async () => {
    setError('');
    setGeneratedImage('');
    if (!userImage) {
      setError('Devi caricare una foto prima.');
      return;
    }
    if (selectedIds.length < 1) {
      setError('Devi selezionare almeno 1 immagine dalla moodboard.');
      return;
    }
    // Prompt effettivo inviato (con glowup)
    const glowupInstruction = 'The goal is a glowup: make the person look more fit, beautiful, and slim, while keeping coherence with the original image and the inspirational references.';
    const fullPrompt = `${unifiedDescription?.trim() || ''}\n${glowupInstruction}`;
    setUsedPrompt(fullPrompt);
    setIsGenerating(true);
    try {
      // Prompt personalizzato
      const customPrompt = unifiedDescription;
      // Prepara array di descrizioni e/o url per il backend
      const inspiration_images = selectedImages.map(img => {
        const desc = inspoDescriptions[img.id];
        return desc && desc.trim() ? desc : img.src;
      });
      // Prompt finale che integra tutto
      const finalPrompt = customPrompt;
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: userImage, prompt: unifiedDescription }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        let debugMsg = data.error || 'Errore nella generazione dell’immagine.';
        if (data.replicate_status || data.replicate_detail) {
          debugMsg += '\nStatus: ' + (data.replicate_status || '');
          debugMsg += '\nDetail: ' + JSON.stringify(data.replicate_detail, null, 2);
        }
        setError(debugMsg);
      } else {
        setGeneratedImage(data.generatedImage);
      }
    } catch (err) {
      setError('Si è verificato un errore di rete. Riprova.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Effetto: apri sezione upload dopo selezione immagini ispirazionali
  // useEffect(() => {
  //   if (selectedIds.length > 0 && !userImage) {
  //     setOpenSection('upload');
  //   }
  // }, [selectedIds, userImage]);

  // Effetto: apri sezione descrizioni dopo upload utente
  // useEffect(() => {
  //   if (userImage && selectedIds.length > 0) {
  //     setOpenSection('desc');
  //   }
  // }, [userImage, selectedIds]);

  return (
    <main>
      <h1>Glowup - Costruire e Sorvegliare il Sé</h1>
      <p style={{ marginBottom: '1rem' }}>
        Seleziona ispirazioni, carica una tua foto e genera il tuo glowup.
      </p>

      {/* Sezione 1: Ricerca immagini ispirazionali */}
      <section className="panel">
        <div style={{ marginBottom: '0.5em' }}>
          <label style={{ marginRight: '1em' }}>
            <input
              type="radio"
              name="imageSource"
              value="pexels"
              checked={imageSource === 'pexels'}
              onChange={() => setImageSource('pexels')}
            />{' '}
            Pexels
          </label>
          <label>
            <input
              type="radio"
              name="imageSource"
              value="unsplash"
              checked={imageSource === 'unsplash'}
              onChange={() => setImageSource('unsplash')}
            />{' '}
            Unsplash
          </label>
        </div>
        <details open={true}>
          <summary><strong>1. Ricerca immagini ispirazionali</strong></summary>
          <form onSubmit={e => { e.preventDefault(); fetchUnsplashImages(); }} style={{ display: 'flex', gap: '8px', marginBottom: '1em' }}>
            <input
              type="text"
              placeholder="Cerca ispirazione (es: street style, eleganza, ... )"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '8px' }}
            />
            <input
              type="number"
              min={1}
              max={30}
              value={imagesCount}
              onChange={e => setImagesCount(Number(e.target.value))}
              style={{ width: '60px', padding: '8px' }}
              title="Numero immagini"
            />
            <button type="submit" disabled={isLoadingImages || !searchQuery} className="genera-btn">
              {isLoadingImages ? 'Caricamento...' : 'Cerca'}
            </button>
            <button type="button" className="genera-btn" style={{ marginLeft: 8 }} onClick={handleRemoveUnselected} disabled={unsplashImages.length === 0 || selectedIds.length === 0 || unsplashImages.length === selectedIds.length}>
              Elimina immagini non selezionate
            </button>
          </form>
          {imagesError && <div className="alert">{imagesError}{imagesErrorDetail ? `: ${imagesErrorDetail}` : ''}</div>}
          <div className="grid pinterest-grid">
            {unsplashImages.map((img) => (
              <div key={img.id} style={{ position: 'relative', border: selectedIds.includes(img.id) ? '4px solid #0070f3' : '2px solid #eee', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', boxShadow: selectedIds.includes(img.id) ? '0 0 0 2px #0070f3' : undefined }}>
                <img
                  src={img.src}
                  alt={img.title}
                  style={{ objectFit: 'cover', objectPosition: 'center', width: '100%', height: '220px', display: 'block', background: '#fafafa' }}
                  onClick={() => setPopupImg(img.src)}
                />
                <button
                  type="button"
                  onClick={() => handleImageToggle(img.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: selectedIds.includes(img.id) ? '#0070f3' : '#fff',
                    color: selectedIds.includes(img.id) ? '#fff' : '#0070f3',
                    border: '1px solid #0070f3',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  aria-label={selectedIds.includes(img.id) ? 'Deseleziona' : 'Seleziona'}
                >
                  {selectedIds.includes(img.id) ? '✓' : '+'}
                </button>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Popup immagine ingrandita globale */}
      {popupImg && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPopupImg(null)}>
          <img src={popupImg} alt="Ingrandimento" style={{ maxWidth: '95vw', maxHeight: '95vh', height: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 32px #0008' }} />
        </div>
      )}

      {/* Sezione 2: Upload utente */}
      <section className="panel" style={{ marginTop: '1rem', maxWidth: 400 }}>
        <details open>
          <summary style={{ cursor: 'pointer' }}><strong>2. Upload utente</strong></summary>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {!userImage && !showWebcam && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 12 }}>
                <label htmlFor="user-upload-input" style={{ width: '100%' }}>
                  <span
                    className="genera-btn"
                    style={{
                      display: 'inline-block',
                      width: '100%',
                      textAlign: 'center',
                      padding: '0.5rem 1rem',
                      fontSize: '1rem',
                      marginBottom: '0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    Scegli file
                  </span>
                  <input
                    id="user-upload-input"
                    type="file"
                    accept="image/png, image/jpeg"
                    style={{ display: 'none' }}
                    onChange={(event) => handleFileUpload(event.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  className="genera-btn"
                  style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '1rem', marginBottom: '0.7rem' }}
                  onClick={startWebcam}
                >
                  📷 Scatta foto da webcam
                </button>
              </div>
            )}
            {showWebcam && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <video ref={videoRef} style={{ width: 320, height: 240, background: '#222', borderRadius: 8 }} autoPlay muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="genera-btn" onClick={captureWebcam}>Scatta</button>
                  <button type="button" className="genera-btn" onClick={closeWebcam}>Annulla</button>
                </div>
              </div>
            )}
            {userImage && (
              <>
                <img
                  src={userImage}
                  alt="Immagine utente"
                  style={{ marginTop: '0.5rem', maxWidth: '300px', borderRadius: '10px', display: 'block', cursor: 'pointer' }}
                  onClick={() => { document.getElementById('user-upload-input')?.click(); }}
                />
                <button type="button" className="genera-btn" style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '1rem' }} onClick={() => { setUserImage(''); setUserFile(null); }}>Seleziona immagine diversa</button>
              </>
            )}
          </div>
        </details>
      </section>

      {/* Sezione 3: Descrizioni immagini ispirazionali */}
      <section className="panel" style={{ marginTop: '1rem' }}>
        <details open>
          <summary style={{ cursor: 'pointer' }}><strong>3. Descrizioni immagini ispirazionali</strong></summary>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: 8 }}>
            <button type="button" className="genera-btn" onClick={generateInspoDescriptions} disabled={selectedImages.length === 0 || isGeneratingDescriptions || isGenerating}>
              Genera tutte le descrizioni
            </button>
            {isGenerating && (
              <span className="spinner" style={{ width: 24, height: 24, border: '3px solid #ccc', borderTop: '3px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            )}
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
          {/* Selettore modello captioning */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 16 }}>
              <input
                type="radio"
                name="captionModel"
                value="blip2"
                checked={captionModel === 'blip2'}
                onChange={() => setCaptionModel('blip2')}
              /> BLIP-2 (veloce)
            </label>
            <label>
              <input
                type="radio"
                name="captionModel"
                value="blip3"
                checked={captionModel === 'blip3'}
                onChange={() => setCaptionModel('blip3')}
              /> BLIP-3 (dettagliato, lento)
            </label>
          </div>
          {/* Rendering dei campi descrizione */}
          {selectedImages.map((img, idx) => {
            const open = !!openDescriptions[img.id];
            const desc = inspoDescriptions[img.id] || '';
            // Stato icona: check se descrizione presente, x se vuota, spinner se loading
            let statusIcon = null;
            if (loadingDescId === img.id) {
              statusIcon = <span className="spinner" style={{ width: 18, height: 18, border: '2.5px solid #ccc', borderTop: '2.5px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4 }} />;
            } else if (desc.trim()) {
              statusIcon = <span title="Descrizione pronta" style={{ color: 'green', fontSize: 18, marginRight: 4 }}>✔️</span>;
            } else {
              statusIcon = <span title="Descrizione mancante" style={{ color: 'red', fontSize: 18, marginRight: 4 }}>❌</span>;
            }
            return (
              <div key={img.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: open ? '#f7f7f7' : '#f0f0f0', borderRadius: 6, padding: open ? '4px 8px 0 8px' : '4px 8px', border: open ? '1.5px solid #0070f3' : '1.5px solid #e0e0e0', minHeight: 36 }}
                    onClick={() => setOpenDescriptions(prev => ({ ...prev, [img.id]: !prev[img.id] }))}
                  >
                    {statusIcon}
                    <span style={{ flex: 1, color: desc.trim() ? '#222' : '#aaa', fontWeight: 500, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {desc.trim() ? desc.slice(0, 40) + (desc.length > 40 ? '…' : '') : `Descrizione ispirazione ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      className="genera-btn"
                      style={{ minWidth: 32, padding: 0, marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); generateSingleInspoDescription(img.id, img.src); }}
                      disabled={isGeneratingDescriptions || isGenerating || loadingDescId !== null}
                      title="Genera descrizione"
                    >
                      <span role="img" aria-label="aggiorna" style={{ fontSize: 18 }}>🔄</span>
                    </button>
                  </div>
                  {open && (
                    <div style={{ marginTop: 4 }}>
                      <AutoResizeTextarea
                        value={desc}
                        onChange={e => handleInspoChange(img.id, e.target.value)}
                        placeholder={`Descrizione ispirazione ${idx + 1}`}
                        style={{ width: '100%', padding: '8px', minHeight: 40, fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.4, marginRight: 0 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </details>
      </section>

      {/* Sezione 4: Prompt unificato proposto (modificabile) */}
      <section className="panel" style={{ marginTop: '1rem' }}>
        <details>
          <summary style={{ cursor: 'pointer' }}><strong>4. Prompt unificato proposto (modificabile)</strong></summary>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              className="genera-btn"
              onClick={() => {
                const descs = selectedImages.map(img => inspoDescriptions[img.id]).filter(Boolean);
                generateUnifiedDescriptionAI(descs);
              }}
              disabled={isGeneratingDescriptions || selectedImages.length === 0}
              title="Rigenera prompt unificato"
            >
              🔄 Rigenera prompt
            </button>
            {isGeneratingDescriptions && (
              <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #ccc', borderTop: '3px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          <AutoResizeTextarea
            value={unifiedDescription}
            onChange={e => setUnifiedDescription(e.target.value)}
            placeholder="Descrizione unificata delle ispirazioni"
            style={{ width: '100%', padding: '8px', marginBottom: '8px', minHeight: 48, fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.4 }}
          />
        </details>
      </section>

      {/* Sezione 5: Generazione immagine aspirazionale e confronto */}
      <section className="panel" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '0.7rem', fontSize: '1.2rem' }}>5. Generazione immagine aspirazionale</h2>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.2rem', gap: 12, justifyContent: 'space-between' }}>
          <button
            className="genera-btn"
            onClick={generateAspirational}
            disabled={!canGenerate || isGeneratingDescriptions}
            type="button"
          >
            {isGenerating ? 'Generazione in corso...' : 'Genera immagine aspirazionale'}
          </button>
          {selectedImages.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedImages.map(img => (
                <img
                  key={img.id}
                  src={img.src}
                  alt={img.title || 'ispirazione'}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1.5px solid #eee',
                    background: '#fafafa',
                    boxShadow: '0 1px 4px #0002',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onClick={() => setPopupImg(img.src)}
                />
              ))}
                  {/* Popup rimosso: ora è globale sopra il main */}
            </div>
          )}
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="split">
          <div>
            {userImage && <h3>Sinistra: reale</h3>}
            {userImage && <img src={userImage} alt="Reale" />}
          </div>
          <div style={{ position: 'relative' }}>
            {(isGenerating || generatedImage) && <h3>Destra: aspirazionale</h3>}
            <div style={{ position: 'relative', width: '100%' }}>
              {isGenerating ? (
                <div style={{ width: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', borderRadius: 12 }}>
                  <span className="spinner" style={{ width: 48, height: 48, border: '6px solid #ccc', borderTop: '6px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                generatedImage && <img src={generatedImage} alt="Aspirazionale" style={{ display: 'block', width: '100%' }} />
              )}
              {/* Nessuna barra immagini qui, già sopra */}
            </div>
          </div>
        </div>
        {usedPrompt && (
          <details style={{marginTop: '1em', background: '#f7f7f7', padding: '0.5em 1em', borderRadius: '8px'}}>
            <summary style={{fontWeight: 600, cursor: 'pointer'}}>Prompt inviato</summary>
            <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 8}}>{usedPrompt}</pre>
          </details>
        )}
        {generatedImage && (
          <p className="output-text">
            Questa immagine non rappresenta solo come vuoi essere, ma come hai imparato a desiderare
            attraverso le immagini.
          </p>
        )}
      </section>
    </main>
  )
}