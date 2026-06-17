'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MODEL_PRICING } from '@/lib/tokens';
import modelConfig from '@/config/models.json';

interface Model {
  id: string;
  name: string;
  provider: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKeyEnv?: string;
}

interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  border: string;
  borderAlt: string;
}

const defaultProvidersFromConfig: Provider[] = modelConfig.providers.map((p: any) => ({ id: p.id, name: p.name, type: p.type, endpoint: p.endpoint, apiKeyEnv: p.apiKeyEnv }));
const defaultModelsFromConfig: Model[] = modelConfig.selectedModels.map((id: string) => {
  for (const provider of modelConfig.providers) {
    const model = provider.models.find((m: any) => m.id === id);
    if (model) return { id: model.id, name: model.name, provider: provider.id };
  }
  return { id, name: id, provider: 'openrouter' };
});

function getDefaultRouterModel(): string {
  return (modelConfig as any).routerModel || defaultModelsFromConfig[0]?.id || 'openai/gpt-4o';
}

function getDefaultImageGenerationModel(): string {
  const configModel = (modelConfig as any).imageGenerationModel;
  if (configModel) return configModel;
  return defaultModelsFromConfig.find((m) => m.id.includes('image') || m.id.includes('gemini'))?.id || defaultModelsFromConfig[0]?.id || 'openai/gpt-4o';
}

const DEFAULT_DARK: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  surfaceAlt: '#030712',
  bgSecondary: '#374151',
  bgTertiary: '#4b5563',
  textPrimary: '#f3f4f6',
  textSecondary: '#d1d5db',
  textMuted: '#6b7280',
  accent: '#6366f1',
  accentHover: '#818cf8',
  border: '#374151',
  borderAlt: '#1f2937'
};

const DEFAULT_LIGHT: ThemeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  bgSecondary: '#d1d5db',
  bgTertiary: '#9ca3af',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9ca3af',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  border: '#e5e7eb',
  borderAlt: '#d1d5db'
};

type SettingsSection = 'models' | 'providers' | 'global-defaults' | 'theme' | 'backup' | 'global-prompt' | 'utility-llms' | 'testing' | 'users';

