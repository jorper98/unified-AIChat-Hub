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

type SettingsSection = 'models' | 'providers' | 'theme' | 'backup' | 'global-prompt' | 'utility-llms' | 'testing';

export default function SettingsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [validatingAll, setValidatingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Testing state
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
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
  }, []);

  const fetchProviderModels = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
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

  const saveModel = () => {
    if (!modelId.trim() || !modelName.trim()) return;
    if (editingModel) {
      setModels(prev => prev.map(m => m.id === editingModel.id ? { id: modelId.trim(), name: modelName.trim(), provider: modelProvider } : m));
    } else {
      setModels(prev => [...prev, { id: modelId.trim(), name: modelName.trim(), provider: modelProvider }]);
    }
    setShowAddModal(false);
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
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
    // Prevent editing openrouter
    if (editingProvider && editingProvider.id === 'openrouter') return;
    
    const id = providerName.toLowerCase().replace(/\s+/g, '-');
    if (editingProvider) {
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType } : p));
    } else {
      setProviders(prev => [...prev, { id, name: providerName.trim(), endpoint: providerEndpoint.trim(), type: providerType }]);
    }
    setShowProviderModal(false);
  };

  const deleteProvider = (id: string) => {
    // Prevent deleting openrouter
    if (id === 'openrouter') return;
    setProviders(prev => prev.filter(p => p.id !== id));
    setModels(prev => prev.filter(m => m.provider !== id));
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

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
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

  const validateModelId = async (model: Model) => {
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
        const provider = providers.find(p => p.id === model.provider);
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

  const validateAll = async () => {
    setValidatingAll(true);
    for (const model of models) {
      await validateModelId(model);
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

  const navItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'models', label: 'Models', icon: '' },
    { id: 'providers', label: 'Providers', icon: '' },
    { id: 'theme', label: 'Theme Colors', icon: '' },
    { id: 'global-prompt', label: 'Global System Prompt', icon: '' },
    { id: 'utility-llms', label: 'Utility LLMs', icon: '' },
    { id: 'backup', label: 'Backup & Restore', icon: '' },
    { id: 'testing', label: 'Automated Testing', icon: '' }
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
                    <button onClick={validateAll} disabled={validatingAll} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition disabled:opacity-50">
                      {validatingAll ? 'Checking...' : 'Check All'}
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
                <h1 className="text-2xl font-bold text-indigo-400">Global System Prompt & Context</h1>
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
                <h1 className="text-2xl font-bold text-indigo-400">Utility LLMs</h1>
                <p className="text-sm text-gray-400">
                  Configure utility language models used for routing and image generation tasks.
                </p>

                <div className="space-y-6">
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

                  <div>
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
                    {providers.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <button onClick={() => fetchProviderModels(modelProvider)} disabled={fetchingModels} className="text-xs px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition">
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
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-gray-500">Display Name</label>
                <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g., Gemma 4 (Ollama)" className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAddModal(false)} className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">Cancel</button>
              <button onClick={saveModel} disabled={!modelId.trim() || !modelName.trim()} className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50">{editingModel ? 'Update' : 'Add'}</button>
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
    </main>
  );
}
