import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import modelConfig from '@/config/models.json';
import { SettingsDocument } from '@/lib/types';

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
    const settings = await db.collection<SettingsDocument>('settings').findOne({ _id: 'global_settings' });
    
    // SECURITY: Explicitly return only safe, UI-necessary fields to prevent leaking 
    // sensitive data like apiKeyEnv or other internal configuration.
    return NextResponse.json({
      models: settings?.models || DEFAULT_MODELS,
      providers: settings?.providers || DEFAULT_PROVIDERS,
      theme: settings?.theme || 'dark',
      themeColors: settings?.themeColors || null,
      globalSystemPrompt: settings?.globalSystemPrompt || '',
      routerModel: settings?.routerModel || 'openai/gpt-4o-mini',
      imageGenerationModel: settings?.imageGenerationModel || 'google/gemini-3.1-flash-image-preview'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { models, providers, theme, themeColors, globalSystemPrompt, routerModel, imageGenerationModel } = await request.json();
    const db = await getDb();

    const updateData: any = { updatedAt: new Date() };
    if (models !== undefined) updateData.models = models;
    if (providers !== undefined) updateData.providers = providers;
    if (theme !== undefined) updateData.theme = theme;
    if (themeColors !== undefined) updateData.themeColors = themeColors;
    if (globalSystemPrompt !== undefined) updateData.globalSystemPrompt = globalSystemPrompt;
    if (routerModel !== undefined) updateData.routerModel = routerModel;
    if (imageGenerationModel !== undefined) updateData.imageGenerationModel = imageGenerationModel;

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
