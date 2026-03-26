"use client";

import { AutoResizeTextarea } from './AutoResizeTextarea';
import type { CaptionModel, PinterestImage } from '../types';

type DescriptionsSectionProps = {
  selectedImages: PinterestImage[];
  openDescriptions: Record<number, boolean>;
  inspoDescriptions: Record<number, string>;
  error: string;
  loadingDescId: number | null;
  isGeneratingDescriptions: boolean;
  isGenerating: boolean;
  captionModel: CaptionModel;
  onCaptionModelChange: (model: CaptionModel) => void;
  onGenerateAllDescriptions: () => Promise<void>;
  onToggleDescription: (id: number) => void;
  onRemoveDescription: (id: number) => void;
  onGenerateSingleDescription: (id: number, src: string) => Promise<string | null | undefined>;
  onDescriptionChange: (id: number, value: string) => void;
  onDescriptionBlur: (id: number) => void;
};

export function DescriptionsSection({
  selectedImages,
  openDescriptions,
  inspoDescriptions,
  error,
  loadingDescId,
  isGeneratingDescriptions,
  isGenerating,
  captionModel,
  onCaptionModelChange,
  onGenerateAllDescriptions,
  onToggleDescription,
  onRemoveDescription,
  onGenerateSingleDescription,
  onDescriptionChange,
  onDescriptionBlur,
}: DescriptionsSectionProps) {
  return (
    <section className="panel panel-spaced">
      <details open>
        <summary className="section-summary">
          <strong>3. Genera le descrizioni</strong>
          <span className="section-summary__subtitle">Puoi modificarle o rigenerarle se non ti convincono</span>
        </summary>
        <div className="section-actions">
          <button
            type="button"
            className="genera-btn"
            onClick={onGenerateAllDescriptions}
            disabled={selectedImages.length === 0 || isGeneratingDescriptions || isGenerating}
          >
            Genera tutte le descrizioni
          </button>
          {isGeneratingDescriptions && (
            <span className="spinner" style={{ width: 24, height: 24, border: '3px solid #ccc', borderTop: '3px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
          )}
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
        <div className="model-selector">
          <label className="model-selector__option">
            <input type="radio" name="captionModel" value="llava13b" checked={captionModel === 'llava13b'} onChange={() => onCaptionModelChange('llava13b')} /> LLaVA-13B (equilibrato)
          </label>
          <label className="model-selector__option">
            <input type="radio" name="captionModel" value="blip2" checked={captionModel === 'blip2'} onChange={() => onCaptionModelChange('blip2')} /> BLIP-2 (veloce)
          </label>
          <label className="model-selector__option">
            <input type="radio" name="captionModel" value="blip3" checked={captionModel === 'blip3'} onChange={() => onCaptionModelChange('blip3')} /> BLIP-3 (dettagliato, lento)
          </label>
        </div>
        {selectedImages.map((img, idx) => {
          const open = !!openDescriptions[img.id];
          const description = inspoDescriptions[img.id] || '';
          const priority = idx + 1;
          let statusIcon = null;

          if (loadingDescId === img.id) {
            statusIcon = <span className="spinner" style={{ width: 18, height: 18, border: '2.5px solid #ccc', borderTop: '2.5px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4 }} />;
          } else if (description.trim()) {
            statusIcon = <span title="Descrizione pronta" className="status-icon status-icon--ok">✔️</span>;
          } else {
            statusIcon = <span title="Descrizione mancante" className="status-icon status-icon--error">❌</span>;
          }

          return (
            <div key={img.id} className="description-item">
              <div className="description-item__body">
                <div className={`description-item__header${open ? ' is-open' : ''}`} onClick={() => onToggleDescription(img.id)}>
                  <span className="description-item__priority" aria-label={`Priorita ${priority}`}>{priority}</span>
                  {statusIcon}
                  <span className={`description-item__title${description.trim() ? '' : ' is-empty'}`}>
                    {description.trim() ? description.slice(0, 40) + (description.length > 40 ? '…' : '') : `Descrizione ispirazione ${priority}`}
                  </span>
                  <button
                    type="button"
                    className="description-item__refresh"
                    onClick={(event) => { event.stopPropagation(); onGenerateSingleDescription(img.id, img.src); }}
                    disabled={isGeneratingDescriptions || isGenerating || loadingDescId !== null}
                    title="Genera descrizione"
                  >
                    <span role="img" aria-label="aggiorna" className="description-item__refresh-icon">🔄</span>
                  </button>
                  <button
                    type="button"
                    className="description-item__refresh description-item__remove"
                    onClick={(event) => { event.stopPropagation(); onRemoveDescription(img.id); }}
                    disabled={isGeneratingDescriptions || isGenerating || loadingDescId !== null}
                    title="Rimuovi ispirazione"
                    aria-label="Rimuovi ispirazione"
                  >
                    <span className="description-item__refresh-icon">×</span>
                  </button>
                </div>
                {open && (
                  <div className="description-item__editor">
                    <AutoResizeTextarea
                      value={description}
                      onChange={(event) => onDescriptionChange(img.id, event.target.value)}
                      onBlur={() => onDescriptionBlur(img.id)}
                      placeholder={`Descrizione ispirazione ${priority}`}
                      className="form-textarea"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {error && <div className="alert">{error}</div>}
      </details>
    </section>
  );
}