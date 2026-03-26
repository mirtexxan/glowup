export type PinterestImage = { id: number; src: string; title: string };
export type ImageSource = 'pexels' | 'unsplash';
export type SavedGeneratedImage = { id: string; src: string; prompt: string };
export type CaptionModel = 'llava13b' | 'blip2' | 'blip3';