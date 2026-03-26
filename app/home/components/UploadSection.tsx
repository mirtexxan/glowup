"use client";

import type React from 'react';

type UploadSectionProps = {
  userImage: string;
  showWebcam: boolean;
  startWebcam: () => Promise<void>;
  captureWebcam: () => void;
  closeWebcam: () => void;
  onOpenPopup: (src: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFileUpload: (file?: File) => void;
  onResetUserImage: () => void;
};

export function UploadSection({
  userImage,
  showWebcam,
  startWebcam,
  captureWebcam,
  closeWebcam,
  onOpenPopup,
  videoRef,
  canvasRef,
  onFileUpload,
  onResetUserImage,
}: UploadSectionProps) {
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
          {showWebcam && (
            <div className="webcam-stack">
              <video ref={videoRef} className="webcam-video" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden-input" />
              <div className="inline-actions">
                <button type="button" className="genera-btn" onClick={captureWebcam}>Scatta</button>
                <button type="button" className="genera-btn" onClick={closeWebcam}>Annulla</button>
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
            </>
          )}
        </div>
      </details>
    </section>
  );
}
