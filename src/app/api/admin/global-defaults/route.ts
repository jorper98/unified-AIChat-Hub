import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import modelConfig from '@/config/models.json';
import { SettingsDocument } from '@/lib/types';

const GLOBAL_DEFAULTS_ID = 'global_new_user_defaults';
const OPENROUTER_CONFIG = modelConfig.providers.find((p: any) => p.id === 'openrouter');

type ProviderDefaults = {
  id: string;
  name: string;
  type: 'api' | 'local';
  endpoint: string;
  apiKeyEnv?: string | null;
};

type ModelDefaults = {
  id: string;
  name: string;
  provider: string;
};

type ValidatedDefaults = {
  providers: ProviderDefaults[];
  models: ModelDefaults[];
  routerModel?: string;
  imageGenerationModel?: string;
  creditPrice?: number;
  creditAmount?: number;
};

function getDefaultProviders(): ProviderDefaults[] {
  return modelConfig.providers.map((p: any) => ({
    id: String(p.id),
    name: String(p.name),
    type: p.type,
    endpoint: String(p.endpoint || ''),
    apiKeyEnv: p.apiKeyEnv ?? null
  }));
}

function getDefaultModels(): ModelDefaults[] {
  return modelConfig.selectedModels.map((id: string) => {
    for (const provider of modelConfig.providers) {
      const model = provider.models?.find((m: any) => m.id === id);
      if (model) {
        return { id: String(model.id), name: String(model.name), provider: String(provider.id) };
      }
    }
    return { id, name: id, provider: 'openrouter' };
  });
}

function getDefaultRouterModel(): string {
  return (modelConfig as any).routerModel || getDefaultModels()[0]?.id || 'openai/gpt-4o';
}

function getDefaultImageGenerationModel(): string {
  const configModel = (modelConfig as any).imageGenerationModel;
  if (configModel) return configModel;
  const models = getDefaultModels();
  return models.find((m) => m.id.includes('image') || m.id.includes('gemini'))?.id || models[0]?.id || 'openai/gpt-4o';
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateEndpoint(endpoint: unknown): string | null {
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    return 'Endpoint is required.';
  }

  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'Endpoint must use http or https.';
    }
  } catch {
    return 'Endpoint must be a valid URL.';
  }

  return null;
}

