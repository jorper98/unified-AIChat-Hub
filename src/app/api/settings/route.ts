import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Fetch current saved settings
export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection('settings').findOne({ _id: 'global_settings' as any });
    
    // Default fallback list if database is empty
    const defaultModels = [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "deepseek/deepseek-chat",
      "google/gemini-pro",
      "google/gemini-flash-lite",
      "qwen/qwen-2.5-72b-instruct"
    ];

    return NextResponse.json({
      selectedModels: settings?.selectedModels || defaultModels
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save updated settings order
export async function POST(request: Request) {
  try {
    const { selectedModels } = await request.json();
    const db = await getDb();

    await db.collection('settings').updateOne(
      { _id: 'global_settings' as any },
      { $set: { selectedModels, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}