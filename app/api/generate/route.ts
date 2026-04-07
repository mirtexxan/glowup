import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { PROMPTS } from '../../../lib/prompts';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
});

type GenerationModel = 'replicate-qwen' | 'openai-gpt-image-1';

function inferMimeTypeFromPath(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

async function toImagePayload(imageUrlOrData: string): Promise<{ dataUrl: string; mimeType: string; base64: string }> {
  if (imageUrlOrData.startsWith('data:image/')) {
    const [header, base64 = ''] = imageUrlOrData.split(',', 2);
    const mimeType = header.slice(5, header.indexOf(';')) || 'image/png';
    return { dataUrl: imageUrlOrData, mimeType, base64 };
  }

  const res = await fetch(imageUrlOrData);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const headerMime = res.headers.get('content-type');
  const mimeType = headerMime?.startsWith('image/') ? headerMime : inferMimeTypeFromPath(imageUrlOrData);

  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    base64,
  };
}

async function generateWithReplicate(imageData: string, fullPrompt: string) {
  if (!process.env.REPLICATE_API_KEY) {
    return NextResponse.json({ error: 'REPLICATE_API_KEY non configurata.', provider: 'replicate' }, { status: 500 });
  }

  const payload = await toImagePayload(imageData);
  const input = {
    prompt: fullPrompt,
    enable_prompt_expansion: false,
    image: payload.dataUrl,
  };

  let output;
  try {
    output = await replicate.run('qwen/qwen-image-2-pro', { input });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || 'Errore generazione Replicate.',
      provider: 'replicate',
      replicate_detail: err,
    }, { status: 500 });
  }

  let buffer;
  const outAny = output as any;
  if (outAny && typeof outAny.getReader === 'function') {
    const reader = outAny.getReader();
    const chunks = [];
    let done = false;
    while (!done) {
      const { value, done: finished } = await reader.read();
      if (value) chunks.push(value);
      done = finished;
    }
    buffer = Buffer.concat(chunks.map((chunk: Uint8Array) => Buffer.from(chunk)));
  } else if (Array.isArray(outAny) && outAny.length && outAny[0]) {
    if (typeof outAny[0] === 'string' && outAny[0].startsWith('http')) {
      const imgResp = await fetch(outAny[0]);
      buffer = Buffer.from(await imgResp.arrayBuffer());
    } else {
      buffer = Buffer.from(outAny[0]);
    }
  } else {
    return NextResponse.json({ error: 'Nessuna immagine generata.', provider: 'replicate', replicate_detail: output }, { status: 500 });
  }

  const imageUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return NextResponse.json({ generatedImage: imageUrl, usedPrompt: fullPrompt, provider: 'replicate' });
}

async function generateWithOpenAI(imageData: string, fullPrompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY non configurata.', provider: 'openai' }, { status: 500 });
  }

  const payload = await toImagePayload(imageData);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: fullPrompt },
            { type: 'input_image', image_url: payload.dataUrl },
          ],
        },
      ],
      tools: [
        {
          type: 'image_generation',
          action: 'edit',
          size: '1024x1024',
          quality: 'low',
          output_format: 'png',
          input_fidelity: 'high',
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({
      error: data?.error?.message || 'Errore generazione OpenAI.',
      provider: 'openai',
      openai_detail: data,
    }, { status: response.status || 500 });
  }

  const imageCall = Array.isArray(data?.output)
    ? data.output.find((item: any) => item?.type === 'image_generation_call' && item?.result)
    : null;
  const base64 = imageCall?.result;
  if (!base64) {
    return NextResponse.json({ error: 'OpenAI non ha restituito un immagine valida.', provider: 'openai', openai_detail: data }, { status: 500 });
  }

  return NextResponse.json({
    generatedImage: `data:image/png;base64,${base64}`,
    usedPrompt: fullPrompt,
    provider: 'openai',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { prompt, image_data, model } = body as { prompt?: string; image_data?: string; model?: GenerationModel };

    if (!image_data) {
      return NextResponse.json({ error: 'Immagine mancante.' }, { status: 400 });
    }

    const identityPreservationInstruction = PROMPTS.generateImage.identityPreservationInstruction;
    const glowupInstruction = PROMPTS.generateImage.glowupInstruction;
    const fullPrompt = `${prompt?.trim() || ''}\n${identityPreservationInstruction}\n${glowupInstruction}`;

    switch (model || 'replicate-qwen') {
      case 'openai-gpt-image-1':
        return generateWithOpenAI(image_data, fullPrompt);
      case 'replicate-qwen':
        return generateWithReplicate(image_data, fullPrompt);
      default:
        return NextResponse.json({ error: 'Modello di generazione non supportato.' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Image generation error', error);
    const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
