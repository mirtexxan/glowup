import { createHash } from 'crypto';

function decodeDataUrl(dataUrl: string): Buffer {
  const parts = dataUrl.split(',', 2);
  if (parts.length !== 2) {
    throw new Error('Data URL immagine non valida.');
  }
  return Buffer.from(parts[1], 'base64');
}

export async function getImageBuffer(imageUrlOrData: string): Promise<Buffer> {
  if (imageUrlOrData.startsWith('data:image/')) {
    return decodeDataUrl(imageUrlOrData);
  }

  const response = await fetch(imageUrlOrData);
  if (!response.ok) {
    throw new Error(`Download immagine fallito (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function computeImageContentHash(imageUrlOrData: string): Promise<string> {
  const buffer = await getImageBuffer(imageUrlOrData);
  return createHash('sha256').update(buffer).digest('hex');
}
