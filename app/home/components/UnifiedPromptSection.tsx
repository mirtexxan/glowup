"use client";

import { AutoResizeTextarea } from './AutoResizeTextarea';

type UnifiedPromptSectionProps = {
  isGeneratingUnifiedPrompt: boolean;
  canRegenerate: boolean;
  unifiedDescription: string;
  error: string;
  isUnifiedDescriptionEditing: boolean;
  onRegenerate: () => void;
  onUnifiedDescriptionChange: (value: string) => void;
  onUnifiedDescriptionBlur: () => void;
  onStartUnifiedDescriptionEditing: () => void;
};

export function UnifiedPromptSection({
  isGeneratingUnifiedPrompt,
  canRegenerate,
  unifiedDescription,
  error,
  isUnifiedDescriptionEditing,
  onRegenerate,
  onUnifiedDescriptionChange,
  onUnifiedDescriptionBlur,
  onStartUnifiedDescriptionEditing,
}: UnifiedPromptSectionProps) {
  return (
    <section className="panel panel-spaced">
      <details open>
        <summary className="section-summary">
          <strong>4. Unifica in un solo prompt</strong>
          <span className="section-summary__subtitle">Qui puoi aggiungere tutto quello che vuoi</span>
        </summary>
        <div className="section-actions">
          <button
            type="button"
            className="genera-btn"
            onClick={onRegenerate}
            disabled={isGeneratingUnifiedPrompt || !canRegenerate}
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
            onChange={(event) => onUnifiedDescriptionChange(event.target.value)}
            onBlur={onUnifiedDescriptionBlur}
            placeholder="Descrizione unificata delle ispirazioni"
            className="form-textarea form-textarea--prompt"
          />
        ) : (
          <button
            type="button"
            className={`prompt-editor-display${unifiedDescription.trim() ? '' : ' is-empty'}`}
            onClick={onStartUnifiedDescriptionEditing}
          >
            {unifiedDescription.trim() || 'Descrizione unificata delle ispirazioni'}
          </button>
        )}
        {error && <div className="alert">{error}</div>}
      </details>
    </section>
  );
}
