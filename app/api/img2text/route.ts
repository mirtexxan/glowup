// API route for img2text (image captioning)
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { PROMPTS } from '../../../lib/prompts';
import { computeImageContentHash } from '../../../lib/imageFingerprint';
import { prisma } from '../../../lib/prisma';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
});

const CAPTION_PROMPT_VERSION = 'img2text-v1';
const CAPTION_LANGUAGE = 'it';

type CaptionModel = 'llava13b' | 'blip2' | 'blip3';
type DescriptionHistoryItem = {
  id: string;
  description: string;
  sourceType: 'ai' | 'manual';
  isActive: boolean;
  createdAt: string;
};

async function fetchDescriptionHistory(contentHash: string, captionModel: string): Promise<DescriptionHistoryItem[]> {
  const descriptions = await prisma.imageDescription.findMany({
    where: {
      image: { contentHash },
      captionModel,
      promptVersion: CAPTION_PROMPT_VERSION,
      language: CAPTION_LANGUAGE,
    },
    orderBy: { createdAt: 'desc' },
  });

  return descriptions.map((item) => ({
    id: item.id,
    description: item.description,
    sourceType: item.sourceType,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
  }));
}

async function upsertActiveDescription(params: {
  contentHash: string;
  sourceUrl?: string;
  captionModel: string;
  description: string;
  sourceType: 'ai' | 'manual';
}) {
  const { contentHash, sourceUrl, captionModel, description, sourceType } = params;

  const image = await prisma.imageAsset.upsert({
    where: { contentHash },
    update: {
      sourceUrl: sourceUrl || undefined,
    },
    create: {
      contentHash,
      sourceUrl,
    },
  });

  await prisma.imageDescription.updateMany({
    where: {
      imageId: image.id,
      captionModel,
      promptVersion: CAPTION_PROMPT_VERSION,
      language: CAPTION_LANGUAGE,
      isActive: true,
    },
    data: { isActive: false },
  });

  await prisma.imageDescription.create({
    data: {
      imageId: image.id,
      captionModel,
      promptVersion: CAPTION_PROMPT_VERSION,
      language: CAPTION_LANGUAGE,
      description,
      sourceType,
      isActive: true,
    },
  });
}

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

