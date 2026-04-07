import { NextRequest, NextResponse } from 'next/server';
import { PROMPTS, buildUnifiedPromptUserMessage } from '../../../lib/prompts';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { descriptions, subjectIdentityMetadata, subjectDescription } = await req.json();
    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json({ error: 'Nessuna descrizione fornita.' }, { status: 400 });
    }
    // Chiamata a modello AI (es: OpenAI, Replicate, ecc.)
    // Qui esempio con OpenAI API (sostituisci con la tua chiave e modello)
    const safeSubjectMetadata = typeof subjectIdentityMetadata === 'string'
      ? subjectIdentityMetadata
      : (typeof subjectDescription === 'string' ? subjectDescription : undefined);
    const prompt = buildUnifiedPromptUserMessage(descriptions, safeSubjectMetadata);
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: PROMPTS.unifyPrompt.systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.2
      })
    });
    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return NextResponse.json(
        {
          error: 'Errore AI',
          status: openaiRes.status,
          statusText: openaiRes.statusText,
          detail: err,
        },
        { status: 500 }
      );
    }
    const data = await openaiRes.json();
    const aiPrompt = data.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ prompt: aiPrompt });
  } catch (e: any) {
    return NextResponse.json({ error: 'Errore server', detail: e?.message || e?.toString() }, { status: 500 });
  }
}
