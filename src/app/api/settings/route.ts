import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import modelConfig from '@/config/models.json';

const DEFAULT_PROVIDERS = modelConfig.providers.map((p: any) => ({ id: p.id, name: p.name, type: p.type }));
const DEFAULT_MODELS = modelConfig.selectedModels.map((id: string) => {
  for (const provider of modelConfig.providers) {
    const model = provider.models.find((m: any) => m.id === id);
    if (model) return { id: model.id, name: model.name, provider: provider.id };
  }
  return { id, name: id, provider: 'openrouter' };
});

export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection('settings').findOne({ _id: 'global_settings' as any });
    
    return NextResponse.json({
      models: settings?.models || DEFAULT_MODELS,
      providers: settings?.providers || DEFAULT_PROVIDERS,
      theme: settings?.theme || 'dark',
      themeColors: settings?.themeColors || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { models, providers, theme, themeColors } = await request.json();
    const db = await getDb();

    const updateData: any = { updatedAt: new Date() };
    if (models !== undefined) updateData.models = models;
    if (providers !== undefined) updateData.providers = providers;
    if (theme !== undefined) updateData.theme = theme;
    if (themeColors !== undefined) updateData.themeColors = themeColors;

    await db.collection('settings').updateOne(
      { _id: 'global_settings' as any },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