function validateDefaults(input: unknown): { ok: true; defaults: ValidatedDefaults } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: 'Request body is required.' };
  }

  if (!Array.isArray(input.providers) || input.providers.length === 0) {
    return { ok: false, error: 'At least one provider is required.' };
  }

  if (!Array.isArray(input.models) || input.models.length === 0) {
    return { ok: false, error: 'At least one model is required.' };
  }

  const providers: ProviderDefaults[] = [];
  const providerIds = new Set<string>();

  for (let index = 0; index < input.providers.length; index++) {
    const provider = input.providers[index];

    if (!isRecord(provider)) {
      return { ok: false, error: `Provider #${index + 1} must be an object.` };
    }

    const id = String(provider.id || '').trim();
    if (!id) {
      return { ok: false, error: `Provider #${index + 1} is missing an id.` };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return { ok: false, error: `Provider id "${id}" can only contain letters, numbers, underscores, and dashes.` };
    }

    if (providerIds.has(id)) {
      return { ok: false, error: `Provider id "${id}" is duplicated.` };
    }

    const name = String(provider.name || '').trim();

    if (id === 'openrouter') {
      if (name !== 'OpenRouter') {
        return { ok: false, error: 'OpenRouter provider name must remain "OpenRouter".' };
      }
      if (provider.type !== 'api') {
        return { ok: false, error: 'OpenRouter provider type must remain "api".' };
      }
      if (String(provider.endpoint || '').trim() !== OPENROUTER_CONFIG?.endpoint) {
        return { ok: false, error: 'OpenRouter endpoint cannot be changed.' };
      }
    }

    if (!name) {
      return { ok: false, error: `Provider "${id}" is missing a name.` };
    }

    if (!['api', 'local'].includes(provider.type)) {
      return { ok: false, error: `Provider "${id}" must have type "api" or "local".` };
    }

    const endpointError = validateEndpoint(provider.endpoint);
    if (endpointError) {
      return { ok: false, error: `Provider "${id}": ${endpointError}` };
    }

    providerIds.add(id);
    providers.push({
      id,
      name,
      type: provider.type,
      endpoint: String(provider.endpoint).trim(),
      apiKeyEnv: id === 'openrouter' ? 'OPENROUTER_API_KEY' : (provider.apiKeyEnv ?? null)
    });
  }

  const models: ModelDefaults[] = [];
  const modelIds = new Set<string>();

  for (let index = 0; index < input.models.length; index++) {
    const model = input.models[index];

    if (!isRecord(model)) {
      return { ok: false, error: `Model #${index + 1} must be an object.` };
    }

    const id = String(model.id || '').trim();
    if (!id) {
      return { ok: false, error: `Model #${index + 1} is missing an id.` };
    }

    if (modelIds.has(id)) {
      return { ok: false, error: `Model id "${id}" is duplicated.` };
    }

    const name = String(model.name || '').trim();
    if (!name) {
      return { ok: false, error: `Model "${id}" is missing a name.` };
    }

    const provider = String(model.provider || '').trim();
    if (!providerIds.has(provider)) {
      return { ok: false, error: `Model "${id}" references unknown provider "${provider}".` };
    }

    modelIds.add(id);
    models.push({ id, name, provider });
  }

  const result: ValidatedDefaults = { providers, models };

  if (input.routerModel !== undefined) {
    const routerModel = String(input.routerModel || '').trim();
    if (routerModel && !modelIds.has(routerModel)) {
      return { ok: false, error: `Router model "${routerModel}" is not in the models list.` };
    }
    result.routerModel = routerModel || undefined;
  }

  if (input.imageGenerationModel !== undefined) {
    const imageGenerationModel = String(input.imageGenerationModel || '').trim();
    if (imageGenerationModel && !modelIds.has(imageGenerationModel)) {
      return { ok: false, error: `Image generation model "${imageGenerationModel}" is not in the models list.` };
    }
    result.imageGenerationModel = imageGenerationModel || undefined;
  }

  if (input.creditPrice !== undefined) {
    const creditPrice = Number(input.creditPrice);
    if (!Number.isInteger(creditPrice) || creditPrice < 0) {
      return { ok: false, error: 'Credit price must be a non-negative integer in cents (e.g., 300 for $3.00).' };
    }
    result.creditPrice = creditPrice;
  }

  if (input.creditAmount !== undefined) {
    const creditAmount = Number(input.creditAmount);
    if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
      return { ok: false, error: 'Credit amount must be a positive integer (e.g., 50 for 50 messages).' };
    }
    result.creditAmount = creditAmount;
  }

  return { ok: true, defaults: result };
}

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

export async function GET(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin.ok) {
    return admin.response as NextResponse;
  }

  const db = await getDb();
  const stored = await db.collection<SettingsDocument>('settings').findOne({ _id: GLOBAL_DEFAULTS_ID as any });

  const models = stored?.models || getDefaultModels();
  const defaultRouterModel = getDefaultRouterModel();
  const defaultImageModel = getDefaultImageGenerationModel();

  return NextResponse.json({
    models,
    providers: stored?.providers || getDefaultProviders(),
    routerModel: stored?.routerModel || defaultRouterModel,
    imageGenerationModel: stored?.imageGenerationModel || defaultImageModel,
    creditPrice: stored?.creditPrice ?? 300,
    creditAmount: stored?.creditAmount ?? 50,
  });
}

export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin.ok) {
    return admin.response as NextResponse;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateDefaults(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = await getDb();
  await db.collection('settings').updateOne(
    { _id: GLOBAL_DEFAULTS_ID as any },
    { $set: { ...validation.defaults, updatedAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ success: true, ...validation.defaults });
}

export async function DELETE(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin.ok) {
    return admin.response as NextResponse;
  }

  const db = await getDb();
  await db.collection('settings').deleteOne({ _id: GLOBAL_DEFAULTS_ID as any });

  return NextResponse.json({ success: true, message: 'Saved new user defaults removed. New users will use app defaults.' });
}
