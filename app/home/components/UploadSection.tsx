"use client";

import { useState } from 'react';
import type React from 'react';

type UploadSectionProps = {
  userImage: string;
  userImageDescription: string;
  isGeneratingUserImageDescription: boolean;
  showWebcam: boolean;
  webcamZoom: number;
  canZoomInWebcam: boolean;
  canZoomOutWebcam: boolean;
  startWebcam: () => Promise<void>;
  captureWebcam: () => void;
  closeWebcam: () => void;
  zoomInWebcam: () => void;
  zoomOutWebcam: () => void;
  onOpenPopup: (src: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFileUpload: (file?: File) => void;
  onUploadFromUrl: (url: string) => void;
  onResetUserImage: () => void;
  uploadError: string;
};

export function UploadSection({
  userImage,
  userImageDescription,
  isGeneratingUserImageDescription,
  showWebcam,
  webcamZoom,
  canZoomInWebcam,
  canZoomOutWebcam,
  startWebcam,
  captureWebcam,
  closeWebcam,
  zoomInWebcam,
  zoomOutWebcam,
  onOpenPopup,
  videoRef,
  canvasRef,
  onFileUpload,
  onUploadFromUrl,
  onResetUserImage,
  uploadError,
}: UploadSectionProps) {
  const [imageUrl, setImageUrl] = useState('');

  return (
    <section className="panel panel-spaced panel-upload">
      <details open>
        <summary className="section-summary">
          <strong>2. Carica una tua foto</strong>
          <span className="section-summary__subtitle">Un solo soggetto per foto!</span>
        </summary>
        <div className="upload-panel">
          <input
            id="user-upload-input"
            type="file"
            accept="image/png, image/jpeg"
            className="hidden-input"
            onChange={(event) => onFileUpload(event.target.files?.[0])}
          />
          {!userImage && !showWebcam && (
            <div className="upload-stack">
              <label htmlFor="user-upload-input" className="genera-btn upload-btn" role="button" tabIndex={0}>
                Scegli file
              </label>
              <button type="button" className="genera-btn upload-btn" onClick={startWebcam}>
                📷 Scatta foto da webcam
              </button>
            </div>
          )}
          {!showWebcam && (
            <div className="upload-url-row">
              <input
                type="url"
                className="search-input"
                placeholder="Oppure incolla URL immagine (https://...)"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <button
                type="button"
                className="genera-btn"
                onClick={() => onUploadFromUrl(imageUrl)}
                disabled={!imageUrl.trim()}
              >
                Carica da URL
              </button>
            </div>
          )}
          {showWebcam && (
            <div className="webcam-stack">
              <div className="webcam-video-frame">
                <video
                  ref={videoRef}
                  className="webcam-video"
                  autoPlay
                  muted
                  playsInline
                  style={{ transform: `scale(${webcamZoom})` }}
                />
              </div>
              <canvas ref={canvasRef} className="hidden-input" />
              <div className="webcam-actions">
                <div className="webcam-zoom-controls">
                  <button type="button" className="genera-btn webcam-zoom-btn" onClick={zoomOutWebcam} disabled={!canZoomOutWebcam}>-</button>
                  <span className="webcam-zoom-indicator">Zoom {webcamZoom.toFixed(2)}x</span>
                  <button type="button" className="genera-btn webcam-zoom-btn" onClick={zoomInWebcam} disabled={!canZoomInWebcam}>+</button>
                </div>
                <div className="webcam-action-buttons">
                  <button type="button" className="genera-btn webcam-action-btn" onClick={captureWebcam}>Scatta</button>
                  <button type="button" className="genera-btn webcam-action-btn webcam-action-btn--secondary" onClick={closeWebcam}>Annulla</button>
                </div>
              </div>
            </div>
          )}
          {userImage && (
            <>
              <div
                className="user-preview-card"
                onClick={() => { document.getElementById('user-upload-input')?.click(); }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    document.getElementById('user-upload-input')?.click();
                  }
                }}
              >
                <img
                  src={userImage}
                  alt="Immagine utente"
                  className="user-preview-image"
                />
                <button
                  type="button"
                  className="user-preview-remove"
                  onClick={(event) => { event.stopPropagation(); onResetUserImage(); }}
                  aria-label="Rimuovi immagine utente"
                  title="Rimuovi immagine utente"
                >
                  ×
                </button>
                <button
                  type="button"
                  className="user-preview-zoom"
                  onClick={(event) => { event.stopPropagation(); onOpenPopup(userImage); }}
                  aria-label="Apri zoom immagine utente"
                  title="Apri zoom immagine utente"
                >
                  🔍
                </button>
              </div>
              <div className="user-caption-debug">
                <strong>Caption soggetto (debug):</strong>{' '}
                {isGeneratingUserImageDescription ? 'generazione in corso...' : (userImageDescription || 'nessuna descrizione disponibile')}
              </div>
            </>
          )}
          {uploadError && <div className="alert">{uploadError}</div>}
        </div>
      </details>
    </section>
  );
}
