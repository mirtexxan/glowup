"use client";

type ImagePopupProps = {
  popupImg: string | null;
  onClose: () => void;
};

export function ImagePopup({ popupImg, onClose }: ImagePopupProps) {
  if (!popupImg) {
    return null;
  }

  return (
    <div className="image-popup" onClick={onClose}>
      <img src={popupImg} alt="Ingrandimento" className="image-popup__image" />
    </div>
  );
}