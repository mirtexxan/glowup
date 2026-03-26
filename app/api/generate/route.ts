import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { PROMPTS } from '../../../lib/prompts';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
});

// Funzione di conversione base64 lato backend
async function convertToBase64(imageUrlOrData: string): Promise<string> {
  // Se già base64, restituisci direttamente
  if (imageUrlOrData.startsWith('data:image/')) return imageUrlOrData;
  // Altrimenti scarica e converte
  const res = await fetch(imageUrlOrData);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  // Prova a dedurre il tipo
  let mime = 'image/png';
  if (imageUrlOrData.endsWith('.jpg') || imageUrlOrData.endsWith('.jpeg')) mime = 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { prompt, image_data } = body;

    if (!image_data) {
      return NextResponse.json({ error: 'Immagine mancante.' }, { status: 400 });
    }

    // Prompt glowup: aggiungi obiettivo di miglioramento estetico
    const glowupInstruction = PROMPTS.generateImage.glowupInstruction;
    const fullPrompt = `${prompt?.trim() || ''}\n${glowupInstruction}`;
    const input = {
      prompt: fullPrompt,
      enable_prompt_expansion: false,
      image: await convertToBase64(image_data),
    };

    // Avvia la prediction con polling asincrono
    // Modello: qwen/qwen-image-2-pro
    let output;
    try {
      output = await replicate.run('qwen/qwen-image-2-pro', { input });
    } catch (err: any) {
      return NextResponse.json({
        error: err?.message || 'Errore generazione Replicate.',
        replicate_detail: err,
      }, { status: 500 });
    }

    let buffer;
    const outAny = output as any;
    // Se output è ReadableStream
    if (outAny && typeof outAny.getReader === 'function') {
      // Leggi ReadableStream
      const reader = outAny.getReader();
      let chunks = [];
      let done = false;
      while (!done) {
        const { value, done: finished } = await reader.read();
        if (value) chunks.push(value);
        done = finished;
      }
      buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      const base64 = buffer.toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;
      return NextResponse.json({ generatedImage: imageUrl, usedPrompt: fullPrompt });
    } else if (Array.isArray(outAny) && outAny.length && outAny[0]) {
      if (typeof outAny[0] === 'string' && outAny[0].startsWith('http')) {
        const imgResp = await fetch(outAny[0]);
        buffer = Buffer.from(await imgResp.arrayBuffer());
      } else {
        buffer = Buffer.from(outAny[0]);
      }
      const base64 = buffer.toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;
      return NextResponse.json({ generatedImage: imageUrl, usedPrompt: fullPrompt });
    } else {
      return NextResponse.json({ error: 'Nessuna immagine generata.', replicate_detail: output }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Image generation error', error);
    const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
