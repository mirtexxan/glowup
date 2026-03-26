
"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { PROMPTS } from "../lib/prompts";

// Textarea auto-resize per descrizioni ispirazionali
function AutoResizeTextarea({ value, onChange, onBlur, placeholder, style, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void; placeholder?: string; style?: React.CSSProperties; className?: string }) {
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
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  );
}

type PinterestImage = { id: number; src: string; title: string };
type ImageSource = 'pexels' | 'unsplash';
type SavedGeneratedImage = { id: string; src: string; prompt: string };

function orderImagesByPriority(images: PinterestImage[], orderedIds: number[]) {
  const selectedImages = orderedIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is PinterestImage => Boolean(img));
  const remainingImages = images.filter((img) => !orderedIds.includes(img.id));
  return [...selectedImages, ...remainingImages];
}

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
  const [savedGeneratedImages, setSavedGeneratedImages] = useState<SavedGeneratedImage[]>([]);
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false); // loading per sezione 5
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false); // loading captioning per sezione 3
  const [isGeneratingUnifiedPrompt, setIsGeneratingUnifiedPrompt] = useState(false); // loading per sezione 4
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

  // Stato per modello di captioning (llava13b/blip2/blip3)
  const [captionModel, setCaptionModel] = useState<'llava13b' | 'blip2' | 'blip3'>('llava13b');

  // Stato per la descrizione unificata
  const [unifiedDescription, setUnifiedDescription] = useState('');
  const [isUnifiedDescriptionEditing, setIsUnifiedDescriptionEditing] = useState(false);
  const shouldRefreshUnifiedPromptRef = useRef(false);
  const suppressUnifiedPromptRefreshRef = useRef(false);

  // Memo per immagini selezionate (serve per useEffect sotto)
  const selectedImages = useMemo(
    () => selectedIds
      .map((id) => unsplashImages.find((item) => item.id === id))
      .filter((item): item is PinterestImage => Boolean(item)),
    [selectedIds, unsplashImages]
  );

  const getPriorityById = (id: number) => {
    const index = selectedIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  };

  // Funzione per generare descrizione unificata
  // Fusione AI del prompt ispirazionale
  async function generateUnifiedDescriptionAI(descriptions: string[]) {
    if (descriptions.length === 0) {
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
      return;
    }
    setIsGeneratingUnifiedPrompt(true);
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
        setIsUnifiedDescriptionEditing(false);
      } else {
        setUnifiedDescription(data.prompt || '');
        setIsUnifiedDescriptionEditing(false);
      }
    } catch (e: any) {
      setError('Errore di rete nella fusione AI.');
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
    } finally {
      setIsGeneratingUnifiedPrompt(false);
    }
  }

  // Aggiorna la descrizione unificata solo dopo un vero aggiornamento delle descrizioni.
  useEffect(() => {
    if (!shouldRefreshUnifiedPromptRef.current) {
      return;
    }
    if (suppressUnifiedPromptRefreshRef.current) {
      return;
    }
    shouldRefreshUnifiedPromptRef.current = false;
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
    selectedIds.length >= 1 && Boolean(userImage) && !isGenerating;

  const isCurrentImageSaved = generatedImage
    ? savedGeneratedImages.some((item) => item.src === generatedImage)
    : false;

  const downloadImage = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveCurrentGeneratedImage = () => {
    if (!generatedImage || isCurrentImageSaved) {
      return;
    }

    setSavedGeneratedImages((prev) => [
      {
        id: `${Date.now()}-${prev.length}`,
        src: generatedImage,
        prompt: usedPrompt,
      },
      ...prev,
    ]);
  };

  const removeSavedGeneratedImage = (id: string) => {
    setSavedGeneratedImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImageToggle = (id: number) => {
    setError('');
    setGeneratedImage('');
    let newSelected;
    if (selectedIds.includes(id)) {
      shouldRefreshUnifiedPromptRef.current = true;
      newSelected = selectedIds.filter((sid) => sid !== id);
    } else {
      if (selectedIds.length >= MAX_INSPO) return; // Limite massimo
      newSelected = [...selectedIds, id];
    }
    setSelectedIds(newSelected);
    setUnsplashImages((prev) => orderImagesByPriority(prev, newSelected));
    // Aggiorna le descrizioni solo per le immagini selezionate
    setInspoDescriptions((prev) => {
      const next: Record<number, string> = {};
      for (const id of newSelected) {
        next[id] = prev[id] || '';
      }
      return next;
    });
  };

  const moveSelectedPriority = (id: number, direction: 'up' | 'down') => {
    setError('');
    setGeneratedImage('');
    shouldRefreshUnifiedPromptRef.current = true;
    setSelectedIds((prev) => {
      const currentIndex = prev.indexOf(id);
      if (currentIndex === -1) return prev;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      setUnsplashImages((currentImages) => orderImagesByPriority(currentImages, next));
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

  const handleInspoBlur = (id: number) => {
    setOpenDescriptions((prev) => ({ ...prev, [id]: false }));
    shouldRefreshUnifiedPromptRef.current = true;
    const descs = selectedImages.map(img => inspoDescriptions[img.id]).filter(Boolean);
    generateUnifiedDescriptionAI(descs);
  };

  const handleUnifiedDescriptionBlur = () => {
    setIsUnifiedDescriptionEditing(false);
  };

  // Utility per attendere ms millisecondi


  // Genera descrizione automatica per una singola immagine
  const generateSingleInspoDescription = async (id: number, src: string, options?: { triggerUnifiedPrompt?: boolean }) => {
    const triggerUnifiedPrompt = options?.triggerUnifiedPrompt ?? true;
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
        if (triggerUnifiedPrompt && !suppressUnifiedPromptRefreshRef.current) {
          shouldRefreshUnifiedPromptRef.current = true;
        }
        return data.description as string;
      } else if (data.error) {
        setError(`Errore img2text: ${data.error}`);
      }
    } catch (e) {
      setError('Errore di rete img2text.');
    } finally {
      setLoadingDescId(null);
    }
    return null;
  };

  // Genera descrizioni automatiche per tutte le immagini selezionate (opzionale)
  const generateInspoDescriptions = async () => {
    if (selectedImages.length === 0) return;
    setError('');
    setIsGeneratingDescriptions(true);
    suppressUnifiedPromptRefreshRef.current = true;
    const nextDescriptions = { ...inspoDescriptions };
    try {
      for (const img of selectedImages) {
        const generatedDescription = await generateSingleInspoDescription(img.id, img.src, { triggerUnifiedPrompt: false });
        if (generatedDescription) {
          nextDescriptions[img.id] = generatedDescription;
        }
      }
    } finally {
      suppressUnifiedPromptRefreshRef.current = false;
      setIsGeneratingDescriptions(false);
    }

    const descs = selectedImages.map((img) => nextDescriptions[img.id]).filter(Boolean);
    await generateUnifiedDescriptionAI(descs);
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
    const glowupInstruction = PROMPTS.generateImage.glowupInstruction;
    const fullPrompt = `${unifiedDescription?.trim() || ''}\n${glowupInstruction}`;
    setUsedPrompt(fullPrompt);
    setIsGenerating(true);
    try {
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
    <main className="page-main">
      <h1>Glowup - Costruire e Sorvegliare il Sé</h1>
      <p className="page-intro">
        Seleziona ispirazioni, carica una tua foto e genera il tuo glowup.
      </p>

      {/* Sezione 1: Ricerca immagini ispirazionali */}
      <section className="panel">
        <div className="source-switcher">
          <label className="source-switcher__option">
            <input
              type="radio"
              name="imageSource"
              value="pexels"
              checked={imageSource === 'pexels'}
              onChange={() => setImageSource('pexels')}
            />{' '}
            Pexels
          </label>
          <label className="source-switcher__option">
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
          <summary className="section-summary"><strong>1. Ricerca immagini ispirazionali</strong></summary>
          <form onSubmit={e => { e.preventDefault(); fetchUnsplashImages(); }} className="search-form">
            <div className="search-input-row">
              <input
                type="text"
                placeholder="Cerca ispirazione (es: street style, eleganza, ... )"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={imagesCount}
                onChange={e => setImagesCount(Number(e.target.value))}
                className="search-count-input"
                title="Numero immagini"
              />
            </div>
            <div className="search-btn-row">
              <button type="submit" disabled={isLoadingImages || !searchQuery} className="genera-btn search-btn">
                {isLoadingImages ? 'Caricamento...' : 'Cerca'}
              </button>
              <button type="button" className="genera-btn search-btn" onClick={handleRemoveUnselected} disabled={unsplashImages.length === 0 || selectedIds.length === 0 || unsplashImages.length === selectedIds.length}>
                Elimina immagini non selezionate
              </button>
            </div>
          </form>
          {imagesError && <div className="alert">{imagesError}{imagesErrorDetail ? `: ${imagesErrorDetail}` : ''}</div>}
          <div className="grid pinterest-grid">
            {unsplashImages.map((img) => (
              <div key={img.id} className={`search-result-card${selectedIds.includes(img.id) ? ' is-selected' : ''}`}>
                <img
                  src={img.src}
                  alt={img.title}
                  className="search-result-image"
                  onClick={() => setPopupImg(img.src)}
                />
                {selectedIds.includes(img.id) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleImageToggle(img.id)}
                      className="search-result-toggle search-result-toggle--priority is-selected"
                      aria-label={`Deseleziona immagine con priorita ${getPriorityById(img.id)}`}
                    >
                      {getPriorityById(img.id)}
                    </button>
                    <div className="search-result-reorder">
                      <button
                        type="button"
                        className="search-result-move-btn"
                        onClick={() => moveSelectedPriority(img.id, 'up')}
                        disabled={getPriorityById(img.id) === 1}
                        aria-label={`Alza priorita immagine ${getPriorityById(img.id)}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="search-result-move-btn"
                        onClick={() => moveSelectedPriority(img.id, 'down')}
                        disabled={getPriorityById(img.id) === selectedIds.length}
                        aria-label={`Abbassa priorita immagine ${getPriorityById(img.id)}`}
                      >
                        ↓
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleImageToggle(img.id)}
                    className="search-result-toggle"
                    aria-label="Seleziona"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Popup immagine ingrandita globale */}
      {popupImg && (
        <div className="image-popup" onClick={() => setPopupImg(null)}>
          <img src={popupImg} alt="Ingrandimento" className="image-popup__image" />
        </div>
      )}

      {/* Sezione 2: Upload utente */}
      <section className="panel panel-spaced panel-upload">
        <details open>
          <summary className="section-summary"><strong>2. Upload utente</strong></summary>
          <div className="upload-panel">
            {!userImage && !showWebcam && (
              <div className="upload-stack">
                <label htmlFor="user-upload-input" className="genera-btn upload-btn" role="button" tabIndex={0}>
                  Scegli file
                  <input
                    id="user-upload-input"
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden-input"
                    onChange={(event) => handleFileUpload(event.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  className="genera-btn upload-btn"
                  onClick={startWebcam}
                >
                  📷 Scatta foto da webcam
                </button>
              </div>
            )}
            {showWebcam && (
              <div className="webcam-stack">
                <video ref={videoRef} className="webcam-video" autoPlay muted />
                <canvas ref={canvasRef} className="hidden-input" />
                <div className="inline-actions">
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
                  className="user-preview-image"
                  onClick={() => { document.getElementById('user-upload-input')?.click(); }}
                />
                <button type="button" className="genera-btn upload-btn" onClick={() => { setUserImage(''); setUserFile(null); }}>Seleziona immagine diversa</button>
              </>
            )}
          </div>
        </details>
      </section>

      {/* Sezione 3: Descrizioni immagini ispirazionali */}
      <section className="panel panel-spaced">
        <details open>
          <summary className="section-summary"><strong>3. Descrizioni immagini ispirazionali</strong></summary>
          <div className="section-actions">
            <button type="button" className="genera-btn" onClick={generateInspoDescriptions} disabled={selectedImages.length === 0 || isGeneratingDescriptions || isGenerating}>
              Genera tutte le descrizioni
            </button>
            {isGeneratingDescriptions && (
              <span className="spinner" style={{ width: 24, height: 24, border: '3px solid #ccc', borderTop: '3px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            )}
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
          {/* Selettore modello captioning */}
          <div className="model-selector">
            <label className="model-selector__option">
              <input
                type="radio"
                name="captionModel"
                value="llava13b"
                checked={captionModel === 'llava13b'}
                onChange={() => setCaptionModel('llava13b')}
              /> LLaVA-13B (equilibrato)
            </label>
            <label className="model-selector__option">
              <input
                type="radio"
                name="captionModel"
                value="blip2"
                checked={captionModel === 'blip2'}
                onChange={() => setCaptionModel('blip2')}
              /> BLIP-2 (veloce)
            </label>
            <label className="model-selector__option">
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
            const priority = idx + 1;
            // Stato icona: check se descrizione presente, x se vuota, spinner se loading
            let statusIcon = null;
            if (loadingDescId === img.id) {
              statusIcon = <span className="spinner" style={{ width: 18, height: 18, border: '2.5px solid #ccc', borderTop: '2.5px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4 }} />;
            } else if (desc.trim()) {
              statusIcon = <span title="Descrizione pronta" className="status-icon status-icon--ok">✔️</span>;
            } else {
              statusIcon = <span title="Descrizione mancante" className="status-icon status-icon--error">❌</span>;
            }
            return (
              <div key={img.id} className="description-item">
                <div className="description-item__body">
                  <div
                    className={`description-item__header${open ? ' is-open' : ''}`}
                    onClick={() => setOpenDescriptions(prev => ({ ...prev, [img.id]: !prev[img.id] }))}
                  >
                    <span className="description-item__priority" aria-label={`Priorita ${priority}`}>{priority}</span>
                    {statusIcon}
                    <span className={`description-item__title${desc.trim() ? '' : ' is-empty'}`}>
                      {desc.trim() ? desc.slice(0, 40) + (desc.length > 40 ? '…' : '') : `Descrizione ispirazione ${priority}`}
                    </span>
                    <button
                      type="button"
                      className="description-item__refresh"
                      onClick={e => { e.stopPropagation(); generateSingleInspoDescription(img.id, img.src); }}
                      disabled={isGeneratingDescriptions || isGenerating || loadingDescId !== null}
                      title="Genera descrizione"
                    >
                      <span role="img" aria-label="aggiorna" className="description-item__refresh-icon">🔄</span>
                    </button>
                  </div>
                  {open && (
                    <div className="description-item__editor">
                      <AutoResizeTextarea
                        value={desc}
                        onChange={e => handleInspoChange(img.id, e.target.value)}
                        onBlur={() => handleInspoBlur(img.id)}
                        placeholder={`Descrizione ispirazione ${priority}`}
                        className="form-textarea"
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
      <section className="panel panel-spaced">
        <details open>
          <summary className="section-summary"><strong>4. Prompt unificato proposto (modificabile)</strong></summary>
          <div className="section-actions">
            <button
              type="button"
              className="genera-btn"
              onClick={() => {
                const descs = selectedImages.map(img => inspoDescriptions[img.id]).filter(Boolean);
                generateUnifiedDescriptionAI(descs);
              }}
              disabled={isGeneratingUnifiedPrompt || selectedImages.length === 0}
              title="Rigenera prompt unificato"
            >
              🔄 Rigenera prompt
            </button>
            {isGeneratingUnifiedPrompt && (
              <span className="spinner" style={{ width: 20, height: 20, border: '3px solid #ccc', borderTop: '3px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
          {isUnifiedDescriptionEditing ? (
            <AutoResizeTextarea
              value={unifiedDescription}
              onChange={e => setUnifiedDescription(e.target.value)}
              onBlur={handleUnifiedDescriptionBlur}
              placeholder="Descrizione unificata delle ispirazioni"
              className="form-textarea form-textarea--prompt"
            />
          ) : (
            <button
              type="button"
              className={`prompt-editor-display${unifiedDescription.trim() ? '' : ' is-empty'}`}
              onClick={() => setIsUnifiedDescriptionEditing(true)}
            >
              {unifiedDescription.trim() || 'Descrizione unificata delle ispirazioni'}
            </button>
          )}
        </details>
      </section>

      {/* Sezione 5: Generazione immagine ispirazionale e confronto */}
      <section className="panel panel-spaced panel-generated">
        <h2 className="section-title">5. Generazione immagine ispirazionale</h2>
        <div className="generation-toolbar">
          <button
            className="genera-btn"
            onClick={generateAspirational}
            disabled={!canGenerate || isGeneratingUnifiedPrompt}
            type="button"
          >
            {isGenerating ? 'Generazione in corso...' : 'Genera immagine ispirazionale'}
          </button>
          {selectedImages.length > 0 && (
            <div className="desktop-only generation-strip">
              {selectedImages.map((img, index) => (
                <div key={img.id} className="generation-strip__item">
                  <span className="generation-strip__priority" aria-label={`Priorita ${index + 1}`}>{index + 1}</span>
                  <img
                    src={img.src}
                    alt={img.title || 'ispirazione'}
                    className="generation-strip__image"
                    onClick={() => setPopupImg(img.src)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="split generation-split">
          <div>
            {/* Mostra immagine originale solo su desktop */}
            {userImage && <h3 className="desktop-only generation-stage__label">Sinistra: reale</h3>}
            {userImage && <img src={userImage} alt="Reale" className="desktop-only" />}
          </div>
          <div className="generation-stage">
            {(isGenerating || generatedImage) && <h3 className="generation-stage__label mobile-hidden">Destra: ispirazionale</h3>}
            <div className="generation-stage__content">
              {isGenerating ? (
                <div className="generation-loading">
                  <span className="spinner" style={{ width: 48, height: 48, border: '6px solid #ccc', borderTop: '6px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                generatedImage && (
                  <div className="generated-image-card">
                    <div className="generated-image-actions">
                      <button
                        type="button"
                        className="image-action-btn image-action-btn--left"
                        onClick={saveCurrentGeneratedImage}
                        disabled={isCurrentImageSaved}
                        title={isCurrentImageSaved ? 'Gia salvata in galleria' : 'Salva in galleria'}
                        aria-label={isCurrentImageSaved ? 'Immagine gia salvata in galleria' : 'Salva immagine in galleria'}
                      >
                        {isCurrentImageSaved ? '✓' : '＋'}
                      </button>
                      <button
                        type="button"
                        className="image-action-btn image-action-btn--right"
                        onClick={() => downloadImage(generatedImage, `glowup-${Date.now()}.png`)}
                        title="Salva sul computer"
                        aria-label="Salva immagine sul computer"
                      >
                        💾
                      </button>
                    </div>
                    <img src={generatedImage} alt="Ispirazionale" className="generated-image" onClick={() => setPopupImg(generatedImage)} />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        {savedGeneratedImages.length > 0 && (
          <div className="generated-gallery">
            <h3 className="generated-gallery__title">Galleria progressi</h3>
            <div className="generated-gallery__grid">
              {savedGeneratedImages.map((item, index) => (
                <div key={item.id} className="generated-gallery__item">
                  <button
                    type="button"
                    className="image-action-btn image-action-btn--left image-action-btn--danger"
                    onClick={() => removeSavedGeneratedImage(item.id)}
                    title="Rimuovi dalla galleria"
                    aria-label="Rimuovi dalla galleria"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    className="image-action-btn image-action-btn--right"
                    onClick={() => downloadImage(item.src, `glowup-gallery-${index + 1}.png`)}
                    title="Salva sul computer"
                    aria-label="Salva immagine sul computer"
                  >
                    💾
                  </button>
                  <img
                    src={item.src}
                    alt={`Progressione glowup ${index + 1}`}
                    className="generated-gallery__image"
                    onClick={() => setPopupImg(item.src)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {usedPrompt && (
          <details className="prompt-box">
            <summary className="prompt-box__summary">Prompt inviato</summary>
            <pre className="prompt-box__content">{usedPrompt}</pre>
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