export default function SettingsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [globalDefaultModels, setGlobalDefaultModels] = useState<Model[]>([]);
  const [globalDefaultProviders, setGlobalDefaultProviders] = useState<Provider[]>([]);
  const [globalDefaultRouterModel, setGlobalDefaultRouterModel] = useState(getDefaultRouterModel());
  const [globalDefaultImageGenerationModel, setGlobalDefaultImageGenerationModel] = useState(getDefaultImageGenerationModel());
  const [globalDefaultsLoading, setGlobalDefaultsLoading] = useState(false);
  const [globalDefaultsSaving, setGlobalDefaultsSaving] = useState(false);
  const [globalDefaultsResetting, setGlobalDefaultsResetting] = useState(false);
  const [globalDefaultsValidation, setGlobalDefaultsValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [exportingToJson, setExportingToJson] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showOpenRouterModal, setShowOpenRouterModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelProvider, setModelProvider] = useState('openrouter');
  const [providerName, setProviderName] = useState('');
  const [providerEndpoint, setProviderEndpoint] = useState('');
  const [providerType, setProviderType] = useState('local');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('models');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<any[]>([]);
  const [loadingOpenRouterModels, setLoadingOpenRouterModels] = useState(false);
  const [openRouterSearch, setOpenRouterSearch] = useState('');
  const [darkColors, setDarkColors] = useState<ThemeColors>(DEFAULT_DARK);
  const [lightColors, setLightColors] = useState<ThemeColors>(DEFAULT_LIGHT);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [selectedProviderFilters, setSelectedProviderFilters] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<Record<string, { valid: boolean; message: string }>>({});
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [backuping, setBackuping] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  const [routerModel, setRouterModel] = useState('openai/gpt-4o-mini');
  const [imageGenerationModel, setImageGenerationModel] = useState('google/gemini-3.1-flash-image-preview');
  const [timezone, setTimezone] = useState('UTC');
  const [weatherLocation, setWeatherLocation] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // User management state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingCreditsUserId, setResettingCreditsUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Testing state
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testingEmail, setTestingEmail] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
    
    // Check for tab query parameter to open a specific section on load
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['models', 'providers', 'global-defaults', 'theme', 'global-prompt', 'utility-llms', 'backup', 'testing', 'users'].includes(tab)) {
        setActiveSection(tab as SettingsSection);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      applyThemeColors();
    }
  }, [darkColors, lightColors, theme, mounted]);

  const applyThemeColors = () => {
    const colors = theme === 'dark' ? darkColors : lightColors;
    const root = document.documentElement;
    root.style.setProperty('--bg-background', colors.background);
    root.style.setProperty('--bg-surface', colors.surface);
    root.style.setProperty('--bg-surface-alt', colors.surfaceAlt);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-muted', colors.textMuted);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-hover', colors.accentHover);
    root.style.setProperty('--border-color', colors.border);
    root.style.setProperty('--border-alt', colors.borderAlt);
  };

  const isDark = mounted ? theme === 'dark' : true;

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.models) setModels(data.models);
        if (data.providers) setProviders(data.providers);
        else setProviders(modelConfig.providers.map((p: any) => ({ id: p.id, name: p.name, type: p.type, endpoint: p.endpoint })));
        if (data.theme) setTheme(data.theme);
        if (data.themeColors) {
          if (data.themeColors.dark) setDarkColors(prev => ({ ...DEFAULT_DARK, ...data.themeColors.dark }));
          if (data.themeColors.light) setLightColors(prev => ({ ...DEFAULT_LIGHT, ...data.themeColors.light }));
        }
        if (data.globalSystemPrompt !== undefined) setGlobalSystemPrompt(data.globalSystemPrompt || '');
        if (data.routerModel) setRouterModel(data.routerModel);
        if (data.imageGenerationModel) setImageGenerationModel(data.imageGenerationModel);
        if (data.timezone) setTimezone(data.timezone);
        if (data.weatherLocation !== undefined) setWeatherLocation(data.weatherLocation || '');
      });

    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          if (data.user.openRouterApiKey !== undefined) {
            setApiKey(data.user.openRouterApiKey || '');
          }
          setIsAdmin(data.user.role === 'admin');
        }
      });
  }, []);

  useEffect(() => {
    if (activeSection === 'users' && isAdmin) {
      loadUsers();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (activeSection === 'global-defaults' && isAdmin) {
      loadGlobalDefaults();
    }
  }, [activeSection, isAdmin]);

  const fetchProviderModels = async (providerId: string, providerList: Provider[] = providers) => {
    const provider = providerList.find(p => p.id === providerId);
    if (!provider || !provider.endpoint) return;

    setFetchingModels(true);
    setAvailableModels([]);
    try {
      let url = provider.endpoint;
      if (provider.id === 'ollama') {
        url = provider.endpoint.replace('/api/chat', '/api/tags');
      } else if (provider.id === 'llm-studio' || provider.id === 'openai-local') {
        url = provider.endpoint.replace('/v1/chat/completions', '/v1/models');
      }

      const res = await fetch(url);
      const data = await res.json();

      if (provider.id === 'ollama') {
        const modelNames = data.models?.map((m: any) => m.name) || [];
        setAvailableModels(modelNames);
      } else {
        const modelNames = data.data?.map((m: any) => m.id) || [];
        setAvailableModels(modelNames);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    } finally {
      setFetchingModels(false);
    }
  };

  const fetchOpenRouterModels = async () => {
    setLoadingOpenRouterModels(true);
    setOpenRouterSearch('');
    try {
      const res = await fetch('/api/openrouter/models');
      const data = await res.json();
      if (res.ok && data.models) {
        setOpenRouterModels(data.models);
      } else {
        console.error('Failed to fetch OpenRouter models');
      }
    } catch (e) {
      console.error('Failed to fetch OpenRouter models:', e);
    } finally {
      setLoadingOpenRouterModels(false);
    }
  };

  const selectOpenRouterModel = (model: any) => {
    setModelId(model.id);
    setModelName(model.name);
    setModelProvider('openrouter');
    setShowOpenRouterModal(false);
  };

  const filteredOpenRouterModels = openRouterModels.filter((m: any) => 
    openRouterSearch === '' || 
    m.id.toLowerCase().includes(openRouterSearch.toLowerCase()) || 
    m.name.toLowerCase().includes(openRouterSearch.toLowerCase())
  ).slice(0, 50); // Limit to 50 to keep UI snappy

  const readOpenRouterPrice = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getOpenRouterModelPricing = (model: any) => {
    const pricing = model?.pricing || {};
    const inputPerToken = readOpenRouterPrice(pricing.prompt ?? pricing.input);
    const outputPerToken = readOpenRouterPrice(pricing.completion ?? pricing.output);

    if (inputPerToken !== null || outputPerToken !== null) {
      return {
        input: inputPerToken === null ? 0 : inputPerToken * 1_000_000,
        output: outputPerToken === null ? 0 : outputPerToken * 1_000_000,
        source: 'OpenRouter'
      };
    }

    const localPricing = MODEL_PRICING[model?.id];
    if (localPricing) {
      return { input: localPricing.input, output: localPricing.output, source: 'Saved' };
    }

    return null;
  };

  const formatModelPrice = (value: number) => {
    if (!Number.isFinite(value)) return 'N/A';
    if (value === 0) return '$0.00';
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(2)}`;
  };

  const formatOpenRouterModelPricing = (model: any) => {
    const pricing = getOpenRouterModelPricing(model);
    if (!pricing) return 'Price unavailable';
    return `${pricing.source}: In ${formatModelPrice(pricing.input)} / Out ${formatModelPrice(pricing.output)} per 1M`;
  };

  const getOpenRouterModelUrl = (model: any) => {
    if (model?.url) return model.url;
    const modelId = String(model?.id || '').trim();
    return `https://openrouter.ai/models/${encodeURIComponent(modelId).replace(/%2F/g, '/')}`;
  };

  const saveModel = () => {
    if (!modelId.trim() || !modelName.trim()) return;
    const isGlobalDefaultsMode = activeSection === 'global-defaults';
    if (isGlobalDefaultsMode) {
      setGlobalDefaultModels(prev => prev.map(m => m.id === editingModel?.id ? { id: modelId.trim(), name: modelName.trim(), provider: modelProvider } : m));
      if (!editingModel) {
        setGlobalDefaultModels(prev => [...prev, { id: modelId.trim(), name: modelName.trim(), provider: modelProvider }]);
      }
    } else {
      if (editingModel) {
        setModels(prev => prev.map(m => m.id === editingModel.id ? { id: modelId.trim(), name: modelName.trim(), provider: modelProvider } : m));
      } else {
        setModels(prev => [...prev, { id: modelId.trim(), name: modelName.trim(), provider: modelProvider }]);
      }
    }
    setShowAddModal(false);
  };

  const deleteModel = (id: string) => {
    if (activeSection === 'global-defaults') {
      setGlobalDefaultModels(prev => prev.filter(m => m.id !== id));
    } else {
      setModels(prev => prev.filter(m => m.id !== id));
    }
  };

  const openAddProviderModal = () => {
    setEditingProvider(null);
    setProviderName('');
    setProviderEndpoint('');
    setProviderType('local');
    setShowProviderModal(true);
  };

  const saveProvider = () => {
    if (!providerName.trim() || !providerEndpoint.trim()) return;
    if (editingProvider && editingProvider.id === 'openrouter') return;
    const isGlobalDefaultsMode = activeSection === 'global-defaults';
    const id = providerName.toLowerCase().replace(/\s+/g, '-');
    if (isGlobalDefaultsMode) {
      setGlobalDefaultProviders(prev => prev.map(p => p.id === editingProvider?.id ? { ...p, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType } : p));
      if (!editingProvider) {
        setGlobalDefaultProviders(prev => [...prev, { id, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType }]);
      }
    } else {
      if (editingProvider) {
        setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType } : p));
      } else {
        setProviders(prev => [...prev, { id, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType }]);
      }
    }
    setShowProviderModal(false);
  };

  const deleteProvider = (id: string) => {
    if (id === 'openrouter') return;
    if (activeSection === 'global-defaults') {
      setGlobalDefaultProviders(prev => prev.filter(p => p.id !== id));
      setGlobalDefaultModels(prev => prev.filter(m => m.provider !== id));
    } else {
      setProviders(prev => prev.filter(p => p.id !== id));
      setModels(prev => prev.filter(m => m.provider !== id));
    }
  };

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');

  const handleExportModels = async () => {
    try {
      setImporting(true);
      const res = await fetch('/api/settings/models/export');
      if (!res.ok) throw new Error('Failed to export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unified-chat-models-providers-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportResult('Exported successfully!');
    } catch (error: any) {
      setImportError(error.message || 'Failed to export');
    } finally {
      setImporting(false);
    }
  };

  const handleImportModels = async (file: File, mode: 'replace' | 'merge') => {
    try {
      setImporting(true);
      setImportError('');
      setImportResult('');
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await fetch('/api/settings/models/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mode })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import');
      }
      
      await res.json();
      setImportResult(`Imported successfully (${mode} mode).`);
      
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.models) setModels(data.models);
          if (data.providers) setProviders(data.providers);
        });
    } catch (error: any) {
      setImportError(error.message || 'Failed to parse or import file');
    } finally {
      setImporting(false);
    }
  };

  const openEditProviderModal = (provider: Provider) => {
    // Prevent editing openrouter
    if (provider.id === 'openrouter') return;
    setEditingProvider(provider);
    setProviderName(provider.name);
    setProviderEndpoint(provider.endpoint || '');
    setProviderType(provider.type || 'local');
    setShowProviderModal(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...models];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setModels(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleGlobalModelDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleGlobalModelDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...globalDefaultModels];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setGlobalDefaultModels(updated);
    setDraggedIndex(index);
  };

  const handleGlobalProviderDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleGlobalProviderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...globalDefaultProviders];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setGlobalDefaultProviders(updated);
    setDraggedIndex(index);
  };

  async function handleSave() {
    setSaving(true);
    localStorage.setItem('theme', theme);
    
    console.log('[Settings Page] Saving:', { routerModel, imageGenerationModel });
    
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        models,
        providers,
        theme,
        themeColors: { dark: darkColors, light: lightColors },
        globalSystemPrompt,
        routerModel,
        imageGenerationModel,
        timezone,
        weatherLocation
      })
    });
    setSaving(false);
    showToast('Settings saved successfully!');
  }

  async function handleSaveApiKey() {
    setSavingApiKey(true);
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
                apiKey: apiKey === '••••••••••••••••' ? '' : apiKey,
                remove: !apiKey && !hasExistingKey
              }),
      });
      if (res.ok) {
        showToast('API key saved successfully!');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save API key', 'error');
      }
    } catch (e) {
      showToast('An error occurred while saving the API key', 'error');
    } finally {
      setSavingApiKey(false);
    }
  }

  const getProviderName = (providerId: string, providerList: Provider[] = providers) => {
    const provider = providerList.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const customProviders = providers.filter(p => p.id !== 'openrouter');

  const filteredModels = models.filter(m => {
    const matchesSearch = modelSearchQuery === '' ||
      m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearchQuery.toLowerCase());
    const matchesProvider = selectedProviderFilters.size === 0 ||
      selectedProviderFilters.has(m.provider);
    return matchesSearch && matchesProvider;
  });

  const groupedModels = models.reduce((acc: Record<string, Model[]>, model) => {
    const provider = model.provider || 'openrouter';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const filteredGroupedModels = filteredModels.reduce((acc: Record<string, Model[]>, model) => {
    const provider = model.provider || 'openrouter';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const uniqueModelProviders = Array.from(new Set(models.map(m => m.provider)));

  const toggleProviderFilter = (providerId: string) => {
    setSelectedProviderFilters(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setModelSearchQuery('');
    setSelectedProviderFilters(new Set());
  };

  const validateModelId = async (model: Model, providerList: Provider[] = providers) => {
    setValidatingId(model.id);
    try {
      if (model.provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        const data = await res.json();
        const validIds = new Set(data.data?.map((m: any) => m.id) || []);
        const isValid = validIds.has(model.id);
        setValidationResults(prev => ({
          ...prev,
          [model.id]: { valid: isValid, message: isValid ? 'Valid' : 'Not found on OpenRouter' }
        }));
      } else {
        const provider = providerList.find(p => p.id === model.provider);
        if (provider?.endpoint) {
          let url = provider.endpoint;
          if (provider.id === 'ollama') {
            url = provider.endpoint.replace('/api/chat', '/api/tags');
          } else if (provider.endpoint.includes('/v1/chat/completions')) {
            url = provider.endpoint.replace('/v1/chat/completions', '/v1/models');
          }
          const res = await fetch(url);
          const data = await res.json();
          let modelNames: string[] = [];
          if (provider.id === 'ollama') {
            modelNames = data.models?.map((m: any) => m.name) || [];
          } else {
            modelNames = data.data?.map((m: any) => m.id) || [];
          }
          const isValid = modelNames.includes(model.id);
          setValidationResults(prev => ({
            ...prev,
            [model.id]: { valid: isValid, message: isValid ? 'Valid' : `Not found on ${provider.name}` }
          }));
        } else {
          setValidationResults(prev => ({
            ...prev,
            [model.id]: { valid: false, message: 'No endpoint configured' }
          }));
        }
      }
    } catch (e: any) {
      setValidationResults(prev => ({
        ...prev,
        [model.id]: { valid: false, message: `Connection failed: ${e.message}` }
      }));
    } finally {
      setValidatingId(null);
    }
  };

  const validateAll = async (modelsToValidate: Model[] = models, providerList: Provider[] = providers) => {
    setValidatingAll(true);
    for (const model of modelsToValidate) {
      await validateModelId(model, providerList);
    }
    setValidatingAll(false);
  };

  const moveModel = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setModels(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleBackup = async () => {
    setBackuping(true);
    try {
      const res = await fetch('/api/settings/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unified-chat-backup-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast('Backup failed: ' + e.message, 'error');
    } finally {
      setBackuping(false);
    }
  };

  const handleRestore = async (file: File) => {
    setRestoring(true);
    setRestoreResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', restoreMode);
      const res = await fetch('/api/settings/import', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        setRestoreResult({ success: true, message: result.message, details: result.details });
        window.location.reload();
      } else {
        setRestoreResult({ success: false, message: result.error || 'Restore failed' });
      }
    } catch (e: any) {
      setRestoreResult({ success: false, message: 'Restore failed: ' + e.message });
    } finally {
      setRestoring(false);
    }
  };

  const runAutomatedTests = async () => {
    setRunningTests(true);
    setTestResults(null);
    try {
      const res = await fetch('/api/test/routing', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
      if (data.summary.failed === 0) {
        showToast('All automated tests passed!', 'success');
      } else {
        showToast(`Tests completed with ${data.summary.failed} failures.`, 'error');
      }
    } catch (e: any) {
      showToast('Failed to run tests: ' + e.message, 'error');
    } finally {
      setRunningTests(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch('/api/settings/test-email', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to send test email', 'error');
      }
    } catch (e: any) {
      showToast('Failed to send test email: ' + e.message, 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        showToast('Failed to load users', 'error');
      }
    } catch (e: any) {
      showToast('Failed to load users: ' + e.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGlobalDefaults = async () => {
    if (!isAdmin) return;
    setGlobalDefaultsLoading(true);
    setGlobalDefaultsValidation(null);
    try {
      const res = await fetch('/api/admin/global-defaults');
      const data = await res.json();
      if (res.ok) {
        setGlobalDefaultModels(data.models || []);
        setGlobalDefaultProviders(data.providers || []);
        const models = data.models || [];
        setGlobalDefaultRouterModel(data.routerModel || getDefaultRouterModel());
        setGlobalDefaultImageGenerationModel(data.imageGenerationModel || getDefaultImageGenerationModel());
      } else {
        setGlobalDefaultsValidation({ valid: false, message: data.error || 'Failed to load new user defaults.' });
      }
    } catch (e: any) {
      setGlobalDefaultsValidation({ valid: false, message: 'Failed to load new user defaults: ' + e.message });
    } finally {
      setGlobalDefaultsLoading(false);
    }
  };

  const handleSaveGlobalDefaults = async () => {
    if (!isAdmin) return;
    setGlobalDefaultsSaving(true);
    setGlobalDefaultsValidation(null);
    try {
      const res = await fetch('/api/admin/global-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          models: globalDefaultModels, 
          providers: globalDefaultProviders,
          routerModel: globalDefaultRouterModel,
          imageGenerationModel: globalDefaultImageGenerationModel
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGlobalDefaultsValidation({ valid: true, message: 'New user defaults saved. Existing users were not changed.' });
        showToast('New user defaults saved successfully.', 'success');
      } else {
        setGlobalDefaultsValidation({ valid: false, message: data.error || 'Validation failed.' });
        showToast(data.error || 'Validation failed.', 'error');
      }
    } catch (e: any) {
      setGlobalDefaultsValidation({ valid: false, message: 'Failed to save new user defaults: ' + e.message });
      showToast('Failed to save new user defaults.', 'error');
    } finally {
      setGlobalDefaultsSaving(false);
    }
  };

  const handleResetGlobalDefaults = async () => {
    if (!isAdmin) return;
    if (!confirm('Reset saved new user defaults? Existing users will not be changed.')) return;
    setGlobalDefaultsResetting(true);
    setGlobalDefaultsValidation(null);
    try {
      const res = await fetch('/api/admin/global-defaults', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setGlobalDefaultModels(defaultModelsFromConfig);
        setGlobalDefaultProviders(defaultProvidersFromConfig);
        setGlobalDefaultsValidation({ valid: true, message: 'Saved new user defaults removed. New users will use app defaults.' });
        showToast(data.message || 'New user defaults reset.', 'success');
      } else {
        setGlobalDefaultsValidation({ valid: false, message: data.error || 'Failed to reset new user defaults.' });
        showToast(data.error || 'Failed to reset new user defaults.', 'error');
      }
    } catch (e: any) {
      setGlobalDefaultsValidation({ valid: false, message: 'Failed to reset new user defaults: ' + e.message });
      showToast('Failed to reset new user defaults.', 'error');
    } finally {
      setGlobalDefaultsResetting(false);
    }
  };

  const handleExportToJson = async () => {
    if (!isAdmin) return;
    setExportingToJson(true);
    try {
      const res = await fetch('/api/admin/global-defaults/export', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Exported ${data.modelsCount} models from ${data.providersCount} providers to models.json`, 'success');
      } else {
        showToast(data.error || 'Failed to export to models.json', 'error');
      }
    } catch (e: any) {
      showToast('Failed to export: ' + e.message, 'error');
    } finally {
      setExportingToJson(false);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset the password for ${userName}? A new temporary password will be emailed to them.`)) return;
    setResettingUserId(userId);
    try {
      const res = await fetch('/api/admin/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password reset successfully. Email sent.', 'success');
      } else {
        showToast(data.error || 'Failed to reset password', 'error');
      }
    } catch (e: any) {
      showToast('Failed to reset password', 'error');
    } finally {
      setResettingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to DELETE ${userName} and all their data? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('User deleted successfully', 'success');
        loadUsers();
      } else {
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (e: any) {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleResetCredits = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset free uses to 0 for ${userName}?`)) return;
    setResettingCreditsUserId(userId);
    try {
      const res = await fetch('/api/admin/users/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Free uses reset to 0 successfully', 'success');
        loadUsers();
      } else {
        showToast(data.error || 'Failed to reset credits', 'error');
      }
    } catch (e: any) {
      showToast('Failed to reset credits', 'error');
    } finally {
      setResettingCreditsUserId(null);
    }
  };

  const navItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'models', label: 'Models', icon: '' },
    { id: 'providers', label: 'Providers', icon: '' },
    { id: 'theme', label: 'Theme Colors', icon: '' },
    { id: 'global-prompt', label: 'System Prompt', icon: '' },
    { id: 'utility-llms', label: 'Utility LLMs', icon: '' },
    { id: 'backup', label: 'Backup & Restore', icon: '' },
    { id: 'testing', label: 'Automated Testing', icon: '' },
    ...(isAdmin ? [{ id: 'global-defaults' as SettingsSection, label: 'New User Defaults', icon: '' }] : []),
    ...(isAdmin ? [{ id: 'users' as SettingsSection, label: 'User Management', icon: '' }] : [])
  ];

  const colorRows: { key: keyof ThemeColors; label: string; description: string }[] = [
    { key: 'background', label: 'Background', description: 'Main page background' },
    { key: 'surface', label: 'Surface', description: 'Cards, panels, modals' },
    { key: 'surfaceAlt', label: 'Surface Alt', description: 'Sidebar, headers, footers' },
    { key: 'bgSecondary', label: 'BG Secondary', description: 'Secondary backgrounds (gray-700)' },
    { key: 'bgTertiary', label: 'BG Tertiary', description: 'Tertiary backgrounds/hover (gray-600)' },
    { key: 'textPrimary', label: 'Text Primary', description: 'Main text, headings' },
    { key: 'textSecondary', label: 'Text Secondary', description: 'Body text, labels' },
    { key: 'textMuted', label: 'Text Muted', description: 'Hints, placeholders, timestamps' },
    { key: 'accent', label: 'Accent', description: 'Buttons, links, highlights' },
    { key: 'accentHover', label: 'Accent Hover', description: 'Button/link hover state' },
    { key: 'border', label: 'Border', description: 'Card borders, dividers' },
    { key: 'borderAlt', label: 'Border Alt', description: 'Subtle borders, inputs' }
  ];

  const updateColor = (mode: 'dark' | 'light', key: keyof ThemeColors, value: string) => {
    const setter = mode === 'dark' ? setDarkColors : setLightColors;
    setter(prev => ({ ...prev, [key]: value }));
  };

  return (
    <main className="min-h-screen font-sans bg-gray-900 text-gray-100">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-700 text-green-200'
            : 'bg-red-900/90 border-red-700 text-red-200'
        }`}>
          {toast.message}
        </div>
      )}
      <div className="flex h-screen">
        {/* Left Sidebar Navigation */}
        <div className="w-48 bg-gray-950 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Settings</h2>
          </div>
          <div className="p-2 border-b border-gray-800">
            <Link href="/" className="flex items-center gap-2 text-sm px-3 py-2 rounded transition text-gray-400 hover:text-white hover:bg-gray-800">
              <span>←</span> Back to Chat
            </Link>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                  activeSection === item.id
                    ? 'bg-indigo-900/40 text-indigo-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {activeSection === 'models' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Model Configuration</h1>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {filteredModels.length === models.length
                      ? `${models.length} models across ${providers.length} providers`
                      : `Showing ${filteredModels.length} of ${models.length} models`}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => validateAll()} disabled={validatingAll} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                      {validatingAll ? 'Checking...' : 'Check All'}
                    </button>
                    <button onClick={() => setShowImportExportModal(true)} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      Import / Export
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition">+ Add Model</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search models by name or ID..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                    {modelSearchQuery && (
                      <button
                        onClick={() => setModelSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {uniqueModelProviders.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Filter by Provider</span>
                        {selectedProviderFilters.size > 0 && (
                          <button onClick={clearFilters} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition">
                            Clear filters
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueModelProviders.map(pid => {
                          const isActive = selectedProviderFilters.size === 0 || selectedProviderFilters.has(pid);
                          const providerCount = models.filter(m => m.provider === pid).length;
                          return (
                            <button
                              key={pid}
                              onClick={() => toggleProviderFilter(pid)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition ${
                                isActive
                                  ? 'bg-indigo-900/40 text-indigo-300 border-indigo-500/40'
                                  : 'bg-gray-900 text-gray-500 border-gray-700 hover:border-gray-600'
                              }`}
                            >
                              {getProviderName(pid)} ({providerCount})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {filteredModels.length > 0 && (
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-800 text-gray-400">
                          <th className="text-left py-2 px-3 w-8"></th>
                          <th className="text-left py-2 px-3">Display Name</th>
                          <th className="text-left py-2 px-3">Model ID</th>
                          <th className="text-left py-2 px-3">Provider</th>
                          <th className="text-center py-2 px-3 w-24">Status</th>
                          <th className="text-center py-2 px-3 w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModels.map((m, index) => {
                          const validationResult = validationResults[m.id];
                          const isValidating = validatingId === m.id;
                          const isInvalid = validationResult && !validationResult.valid;
                          const isValid = validationResult && validationResult.valid;
                          return (
                            <tr
                              key={m.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(index));
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                moveModel(fromIndex, index);
                              }}
                              className={`border-t border-gray-800 transition ${
                                draggedIndex === index ? 'bg-indigo-900/20' : 'bg-gray-950 hover:bg-gray-900'
                              }`}
                            >
                              <td className="py-2 px-3 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </td>
                              <td className={`py-2 px-3 ${isInvalid ? 'text-red-400' : 'text-gray-100'}`}>{m.name}</td>
                              <td className={`py-2 px-3 font-mono ${isInvalid ? 'text-red-400' : 'text-gray-500'}`}>
                                {m.id}
                                {isInvalid && (
                                  <span className="text-[9px] ml-1" title={validationResult.message}>⚠</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-400">{getProviderName(m.provider)}</td>
                              <td className="py-2 px-3 text-center">
                                {isValidating ? (
                                  <span className="text-indigo-400 animate-pulse">...</span>
                                ) : isValid ? (
                                  <span className="text-green-400" title={validationResult.message}>✓</span>
                                ) : isInvalid ? (
                                  <span className="text-red-400" title={validationResult.message}></span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => validateModelId(m)}
                                    disabled={isValidating}
                                    className="text-[10px] px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition disabled:opacity-50"
                                    title="Check model ID"
                                  >
                                    {isValidating ? '...' : 'Check'}
                                  </button>
                                  <button
                                    onClick={() => { setEditingModel(m); setModelId(m.id); setModelName(m.name); setModelProvider(m.provider); setShowAddModal(true); }}
                                    className="text-[10px] px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteModel(m.id)}
                                    className="text-[10px] px-1.5 py-1 rounded text-gray-500 hover:text-red-400 transition"
                                  >
                                    Del
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {models.length === 0 && (
                  <div className="border border-gray-800 rounded-lg p-4 text-center bg-gray-950">
                    <p className="text-sm text-gray-500">No models configured.</p>
                  </div>
                )}

                {models.length > 0 && filteredModels.length === 0 && (
                  <div className="border border-gray-800 rounded-lg p-4 text-center bg-gray-950">
                    <p className="text-sm text-gray-500">No models match your filters.</p>
                    <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition">Clear filters</button>
                  </div>
                )}
              </>
            )}

            {activeSection === 'providers' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Provider Configuration</h1>
                <p className="text-sm text-gray-400">Manage AI service providers and endpoints. OpenRouter is built-in and cannot be modified.</p>
                
                {/* Built-in Provider */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Built-in Provider</h3>
                  <div className="border border-indigo-500/30 rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-950">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-100">OpenRouter</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-500/30">Built-in</span>
                          </div>
                          <span className="text-[10px] font-mono block text-gray-500">https://openrouter.ai/api/v1/chat/completions</span>
                        </div>
                        <span className="text-xs text-gray-600">Auto-configured</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Providers */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Custom Providers</h3>
                    <button onClick={openAddProviderModal} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition">+ Add Provider</button>
                  </div>

                  {customProviders.length > 0 ? (
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="p-4 space-y-2 bg-gray-950">
                        {customProviders.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded border bg-gray-900/50 border-gray-800/60">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block text-gray-100">{p.name}</span>
                              <span className="text-[10px] font-mono block text-gray-500">{p.endpoint}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button onClick={() => openEditProviderModal(p)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition">Edit</button>
                              <button onClick={() => deleteProvider(p.id)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-red-400 transition">Del</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-gray-800 rounded-lg p-4 text-center bg-gray-950">
                      <p className="text-sm text-gray-500">No custom providers. Click Add Provider to connect to Ollama, LLM Studio, or other services.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeSection === 'global-defaults' && isAdmin && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">New User Defaults</h1>
                <p className="text-sm text-gray-400">
                  Configure the providers and models assigned when a new user registers. Existing users are not changed.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button onClick={loadGlobalDefaults} disabled={globalDefaultsLoading} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                    {globalDefaultsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => {
                      setGlobalDefaultModels(defaultModelsFromConfig);
                      setGlobalDefaultProviders(defaultProvidersFromConfig);
                      setGlobalDefaultsValidation({ valid: true, message: 'Loaded app defaults locally. Click Validate & Save to persist them for new users.' });
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition"
                  >
                    Load App Defaults
                  </button>
                  <button onClick={handleResetGlobalDefaults} disabled={globalDefaultsResetting} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                    {globalDefaultsResetting ? 'Resetting...' : 'Reset Saved Defaults'}
                  </button>
                  <button onClick={handleSaveGlobalDefaults} disabled={globalDefaultsSaving} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                    {globalDefaultsSaving ? 'Validating...' : 'Validate & Save'}
                  </button>
                  <button onClick={handleExportToJson} disabled={exportingToJson} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                    {exportingToJson ? 'Exporting...' : 'Export to models.json'}
                  </button>
                </div>

                {globalDefaultsValidation && (
                  <div className={`p-3 rounded-lg border text-sm ${
                    globalDefaultsValidation.valid
                      ? 'bg-green-900/20 border-green-700/50 text-green-300'
                      : 'bg-red-900/20 border-red-700/50 text-red-300'
                  }`}>
                    {globalDefaultsValidation.message}
                  </div>
                )}

                {globalDefaultsLoading ? (
                  <div className="p-8 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-950">Loading new user defaults...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-200">Default Providers</h3>
                          <p className="text-[10px] text-gray-500 mt-1">{globalDefaultProviders.length} providers configured</p>
                        </div>
                        <button onClick={openAddProviderModal} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition">+ Add Provider</button>
                      </div>
                      <div className="p-4 space-y-2">
                        {globalDefaultProviders.length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-6">No default providers configured.</div>
                        ) : (
                          globalDefaultProviders.map((p, index) => (
                            <div 
                              key={p.id} 
                              draggable
                              onDragStart={() => handleGlobalProviderDragStart(index)}
                              onDragOver={(e) => handleGlobalProviderDragOver(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`p-3 rounded border bg-gray-900/50 border-gray-800/60 cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="text-gray-600 hover:text-gray-400 pt-0.5">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-100">{p.name}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                      p.id === 'openrouter'
                                        ? 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30'
                                        : 'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}>{p.id === 'openrouter' ? 'Built-in' : p.type}</span>
                                  </div>
                                  <span className="text-[10px] font-mono block text-gray-500 truncate">{p.id}</span>
                                  <span className="text-[10px] font-mono block text-gray-600 truncate">{p.endpoint}</span>
                                </div>
                                {p.id !== 'openrouter' && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEditProviderModal(p)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition">Edit</button>
                                    <button onClick={() => deleteProvider(p.id)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-red-400 transition">Del</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-200">Default Models</h3>
                          <p className="text-[10px] text-gray-500 mt-1">{globalDefaultModels.length} models configured</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setValidationResults({}); validateAll(globalDefaultModels, globalDefaultProviders); }} disabled={globalDefaultModels.length === 0} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition disabled:opacity-50">Check All</button>
                          <button
                            onClick={() => {
                              setEditingModel(null);
                              setModelId('');
                              setModelName('');
                              setModelProvider('openrouter');
                              setAvailableModels([]);
                              setShowAddModal(true);
                            }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition"
                          >+ Add Model</button>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        {globalDefaultModels.length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-6">No default models configured.</div>
                        ) : (
                          globalDefaultModels.map((m, index) => {
                            const validationResult = validationResults[m.id];
                            const isInvalid = validationResult && !validationResult.valid;
                            const isValid = validationResult && validationResult.valid;
                            return (
                              <div 
                                key={m.id} 
                                draggable
                                onDragStart={() => handleGlobalModelDragStart(index)}
                                onDragOver={(e) => handleGlobalModelDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`p-3 rounded border ${isInvalid ? 'border-red-700/50 bg-red-900/10' : 'bg-gray-900/50 border-gray-800/60'} ${draggedIndex === index ? 'opacity-50' : ''} cursor-move`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="text-gray-600 hover:text-gray-400 pt-0.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-medium ${isInvalid ? 'text-red-300' : 'text-gray-100'}`}>{m.name}</span>
                                      {isValid && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-700/50">Valid</span>}
                                      {isInvalid && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700/50" title={validationResult.message}>Invalid</span>}
                                    </div>
                                    <span className="text-[10px] font-mono block text-gray-500 truncate">{m.id}</span>
                                    <span className="text-[10px] text-gray-400">Provider: {getProviderName(m.provider, globalDefaultProviders)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => validateModelId(m, globalDefaultProviders)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition">Check</button>
                                    <button onClick={() => { setEditingModel(m); setModelId(m.id); setModelName(m.name); setModelProvider(m.provider); setShowAddModal(true); }} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition">Edit</button>
                                    <button onClick={() => deleteModel(m.id)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-red-400 transition">Del</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                    <div className="p-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-200">Default Utility LLMs</h3>
                      <p className="text-[10px] text-gray-500 mt-1">Select default models for routing and image generation for new users</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">Router LLM</label>
                        <select
                          value={globalDefaultRouterModel}
                          onChange={(e) => setGlobalDefaultRouterModel(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                        >
                          {globalDefaultModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-600 mt-1">Used for intent classification and routing decisions</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">Image Generation LLM</label>
                        <select
                          value={globalDefaultImageGenerationModel}
                          onChange={(e) => setGlobalDefaultImageGenerationModel(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                        >
                          {globalDefaultModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-600 mt-1">Used for generating images when requested</p>
                      </div>
                    </div>
                  </div>
                </>
                )}
              </>
            )}

            {activeSection === 'theme' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Theme Colors</h1>
                <p className="text-sm text-gray-400">Customize colors for Dark and Light modes. Changes apply immediately.</p>

                <div className="grid grid-cols-2 gap-6">
                  {/* Dark Mode Column */}
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        🌙 Dark Mode
                      </h3>
                    </div>
                    <div className="p-4 space-y-3 bg-gray-950">
                      {colorRows.map(row => (
                        <div key={row.key} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="text-xs font-medium text-gray-300 block">{row.label}</label>
                            <span className="text-[10px] text-gray-500">{row.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={darkColors[row.key]}
                              onChange={(e) => updateColor('dark', row.key, e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={darkColors[row.key]}
                              onChange={(e) => updateColor('dark', row.key, e.target.value)}
                              className="w-20 text-[10px] font-mono bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Light Mode Column */}
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        ☀️ Light Mode
                      </h3>
                    </div>
                    <div className="p-4 space-y-3 bg-white">
                      {colorRows.map(row => (
                        <div key={row.key} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="text-xs font-medium text-gray-700 block">{row.label}</label>
                            <span className="text-[10px] text-gray-400">{row.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={lightColors[row.key]}
                              onChange={(e) => updateColor('light', row.key, e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={lightColors[row.key]}
                              onChange={(e) => updateColor('light', row.key, e.target.value)}
                              className="w-20 text-[10px] font-mono bg-gray-100 border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                  <p className="text-xs text-gray-400">
                    <strong>Tip:</strong> Click the color picker or type a hex value (e.g., #1f2937). Changes apply live. Click Save Settings to persist.
                  </p>
                </div>
              </>
            )}

            {activeSection === 'global-prompt' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">System Prompt & Context</h1>
                <p className="text-sm text-gray-400">
                  Configure the automatic context injected into EVERY chat session, along with your global instructions.
                </p>

                <div className="space-y-6">
                  <div className="border border-gray-800 rounded-lg p-4 bg-gray-950 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      Dynamic Context Settings
                    </h3>
                    
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                        Default Timezone
                      </label>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="e.g., America/Phoenix, UTC, Europe/London"
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">
                        IANA timezone format. Used for date and time injection.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                        Default Weather Location
                      </label>
                      <input
                        type="text"
                        value={weatherLocation}
                        onChange={(e) => setWeatherLocation(e.target.value)}
                        placeholder="e.g., Phoenix, AZ or leave empty to disable"
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">
                        When you ask "what is the weather", this location will be used automatically.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-800">
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Preview of Injected Context:</h4>
                      <p className="text-xs text-gray-300 font-mono">
                        {(() => {
                          try {
                            const validTz = timezone && Intl.supportedValuesOf('timeZone').includes(timezone) ? timezone : 'UTC';
                            return `Current date and time: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: validTz })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: validTz })}`;
                          } catch {
                            return `Current date and time: Invalid timezone specified. Defaulting to UTC.`;
                          }
                        })()}
                      </p>
                      {weatherLocation && (
                        <p className="text-xs text-gray-300 font-mono mt-1">
                          Weather: fetched for "{weatherLocation}" on-demand.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                      Your Global Instructions
                    </label>
                    <textarea
                      value={globalSystemPrompt}
                      onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                      rows={8}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 resize-none"
                      placeholder="e.g., Always respond in markdown format. You are a helpful assistant for Jorge Pereira at 35sites.com LLC..."
                    />
                    <p className="text-[10px] text-gray-600 mt-1">
                      This text is appended after the automatic date/time/weather context. Leave empty to only inject dynamic context.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'utility-llms' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Utility LLMs & API Keys</h1>
                <p className="text-sm text-gray-400">
                  Configure utility language models used for routing and image generation tasks, and manage your personal OpenRouter API key.
                </p>

                <div className="space-y-6">
                  <div className="border border-gray-800 rounded-lg p-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                      Your OpenRouter API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">
                      Your personal API key is encrypted and stored securely. Overrides any global API key.
                    </p>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={savingApiKey}
                      className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      {savingApiKey ? 'Saving...' : 'Save API Key'}
                    </button>
                  </div>

                  <div className="border-t border-gray-800 pt-6">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                        Router LLM
                      </label>
                      <select
                        value={routerModel}
                        onChange={(e) => setRouterModel(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-600 mt-1">
                        The LLM used to classify user intent (web search vs direct reply vs image generation)
                      </p>
                    </div>

                    <div className="mt-6">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                        Image Generation LLM
                      </label>
                      <select
                        value={imageGenerationModel}
                        onChange={(e) => setImageGenerationModel(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-600 mt-1">
                        The LLM used when users request image generation
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'backup' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Backup & Restore</h1>
                <p className="text-sm text-gray-400">Export all your data or restore from a previous backup. Includes threads, messages, settings, and saved prompts.</p>

                <div className="grid grid-cols-2 gap-6">
                  {/* Backup Section */}
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-200">Export Data</h3>
                    </div>
                    <div className="p-4 space-y-3 bg-gray-950">
                      <p className="text-xs text-gray-500">Download a ZIP backup of all threads, messages, model settings, saved prompts, and generated images.</p>
                      <button
                        onClick={handleBackup}
                        disabled={backuping}
                        className="w-full px-3 py-2 rounded text-xs font-semibold transition text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600"
                      >
                        {backuping ? 'Creating backup...' : 'Download Backup'}
                      </button>
                    </div>
                  </div>

                  {/* Restore Section */}
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-200">Restore Data</h3>
                    </div>
                    <div className="p-4 space-y-3 bg-gray-950">
                      <p className="text-xs text-gray-500">Upload a ZIP backup file to restore your data and images.</p>

                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">Restore Mode</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRestoreMode('replace')}
                            className={`flex-1 text-xs px-2 py-1.5 rounded border transition ${
                              restoreMode === 'replace'
                                ? 'bg-red-900/40 text-red-300 border-red-500/40'
                                : 'bg-gray-900 text-gray-500 border-gray-700'
                            }`}
                            title="Deletes existing data and replaces with backup"
                          >
                            Replace All
                          </button>
                          <button
                            onClick={() => setRestoreMode('merge')}
                            className={`flex-1 text-xs px-2 py-1.5 rounded border transition ${
                              restoreMode === 'merge'
                                ? 'bg-green-900/40 text-green-300 border-green-500/40'
                                : 'bg-gray-900 text-gray-500 border-gray-700'
                            }`}
                            title="Only adds items that don't already exist"
                          >
                            Merge Only
                          </button>
                        </div>
                      </div>

                      <label className="block">
                        <input
                          type="file"
                          accept=".zip"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleRestore(file);
                          }}
                          disabled={restoring}
                          className="hidden"
                          id="restore-file"
                        />
                        <span
                          className={`block text-center px-3 py-2 rounded text-xs font-semibold transition cursor-pointer ${
                            restoring
                              ? 'bg-gray-800 text-gray-600'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {restoring ? 'Restoring...' : 'Select Backup File'}
                        </span>
                      </label>

                      {restoreResult && (
                        <div className={`p-2 rounded text-xs ${
                          restoreResult.success
                            ? 'bg-green-900/30 text-green-300 border border-green-700'
                            : 'bg-red-900/30 text-red-300 border border-red-700'
                        }`}>
                          {restoreResult.message}
                          {restoreResult.details && (
                            <div className="mt-1 text-[10px] text-gray-400">
                              {Object.entries(restoreResult.details).map(([k, v]: [string, any]) => (
                                <span key={k} className="block">{k}: {v.inserted} added, {v.skipped} skipped</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
                  <p className="text-xs text-gray-500">
                    <strong className="text-red-400">Warning:</strong> Replace mode will delete all existing data before restoring. Merge mode only adds items that don't already exist.
                  </p>
                </div>
              </>
            )}

            {activeSection === 'testing' && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">Automated Testing</h1>
                <p className="text-sm text-gray-400">
                  Run end-to-end automated tests to verify that the routing logic, context injection, and API integrations are working correctly.
                </p>

                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-200">Routing & Context Tests</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Tests direct replies, timezone injection, weather lookups, stock searches, and image generation routing.
                        </p>
                      </div>
                      <button
                        onClick={runAutomatedTests}
                        disabled={runningTests}
                        className="px-4 py-2 rounded text-xs font-semibold transition text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 flex items-center gap-2"
                      >
                        {runningTests ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Running...
                          </>
                        ) : (
                          '🧪 Run Tests'
                        )}
                      </button>
                    </div>

                    {testResults && (
                      <div className="mt-4 border-t border-gray-800 pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-sm font-bold ${testResults.summary.failed === 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {testResults.summary.failed === 0 ? '✅ All Tests Passed' : `❌ ${testResults.summary.failed} Tests Failed`}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({testResults.summary.passed} passed, {testResults.summary.failed} failed out of {testResults.summary.total})
                          </span>
                        </div>
                        
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                          {testResults.results.map((result: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded border text-xs ${result.passed ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-gray-200">{result.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${result.passed ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                                  {result.passed ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <p className="text-gray-400 mb-1">Prompt: "{result.prompt}"</p>
                              <div className="flex gap-4 text-[10px] font-mono">
                                <span>Expected: <span className="text-indigo-300">{result.expected}</span></span>
                                <span>Actual: <span className={result.passed ? 'text-green-300' : 'text-red-300'}>{result.actual}</span></span>
                              </div>
                              {result.error && (
                                <p className="text-red-400 mt-1 text-[10px]">Error: {result.error}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {testResults.threadId && (
                          <p className="text-[10px] text-gray-500 mt-3 pt-3 border-t border-gray-800">
                            Test conversation saved to thread ID: <span className="font-mono text-gray-300">{testResults.threadId}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-200">Email Configuration Test</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Verifies your SMTP settings by sending a test email to your registered address.
                        </p>
                      </div>
                      <button
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="px-4 py-2 rounded text-xs font-semibold transition text-white bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 flex items-center gap-2"
                      >
                        {testingEmail ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          '✉️ Send Test Email'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'users' && isAdmin && (
              <>
                <h1 className="text-2xl font-bold text-indigo-400">User Management</h1>
                <p className="text-sm text-gray-400">
                  Manage registered users, reset passwords, or delete accounts. All user data is strictly isolated.
                </p>

                <div className="mt-6 border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-4 flex justify-between items-center border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-200">Registered Users</h3>
                    <button
                      onClick={loadUsers}
                      disabled={loadingUsers}
                      className="px-3 py-1.5 rounded text-xs font-semibold transition text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                    >
                      {loadingUsers ? 'Loading...' : '🔄 Refresh'}
                    </button>
                  </div>
                  
                  {loadingUsers ? (
                    <div className="p-8 text-center text-gray-500">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No users found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Verified</th>
                            <th className="px-4 py-3">Free Uses</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {users.map((user: any) => (
                            <tr key={user._id} className="hover:bg-gray-900/50">
                              <td className="px-4 py-3 text-gray-200">{user.name}</td>
                              <td className="px-4 py-3 text-gray-400">{user.email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${user.role === 'admin' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-gray-800 text-gray-400'}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {user.isEmailVerified ? (
                                  <span className="text-green-400">✓ Yes</span>
                                ) : (
                                  <span className="text-red-400">No</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-300 font-mono">
                                {user.freeUses || 0} / 15
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleResetPassword(user._id, user.name)}
                                  disabled={resettingUserId === user._id}
                                  className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800/50 disabled:opacity-50"
                                >
                                  {resettingUserId === user._id ? 'Resetting...' : 'Reset Pwd'}
                                </button>
                                {user.role !== 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleResetCredits(user._id, user.name)}
                                      disabled={resettingCreditsUserId === user._id}
                                      className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/50 disabled:opacity-50"
                                    >
                                      {resettingCreditsUserId === user._id ? 'Resetting...' : 'Reset Credits'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user._id, user.name)}
                                      className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            <button onClick={handleSave} disabled={saving} className="w-full px-4 py-3 rounded font-semibold text-sm tracking-wide transition text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4 text-gray-200">{editingModel ? 'Edit Model' : 'Add New Model'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Provider</label>
                <div className="flex gap-2">
                  <select value={modelProvider} onChange={(e) => { setModelProvider(e.target.value); setAvailableModels([]); }} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    {(activeSection === 'global-defaults' ? globalDefaultProviders : providers).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <button onClick={() => fetchProviderModels(modelProvider, activeSection === 'global-defaults' ? globalDefaultProviders : providers)} disabled={fetchingModels} className="text-xs px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition">
                    {fetchingModels ? '...' : '↓'}
                  </button>
                </div>
              </div>
              {availableModels.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Available Models</label>
                  <select onChange={(e) => { if (e.target.value) { setModelId(e.target.value); setModelName(e.target.value); } }} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Select a model...</option>
                    {availableModels.map(m => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Model ID</label>
                <input type="text" value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="e.g., gemma4:latest" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {modelProvider === 'openrouter' && (
                <button 
                  onClick={() => { fetchOpenRouterModels(); setShowOpenRouterModal(true); }}
                  className="w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Browse OpenRouter Models
                </button>
              )}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Model Display Name</label>
                <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g., GPT-4o" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAddModal(false)} className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">Cancel</button>
              <button onClick={saveModel} disabled={!modelId.trim() || !modelName.trim()} className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">{editingModel ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* OpenRouter Model Browser Modal */}
      {showOpenRouterModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowOpenRouterModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full mx-4 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Select OpenRouter Model</h3>
              <button onClick={() => setShowOpenRouterModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <p className="text-[10px] text-gray-500 mt-2">Prices are shown per 1M tokens when available.</p>
              <div className="relative mb-3 mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  value={openRouterSearch}
                  onChange={(e) => setOpenRouterSearch(e.target.value)}
                  placeholder="Search models by ID or name..."
                  className="w-full bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                {loadingOpenRouterModels ? (
                  <div className="text-center text-gray-500 py-8 text-xs">Loading models from OpenRouter...</div>
                ) : filteredOpenRouterModels.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-xs">No models found matching your search.</div>
                ) : (
                  filteredOpenRouterModels.map((m: any) => (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => selectOpenRouterModel(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectOpenRouterModel(m);
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded border transition text-sm group ${modelId === m.id ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'}`}
                    >
                      <div className="font-semibold text-indigo-300 group-hover:text-indigo-200 truncate">{m.name}</div>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <div className="text-xs text-gray-500 font-mono truncate">{m.id}</div>
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <div className="text-xs text-gray-400 whitespace-nowrap" title={formatOpenRouterModelPricing(m)}>{formatOpenRouterModelPricing(m)}</div>
                          <a
                            href={getOpenRouterModelUrl(m)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
                            aria-label={`Open ${m.name} on OpenRouter`}
                          >
                            Link
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {!loadingOpenRouterModels && filteredOpenRouterModels.length === 50 && (
                <div className="text-center text-[10px] text-gray-600 mt-2">
                  Showing top 50 results. Use search to find specific models.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowProviderModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4 text-gray-200">{editingProvider ? 'Edit Provider' : 'Add New Provider'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Provider Name</label>
                <input type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g., Ollama (Office)" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Type</label>
                <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                  <option value="local">Local (Ollama/LLM Studio)</option>
                  <option value="api">API (OpenRouter/OpenAI)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Endpoint URL</label>
                <input type="text" value={providerEndpoint} onChange={(e) => setProviderEndpoint(e.target.value)} placeholder="e.g., http://192.168.4.24:11434/api/chat" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowProviderModal(false)} className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">Cancel</button>
              <button onClick={saveProvider} disabled={!providerName.trim() || !providerEndpoint.trim()} className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">{editingProvider ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Models & Providers Modal */}
      {showImportExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowImportExportModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full mx-4 p-5 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200">Import / Export Models & Providers</h3>
              <button onClick={() => { setShowImportExportModal(false); setImportError(''); setImportResult(''); setImportMode('merge'); }} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
                <p className="text-gray-400 mb-3">
                  Export your current models and provider configurations to a JSON file, or import from a previously exported file.
                  <br />
                  <span className="text-indigo-400">Note:</span> This is specific to your user account settings.
                </p>
                <button 
                  onClick={handleExportModels} 
                  disabled={importing}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Configuration to JSON
                </button>
              </div>

              <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
                <h4 className="font-semibold text-gray-300 mb-2">Import Configuration</h4>
                <div className="mb-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">Import Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="importMode" 
                        value="merge" 
                        checked={importMode === 'merge'} 
                        onChange={() => setImportMode('merge')}
                        className="accent-indigo-500" 
                      />
                      <span className="text-gray-300">Merge (add new, keep existing)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="importMode" 
                        value="replace" 
                        checked={importMode === 'replace'} 
                        onChange={() => setImportMode('replace')}
                        className="accent-red-500" 
                      />
                      <span className="text-red-400">Replace (overwrite all)</span>
                    </label>
                  </div>
                </div>
                
                <label className="block w-full">
                  <span className="sr-only">Choose file</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleImportModels(e.target.files[0], importMode);
                        e.target.value = '';
                      }
                    }}
                    disabled={importing}
                    className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
              </div>

              {importError && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded text-red-400">
                  Error: {importError}
                </div>
              )}
              {importResult && (
                <div className="p-3 bg-green-900/20 border border-green-700/50 rounded text-green-400">
                  Success: {importResult}
                </div>
              )}
              {importing && (
                <div className="text-center text-gray-400 py-2">
                  Processing...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