function getReplicateImageInput(imageUrlOrData: string): string {
  // Prefer hosted URLs when available. Replicate handles them directly and this
  // avoids sending oversized data URIs to models like LLaVA.
  if (/^https?:\/\//i.test(imageUrlOrData)) {
    return imageUrlOrData;
  }
  return imageUrlOrData;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      image_data,
      model,
      force_ai,
      check_only_cache,
      skip_cache_read,
      skip_persist,
      manual_description,
      delete_description_id,
    } = body as {
      image_data?: string;
      model?: CaptionModel;
      force_ai?: boolean;
      check_only_cache?: boolean;
      skip_cache_read?: boolean;
      skip_persist?: boolean;
      manual_description?: string;
      delete_description_id?: string;
    };

    const selectedModel: CaptionModel = model || 'llava13b';

    if (!image_data) {
      return NextResponse.json({ error: 'Immagine mancante.' }, { status: 400 });
    }

    const sourceUrl = /^https?:\/\//i.test(image_data) ? image_data : undefined;
    let contentHash: string | null = null;
    try {
      contentHash = await computeImageContentHash(image_data);
    } catch (hashError) {
      console.warn('Hash immagine non disponibile, continuo senza cache.', hashError);
    }

    if (delete_description_id) {
      try {
        const toDelete = await prisma.imageDescription.findUnique({
          where: { id: delete_description_id },
          include: { image: true },
        });

        if (!toDelete) {
          return NextResponse.json({ error: 'Descrizione non trovata.' }, { status: 404 });
        }

        await prisma.imageDescription.delete({
          where: { id: delete_description_id },
        });

        const latestRemaining = await prisma.imageDescription.findFirst({
          where: {
            imageId: toDelete.imageId,
            captionModel: selectedModel,
            promptVersion: CAPTION_PROMPT_VERSION,
            language: CAPTION_LANGUAGE,
          },
          orderBy: { createdAt: 'desc' },
        });

        await prisma.imageDescription.updateMany({
          where: {
            imageId: toDelete.imageId,
            captionModel: selectedModel,
            promptVersion: CAPTION_PROMPT_VERSION,
            language: CAPTION_LANGUAGE,
          },
          data: { isActive: false },
        });

        if (latestRemaining) {
          await prisma.imageDescription.update({
            where: { id: latestRemaining.id },
            data: { isActive: true },
          });
        }

        const history = await fetchDescriptionHistory(toDelete.image.contentHash, selectedModel);
        const selected = history.find((item) => item.isActive) || history[0] || null;

        return NextResponse.json({
          deleted: true,
          history,
          selectedDescriptionId: selected?.id || null,
          description: selected?.description || '',
          source: selected ? (selected.sourceType === 'manual' ? 'cache_manual' : 'cache_ai') : 'none',
        });
      } catch (dbDeleteError) {
        console.warn('Delete descrizione fallita.', dbDeleteError);
        return NextResponse.json({ error: 'Impossibile eliminare la descrizione dal database.' }, { status: 500 });
      }
    }

    const manualDescription = (manual_description || '').trim();
    if (manualDescription) {
      if (!contentHash) {
        return NextResponse.json({ error: 'Impossibile salvare descrizione manuale: hash immagine non disponibile.' }, { status: 500 });
      }
      let history: DescriptionHistoryItem[] = [];
      try {
        await upsertActiveDescription({
          contentHash,
          sourceUrl,
          captionModel: selectedModel,
          description: manualDescription,
          sourceType: 'manual',
        });
        history = await fetchDescriptionHistory(contentHash, selectedModel);
      } catch (dbError) {
        console.warn('Salvataggio descrizione manuale fallito.', dbError);
        return NextResponse.json({ error: 'Descrizione salvata localmente ma non persistita nel database.' }, { status: 500 });
      }

      return NextResponse.json({
        description: manualDescription,
        source: 'manual_saved',
        history,
        selectedDescriptionId: history.find((item) => item.isActive)?.id || history[0]?.id || null,
      });
    }

    if (!force_ai && !skip_cache_read && contentHash) {
      try {
        const cached = await prisma.imageDescription.findFirst({
          where: {
            image: { contentHash },
            captionModel: selectedModel,
            promptVersion: CAPTION_PROMPT_VERSION,
            language: CAPTION_LANGUAGE,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (cached?.description) {
          const history = await fetchDescriptionHistory(contentHash, selectedModel);
          return NextResponse.json({
            description: cached.description,
            source: cached.sourceType === 'manual' ? 'cache_manual' : 'cache_ai',
            cached: true,
            history,
            selectedDescriptionId: cached.id,
          });
        }

        if (check_only_cache) {
          return NextResponse.json({
            cacheMiss: true,
          });
        }
      } catch (dbReadError) {
        console.warn('Cache read fallita, procedo con AI.', dbReadError);
        if (check_only_cache) {
          return NextResponse.json({
            cacheMiss: true,
          });
        }
      }
    }

    if (check_only_cache) {
      return NextResponse.json({
        cacheMiss: true,
      });
    }

    const replicateImageInput = getReplicateImageInput(image_data);
    const img = /^https?:\/\//i.test(replicateImageInput)
      ? replicateImageInput
      : await convertToBase64(replicateImageInput);
    let output;
    if (selectedModel === 'llava13b') {
      const input = {
        image: img,
        prompt: PROMPTS.img2text.llava13bPrompt,
        max_tokens: 400,
        temperature: 0.2,
        top_p: 1,
      };
      try {
        output = await replicate.run('yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb', { input });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Errore generazione descrizione (LLaVA-13B).', replicate_detail: err }, { status: 500 });
      }
    } else if (selectedModel === 'blip2') {
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
        question: PROMPTS.img2text.blip3Question,
        top_k: 50,
        top_p: 1,
        do_sample: false,
        num_beams: 1,
        temperature: 1,
        system_prompt: PROMPTS.img2text.blip3SystemPrompt,
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
    let description: string | null = null;
    if (typeof output === 'string') {
      description = output;
    } else if (Array.isArray(output) && output.length && typeof output[0] === 'string') {
      description = output.join('').trim();
    }

    if (description) {
      let history: DescriptionHistoryItem[] = [];
      let selectedDescriptionId: string | null = null;
      if (contentHash && !skip_persist) {
        try {
          await upsertActiveDescription({
            contentHash,
            sourceUrl,
            captionModel: selectedModel,
            description,
            sourceType: 'ai',
          });
          history = await fetchDescriptionHistory(contentHash, selectedModel);
          selectedDescriptionId = history.find((item) => item.isActive)?.id || history[0]?.id || null;
        } catch (dbWriteError) {
          console.warn('Cache write fallita dopo AI.', dbWriteError);
        }
      }
      return NextResponse.json({
        description,
        source: force_ai ? 'ai_forced' : 'ai',
        history,
        selectedDescriptionId,
      });
    } else {
      return NextResponse.json({ error: 'Nessuna descrizione generata.', replicate_detail: output }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
