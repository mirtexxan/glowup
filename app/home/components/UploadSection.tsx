"use client";

import type React from 'react';

type UploadSectionProps = {
  userImage: string;
  showWebcam: boolean;
  startWebcam: () => Promise<void>;
  captureWebcam: () => void;
  closeWebcam: () => void;
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
  videoRef,
  canvasRef,
  onFileUpload,
  onResetUserImage,
}: UploadSectionProps) {
  return (
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
                  onChange={(event) => onFileUpload(event.target.files?.[0])}
                />
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
              <img
                src={userImage}
                alt="Immagine utente"
                className="user-preview-image"
                onClick={() => { document.getElementById('user-upload-input')?.click(); }}
              />
              <button type="button" className="genera-btn upload-btn" onClick={onResetUserImage}>
                Seleziona immagine diversa
              </button>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
