// API route for img2text (image captioning)
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
});

// Funzione di conversione base64 lato backend
async function convertToBase64(imageUrlOrData: string): Promise<string> {
  if (imageUrlOrData.startsWith('data:image/')) return imageUrlOrData;
  const res = await fetch(imageUrlOrData);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  let mime = 'image/png';
  if (imageUrlOrData.endsWith('.jpg') || imageUrlOrData.endsWith('.jpeg')) mime = 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_data, model } = body;
    if (!image_data) {
      return NextResponse.json({ error: 'Immagine mancante.' }, { status: 400 });
    }
    const img = await convertToBase64(image_data);
    let output;
    if (model === 'blip2') {
      // BLIP-2: parametri semplici
      const input = {
        image: img,
        caption: true,
        temperature: 1,
        use_nucleus_sampling: false
      };
      try {
        output = await replicate.run('andreasjansson/blip-2:f677695e5e89f8b236e52ecd1d3f01beb44c34606419bcc19345e046d8f786f9', { input });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Errore generazione descrizione (BLIP-2).', replicate_detail: err }, { status: 500 });
      }
    } else {
      // BLIP-3: parametri avanzati
      const input = {
        image: img,
        caption: false,
        question: "Fornisci una descrizione dettagliata degli elementi estetici, colori, accessori, luci, vestiti e dettagli stilistici presenti nell'immagine.",
        top_k: 50,
        top_p: 1,
        do_sample: false,
        num_beams: 1,
        temperature: 1,
        system_prompt: "A chat between a curious user and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the user's questions.",
        length_penalty: 1,
        max_new_tokens: 768,
        repetition_penalty: 1
      };
      try {
        output = await replicate.run('zsxkib/blip-3:499bec581d8f64060fd695ec0c34d7595c6824c4118259aa8b0788e0d2d903e1', { input });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Errore generazione descrizione (BLIP-3).', replicate_detail: err }, { status: 500 });
      }
    }
    // Output è una stringa descrittiva
    if (typeof output === 'string') {
      return NextResponse.json({ description: output });
    } else if (Array.isArray(output) && output.length && typeof output[0] === 'string') {
      return NextResponse.json({ description: output[0] });
    } else {
      return NextResponse.json({ error: 'Nessuna descrizione generata.', replicate_detail: output }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
