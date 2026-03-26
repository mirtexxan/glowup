"use client";

import type { GenerationModel, PinterestImage, SavedGeneratedImage } from '../types';

type GenerationSectionProps = {
  canGenerate: boolean;
  isGeneratingUnifiedPrompt: boolean;
  isGenerating: boolean;
  generationModel: GenerationModel;
  selectedImages: PinterestImage[];
  userImage: string;
  generatedImage: string;
  savedGeneratedImages: SavedGeneratedImage[];
  error: string;
  usedPrompt: string;
  isCurrentImageSaved: boolean;
  onGenerationModelChange: (model: GenerationModel) => void;
  onGenerate: () => Promise<void>;
  onOpenPopup: (src: string) => void;
  onSaveCurrentGeneratedImage: () => void;
  onDownloadImage: (src: string, filename: string) => void;
  onRemoveSavedGeneratedImage: (id: string) => void;
};

export function GenerationSection({
  canGenerate,
  isGeneratingUnifiedPrompt,
  isGenerating,
  generationModel,
  selectedImages,
  userImage,
  generatedImage,
  savedGeneratedImages,
  error,
  usedPrompt,
  isCurrentImageSaved,
  onGenerationModelChange,
  onGenerate,
  onOpenPopup,
  onSaveCurrentGeneratedImage,
  onDownloadImage,
  onRemoveSavedGeneratedImage,
}: GenerationSectionProps) {
  return (
    <section className="panel panel-spaced panel-generated">
      <details open>
        <summary className="section-summary"><strong>5. Genera il tuo Glowup!</strong></summary>
      <div className="generation-toolbar">
        <div className="generation-controls">
          <button className="genera-btn" onClick={onGenerate} disabled={!canGenerate || isGeneratingUnifiedPrompt} type="button">
            {isGenerating ? 'Generazione in corso...' : 'Genera immagine ispirazionale'}
          </button>
          <div className="model-selector model-selector--generation">
            <label className="model-selector__option">
              <input
                type="radio"
                name="generationModel"
                value="replicate-qwen"
                checked={generationModel === 'replicate-qwen'}
                onChange={() => onGenerationModelChange('replicate-qwen')}
              /> Qwen via Replicate
            </label>
            <label className="model-selector__option">
              <input
                type="radio"
                name="generationModel"
                value="openai-gpt-image-1"
                checked={generationModel === 'openai-gpt-image-1'}
                onChange={() => onGenerationModelChange('openai-gpt-image-1')}
              /> GPT-Image-1 via OpenAI
            </label>
          </div>
        </div>
        {!userImage && selectedImages.length > 0 && (
          <div className="desktop-only generation-strip">
            {selectedImages.map((img, index) => (
              <div key={img.id} className="generation-strip__item">
                <span className="generation-strip__priority" aria-label={`Priorita ${index + 1}`}>{index + 1}</span>
                <img src={img.src} alt={img.title || 'ispirazione'} className="generation-strip__image" onClick={() => onOpenPopup(img.src)} />
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <div className="alert">{error}</div>}
      {(userImage || selectedImages.length > 0) && (
        <div className="mobile-only generation-mobile-strip">
          {userImage && (
            <div className="generation-strip__item generation-strip__item--original">
              <span className="generation-strip__priority" aria-label="Immagine reale">R</span>
              <img src={userImage} alt="Reale" className="generation-strip__image" onClick={() => onOpenPopup(userImage)} />
            </div>
          )}
          {selectedImages.map((img, index) => (
            <div key={img.id} className="generation-strip__item">
              <span className="generation-strip__priority" aria-label={`Priorita ${index + 1}`}>{index + 1}</span>
              <img src={img.src} alt={img.title || 'ispirazione'} className="generation-strip__image" onClick={() => onOpenPopup(img.src)} />
            </div>
          ))}
        </div>
      )}
      <div className="split generation-split">
        <div className="generation-split__source desktop-only">
          {userImage && <h3 className="desktop-only generation-stage__label">Sinistra: reale</h3>}
          {userImage && (
            <div className="generation-source-card">
              <img src={userImage} alt="Reale" className="desktop-only" />
              {selectedImages.length > 0 && (
                <div className="generation-strip generation-strip--overlay desktop-only">
                  {selectedImages.map((img, index) => (
                    <div key={img.id} className="generation-strip__item generation-strip__item--overlay">
                      <span className="generation-strip__priority" aria-label={`Priorita ${index + 1}`}>{index + 1}</span>
                      <img src={img.src} alt={img.title || 'ispirazione'} className="generation-strip__image" onClick={() => onOpenPopup(img.src)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                      onClick={onSaveCurrentGeneratedImage}
                      disabled={isCurrentImageSaved}
                      title={isCurrentImageSaved ? 'Gia salvata in galleria' : 'Salva in galleria'}
                      aria-label={isCurrentImageSaved ? 'Immagine gia salvata in galleria' : 'Salva immagine in galleria'}
                    >
                      {isCurrentImageSaved ? '✓' : '＋'}
                    </button>
                    <button
                      type="button"
                      className="image-action-btn image-action-btn--right"
                      onClick={() => onDownloadImage(generatedImage, `glowapp-${Date.now()}.png`)}
                      title="Salva sul computer"
                      aria-label="Salva immagine sul computer"
                    >
                      💾
                    </button>
                  </div>
                  <img src={generatedImage} alt="Ispirazionale" className="generated-image" onClick={() => onOpenPopup(generatedImage)} />
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
                  onClick={() => onRemoveSavedGeneratedImage(item.id)}
                  title="Rimuovi dalla galleria"
                  aria-label="Rimuovi dalla galleria"
                >
                  ×
                </button>
                <button
                  type="button"
                  className="image-action-btn image-action-btn--right"
                  onClick={() => onDownloadImage(item.src, `glowapp-gallery-${index + 1}.png`)}
                  title="Salva sul computer"
                  aria-label="Salva immagine sul computer"
                >
                  💾
                </button>
                <img src={item.src} alt={`Progressione GlowApp ${index + 1}`} className="generated-gallery__image" onClick={() => onOpenPopup(item.src)} />
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
      </details>
    </section>
  );
}