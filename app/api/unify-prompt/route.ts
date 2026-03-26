import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { descriptions } = await req.json();
    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json({ error: 'Nessuna descrizione fornita.' }, { status: 400 });
    }
    // Chiamata a modello AI (es: OpenAI, Replicate, ecc.)
    // Qui esempio con OpenAI API (sostituisci con la tua chiave e modello)
    const prompt = `Unify these descriptions into a single prompt, maintaining consistency and richness of visual details. The result must be a visual description ready for image generation, without superfluous words, without interpretations, without comments—only objective, visual details. It must always refer to ONE subject only. Write in English:\n\n${descriptions.map((d, i) => `${i+1}. ${d}`).join('\n')}`;
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an assistant that writes visual prompts for image generation in English. The prompt must be only an objective visual description, without superfluous words, without interpretations, without comments.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7
      })
    });
    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return NextResponse.json({ error: 'Errore AI', detail: err }, { status: 500 });
    }
    const data = await openaiRes.json();
    const aiPrompt = data.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ prompt: aiPrompt });
  } catch (e: any) {
    return NextResponse.json({ error: 'Errore server', detail: e?.message || e?.toString() }, { status: 500 });
  }
}
