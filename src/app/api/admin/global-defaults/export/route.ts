import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { SettingsDocument } from '@/lib/types';

const GLOBAL_DEFAULTS_ID = 'global_new_user_defaults';

function getAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const decoded = verifyAuthToken(token);
  if (!decoded || decoded.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin.ok) {
    return admin.response as NextResponse;
  }

  try {
    const db = await getDb();
    const stored = await db.collection<SettingsDocument>('settings').findOne({ _id: GLOBAL_DEFAULTS_ID as any });

    if (!stored || !stored.providers || !stored.models) {
      return NextResponse.json({ error: 'No saved defaults found. Save defaults first.' }, { status: 404 });
    }

    const savedModels = stored.models;
    const savedProviders = stored.providers;

    // Transform MongoDB data to models.json format
    const providersWithModels = savedProviders.map((provider: any) => {
      const providerModels = savedModels
        .filter((model: any) => model.provider === provider.id)
        .map((model: any) => ({
          id: model.id,
          name: model.name,
          default: true
        }));

      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        endpoint: provider.endpoint,
        apiKeyEnv: provider.apiKeyEnv || null,
        models: providerModels
      };
    });

    const selectedModels = savedModels.map((model: any) => model.id);

    const modelsJson: any = {
      providers: providersWithModels,
      selectedModels
    };

    if (stored.routerModel) {
      modelsJson.routerModel = stored.routerModel;
    }
    if (stored.imageGenerationModel) {
      modelsJson.imageGenerationModel = stored.imageGenerationModel;
    }

    if (stored.creditPrice !== undefined) {
      modelsJson.creditPrice = stored.creditPrice;
    }
    if (stored.creditAmount !== undefined) {
      modelsJson.creditAmount = stored.creditAmount;
    }

    // Write to models.json
    const modelsJsonPath = join(process.cwd(), 'src', 'config', 'models.json');
    await writeFile(modelsJsonPath, JSON.stringify(modelsJson, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: 'Exported to models.json successfully',
      providersCount: providersWithModels.length,
      modelsCount: selectedModels.length
    });
  } catch (error: any) {
    console.error('Export to models.json error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export' }, { status: 500 });
  }
}
