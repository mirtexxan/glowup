"use client";

import type { ImageSource, PinterestImage } from '../types';

type SearchSectionProps = {
  imageSource: ImageSource;
  onImageSourceChange: (source: ImageSource) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  imagesCount: number;
  onImagesCountChange: (value: number) => void;
  onSearch: () => void;
  onRemoveUnselected: () => void;
  isLoadingImages: boolean;
  imagesError: string;
  imagesErrorDetail: string;
  unsplashImages: PinterestImage[];
  selectedIds: number[];
  getPriorityById: (id: number) => number | null;
  onToggleImage: (id: number) => void;
  onMovePriority: (id: number, direction: 'up' | 'down') => void;
  onOpenPopup: (src: string) => void;
};

export function SearchSection({
  imageSource,
  onImageSourceChange,
  searchQuery,
  onSearchQueryChange,
  imagesCount,
  onImagesCountChange,
  onSearch,
  onRemoveUnselected,
  isLoadingImages,
  imagesError,
  imagesErrorDetail,
  unsplashImages,
  selectedIds,
  getPriorityById,
  onToggleImage,
  onMovePriority,
  onOpenPopup,
}: SearchSectionProps) {
  return (
    <section className="panel">
      <div className="source-switcher">
        <label className="source-switcher__option">
          <input
            type="radio"
            name="imageSource"
            value="pexels"
            checked={imageSource === 'pexels'}
            onChange={() => onImageSourceChange('pexels')}
          />{' '}
          Pexels
        </label>
        <label className="source-switcher__option">
          <input
            type="radio"
            name="imageSource"
            value="unsplash"
            checked={imageSource === 'unsplash'}
            onChange={() => onImageSourceChange('unsplash')}
          />{' '}
          Unsplash
        </label>
      </div>
      <details open>
        <summary className="section-summary"><strong>1. Ricerca immagini ispirazionali</strong></summary>
        <form onSubmit={(event) => { event.preventDefault(); onSearch(); }} className="search-form">
          <div className="search-input-row">
            <input
              type="text"
              placeholder="Cerca ispirazione (es: street style, eleganza, ... )"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="search-input"
            />
            <input
              type="number"
              min={1}
              max={30}
              value={imagesCount}
              onChange={(event) => onImagesCountChange(Number(event.target.value))}
              className="search-count-input"
              title="Numero immagini"
            />
          </div>
          <div className="search-btn-row">
            <button type="submit" disabled={isLoadingImages || !searchQuery} className="genera-btn search-btn">
              {isLoadingImages ? 'Caricamento...' : 'Cerca'}
            </button>
            <button
              type="button"
              className="genera-btn search-btn"
              onClick={onRemoveUnselected}
              disabled={unsplashImages.length === 0 || selectedIds.length === 0 || unsplashImages.length === selectedIds.length}
            >
              Elimina immagini non selezionate
            </button>
          </div>
        </form>
        {imagesError && <div className="alert">{imagesError}{imagesErrorDetail ? `: ${imagesErrorDetail}` : ''}</div>}
        <div className="grid pinterest-grid">
          {unsplashImages.map((img) => (
            <div key={img.id} className={`search-result-card${selectedIds.includes(img.id) ? ' is-selected' : ''}`}>
              <img src={img.src} alt={img.title} className="search-result-image" onClick={() => onOpenPopup(img.src)} />
              {selectedIds.includes(img.id) ? (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleImage(img.id)}
                    className="search-result-toggle search-result-toggle--priority is-selected"
                    aria-label={`Deseleziona immagine con priorita ${getPriorityById(img.id)}`}
                  >
                    {getPriorityById(img.id)}
                  </button>
                  <div className="search-result-reorder">
                    <button
                      type="button"
                      className="search-result-move-btn"
                      onClick={() => onMovePriority(img.id, 'up')}
                      disabled={getPriorityById(img.id) === 1}
                      aria-label={`Alza priorita immagine ${getPriorityById(img.id)}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="search-result-move-btn"
                      onClick={() => onMovePriority(img.id, 'down')}
                      disabled={getPriorityById(img.id) === selectedIds.length}
                      aria-label={`Abbassa priorita immagine ${getPriorityById(img.id)}`}
                    >
                      ↓
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => onToggleImage(img.id)} className="search-result-toggle" aria-label="Seleziona">
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
