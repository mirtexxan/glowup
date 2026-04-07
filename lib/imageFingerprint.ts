import { createHash } from 'crypto';

function decodeDataUrl(dataUrl: string): Buffer {
  const parts = dataUrl.split(',', 2);
  if (parts.length !== 2) {
    throw new Error('Data URL immagine non valida.');
  }
  return Buffer.from(parts[1], 'base64');
}

/**
 * For remote URLs (Pexels, Unsplash, etc.) we hash the *normalized* URL
 * (path only, no query params) so the cache key is stable even when the CDN
 * appends different size/quality parameters to the same image.
 * For data: URIs we hash the actual bytes so two different uploaded images
 * with the same name cannot collide.
 */
function normalizeRemoteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Keep only origin + pathname – strip all query/fragment params that vary
    // by client, device or request (w, h, dpr, auto, cs, fm, fit, crop, q, …)
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
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
  // Remote URL → hash the stable canonical path (no download needed)
  if (/^https?:\/\//i.test(imageUrlOrData)) {
    const canonical = normalizeRemoteUrl(imageUrlOrData);
    return 'url:' + createHash('sha256').update(canonical).digest('hex');
  }

  // data: URI → hash actual bytes
  const buffer = decodeDataUrl(imageUrlOrData);
  return createHash('sha256').update(buffer).digest('hex');
}
