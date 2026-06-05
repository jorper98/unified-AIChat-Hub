import { getDb } from '@/lib/db';
import modelConfig from '@/config/models.json';
import { SettingsDocument } from '@/lib/types';

export async function getProviderForModel(modelId: string) {
  const db = await getDb();
  const settings = await db.collection<SettingsDocument>('settings').findOne({ _id: 'global_settings' });

  const providers = settings?.providers || modelConfig.providers;
  const models = settings?.models || [];
  
  const modelEntry = models.find((m: any) => m.id === modelId);
  const providerId = modelEntry?.provider || 'openrouter';
  const provider = providers.find((p: any) => p.id === providerId);
  
  if (!provider) {
    return { id: 'openrouter', name: 'OpenRouter', type: 'api', endpoint: 'https://openrouter.ai/api/v1/chat/completions', apiKeyEnv: 'OPENROUTER_API_KEY' };
  }
  
  if (!provider.endpoint || provider.endpoint.trim() === '') {
    const configProvider = modelConfig.providers.find((p: any) => p.id === providerId);
    if (configProvider) {
      return { ...provider, endpoint: configProvider.endpoint, apiKeyEnv: configProvider.apiKeyEnv };
    }
  }
  
  return provider;
}