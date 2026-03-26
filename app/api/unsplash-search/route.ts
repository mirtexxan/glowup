import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const DEFAULT_COUNT = 10;

export async function POST(req: NextRequest) {
  try {
    const { query, count, source } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }
    const perPage = count && typeof count === 'number' ? count : DEFAULT_COUNT;
    const usePexels = !source || source === 'pexels';

    if (usePexels) {
      // PEXELS API
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=1`;
      const res = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY }
      });
      if (!res.ok) {
        const detail = await res.text();
        return NextResponse.json({ error: 'Pexels API error', detail }, { status: 500 });
      }
      const data = await res.json();
      const results = (data.photos || []).map((img: any) => ({
        id: img.id,
        src: img.src.medium || img.src.large || img.src.original,
        title: img.alt || img.photographer || 'Untitled',
      }));
      return NextResponse.json({ images: results });
    } else {
      // UNSPLASH API semplice: solo prima pagina
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=1&client_id=${UNSPLASH_ACCESS_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        const detail = await res.text();
        return NextResponse.json({ error: 'Unsplash API error', detail }, { status: 500 });
      }
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        return NextResponse.json({ images: [] });
      }
      const mapped = data.results.map((img: any) => ({
        id: img.id,
        src: img.urls.regular,
        title: img.alt_description || img.description || 'Untitled',
      }));
      return NextResponse.json({ images: mapped });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
