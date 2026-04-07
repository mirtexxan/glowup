"use client";

import { AutoResizeTextarea } from './AutoResizeTextarea';
import type { CaptionModel, PinterestImage } from '../types';

type DescriptionHistoryOption = {
  id: string;
  description: string;
  sourceType: 'ai' | 'manual';
  isActive: boolean;
  createdAt: string;
};

type DescriptionSourceBadge = 'db' | 'ai' | 'manual';

type DescriptionsSectionProps = {
  selectedImages: PinterestImage[];
  openDescriptions: Record<number, boolean>;
  inspoDescriptions: Record<number, string>;
  error: string;
  loadingDescIds: number[];
  isGeneratingDescriptions: boolean;
  isGenerating: boolean;
  captionModel: CaptionModel;
  autoCaptioning: boolean;
  descriptionHistoryById: Record<number, DescriptionHistoryOption[]>;
  selectedDescriptionVersionById: Record<number, string>;
  descriptionSourceById: Record<number, DescriptionSourceBadge>;
  onCaptionModelChange: (model: CaptionModel) => void;
  onAutoCaptioningChange: (value: boolean) => void;
  onSelectDescriptionVersion: (id: number, versionId: string) => void;
  onDeleteDescription: (id: number, versionId?: string) => void;
  onGenerateAllDescriptions: () => Promise<void>;
  onToggleDescription: (id: number) => void;
  onGenerateSingleDescription: (
    id: number,
    src: string,
    options?: { triggerUnifiedPrompt?: boolean; forceAI?: boolean }
  ) => Promise<string | null | undefined>;
  onDescriptionChange: (id: number, value: string) => void;
  onDescriptionBlur: (id: number) => void;
};

export function DescriptionsSection({
  selectedImages,
  openDescriptions,
  inspoDescriptions,
  error,
  loadingDescIds,
  isGeneratingDescriptions,
  isGenerating,
  captionModel,
  autoCaptioning,
  descriptionHistoryById,
  selectedDescriptionVersionById,
  descriptionSourceById,
  onCaptionModelChange,
  onAutoCaptioningChange,
  onSelectDescriptionVersion,
  onDeleteDescription,
  onGenerateAllDescriptions,
  onToggleDescription,
  onGenerateSingleDescription,
  onDescriptionChange,
  onDescriptionBlur,
}: DescriptionsSectionProps) {
  const isAnyDescriptionLoading = loadingDescIds.length > 0;

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
        <label className="auto-toggle" title="Captioning automatico al click">
          <input
            type="checkbox"
            checked={autoCaptioning}
            onChange={(e) => onAutoCaptioningChange(e.target.checked)}
            aria-label="Captioning automatico al click"
          />
          Captioning automatico al click
        </label>
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
          const source = descriptionSourceById[img.id];
          const history = descriptionHistoryById[img.id] || [];
          const selectedVersionId = selectedDescriptionVersionById[img.id] || history[0]?.id || '';
          const currentVersionIndex = history.findIndex((item) => item.id === selectedVersionId);
          const hasMultipleVersions = history.length > 1;
          const canGoPrevVersion = hasMultipleVersions && currentVersionIndex > 0;
          const canGoNextVersion = hasMultipleVersions && currentVersionIndex >= 0 && currentVersionIndex < history.length - 1;
          const priority = idx + 1;
          let statusIcon = null;
          let sourceIcon = null;

          if (loadingDescIds.includes(img.id)) {
            statusIcon = <span className="spinner" style={{ width: 18, height: 18, border: '2.5px solid #ccc', borderTop: '2.5px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 4 }} />;
          } else if (description.trim()) {
            statusIcon = <span title="Descrizione pronta" className="status-icon status-icon--ok">✔️</span>;
            if (source === 'db') {
              sourceIcon = <span title="Descrizione caricata da DB" className="status-icon">🗄️</span>;
            } else if (source === 'manual') {
              sourceIcon = <span title="Descrizione manuale" className="status-icon">✍️</span>;
            } else {
              sourceIcon = <span title="Descrizione generata ora da AI" className="status-icon">🤖</span>;
            }
          } else {
            statusIcon = <span title="Descrizione mancante" className="status-icon status-icon--error">❌</span>;
          }

          return (
            <div key={img.id} className="description-item">
              <div className="description-item__body">
                <div className={`description-item__header${open ? ' is-open' : ''}`} onClick={() => onToggleDescription(img.id)}>
                  <span className="description-item__priority" aria-label={`Priorita ${priority}`}>{priority}</span>
                  {statusIcon}
                  {sourceIcon}
                  <span className={`description-item__title${description.trim() ? '' : ' is-empty'}`}>
                    {description.trim() ? description.slice(0, 40) + (description.length > 40 ? '…' : '') : `Descrizione ispirazione ${priority}`}
                  </span>
                  {hasMultipleVersions && (
                    <>
                      <button
                        type="button"
                        className="description-item__refresh"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canGoPrevVersion) return;
                          const prev = history[currentVersionIndex - 1];
                          if (prev) onSelectDescriptionVersion(img.id, prev.id);
                        }}
                        disabled={!canGoPrevVersion || isGeneratingDescriptions || isGenerating || isAnyDescriptionLoading}
                        title="Versione precedente"
                        aria-label="Versione precedente"
                      >
                        <span className="description-item__refresh-icon" aria-hidden="true">◀</span>
                      </button>
                      <button
                        type="button"
                        className="description-item__refresh"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canGoNextVersion) return;
                          const next = history[currentVersionIndex + 1];
                          if (next) onSelectDescriptionVersion(img.id, next.id);
                        }}
                        disabled={!canGoNextVersion || isGeneratingDescriptions || isGenerating || isAnyDescriptionLoading}
                        title="Versione successiva"
                        aria-label="Versione successiva"
                      >
                        <span className="description-item__refresh-icon" aria-hidden="true">▶</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="description-item__refresh"
                    onClick={(event) => { event.stopPropagation(); onGenerateSingleDescription(img.id, img.src, { forceAI: true }); }}
                    disabled={isGeneratingDescriptions || isGenerating || isAnyDescriptionLoading}
                    title="Rigenera con AI (override cache)"
                  >
                    <span role="img" aria-label="aggiorna" className="description-item__refresh-icon">🔄</span>
                  </button>
                  <button
                    type="button"
                    className="description-item__refresh description-item__remove"
                    onClick={(event) => { event.stopPropagation(); onDeleteDescription(img.id, selectedVersionId || undefined); }}
                    disabled={isGeneratingDescriptions || isGenerating || isAnyDescriptionLoading || !description.trim()}
                    title="Elimina descrizione dal database"
                    aria-label="Elimina descrizione dal database"
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