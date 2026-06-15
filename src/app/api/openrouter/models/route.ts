import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
      // OpenRouter models endpoint is public, but we add a referer for good measure
      cache: 'force-cache', // Cache for 1 hour to avoid hitting rate limits
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch models from OpenRouter');
    }
    
    const data = await res.json();
    const models = data.data || [];
    
    // Sort alphabetically by ID for consistent ordering
    models.sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    return NextResponse.json({ models });
  } catch (error: any) {
    console.error('OpenRouter models fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch models' }, { status: 500 });
  }
}
