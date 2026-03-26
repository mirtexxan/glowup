import type { PinterestImage } from './types';

export function orderImagesByPriority(images: PinterestImage[], orderedIds: number[]) {
  const selectedImages = orderedIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is PinterestImage => Boolean(img));
  const remainingImages = images.filter((img) => !orderedIds.includes(img.id));
  return [...selectedImages, ...remainingImages];
}