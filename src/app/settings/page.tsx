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
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9ca3af',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  border: '#e5e7eb',
  borderAlt: '#d1d5db'
};

type SettingsSection = 'models' | 'providers' | 'theme';

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

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
    
    const savedDark = localStorage.getItem('theme-dark-colors');
    if (savedDark) setDarkColors(JSON.parse(savedDark));
    
    const savedLight = localStorage.getItem('theme-light-colors');
    if (savedLight) setLightColors(JSON.parse(savedLight));
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
    localStorage.setItem('theme-dark-colors', JSON.stringify(darkColors));
    localStorage.setItem('theme-light-colors', JSON.stringify(lightColors));
    
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models, providers })
    });
    setSaving(false);
    alert('Settings saved successfully!');
  }

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const customProviders = providers.filter(p => p.id !== 'openrouter');

  const groupedModels = models.reduce((acc: Record<string, Model[]>, model) => {
    const provider = model.provider || 'openrouter';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {});

  const navItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'models', label: 'Models', icon: '' },
    { id: 'providers', label: 'Providers', icon: '' },
    { id: 'theme', label: 'Theme Colors', icon: '' }
  ];

  const colorRows: { key: keyof ThemeColors; label: string; description: string }[] = [
    { key: 'background', label: 'Background', description: 'Main page background' },
    { key: 'surface', label: 'Surface', description: 'Cards, panels, modals' },
    { key: 'surfaceAlt', label: 'Surface Alt', description: 'Sidebar, headers, footers' },
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
                  <span className="text-xs text-gray-500">{models.length} models across {providers.length} providers</span>
                  <button onClick={() => setShowAddModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition">+ Add Model</button>
                </div>

                {Object.entries(groupedModels).map(([providerId, providerModels]) => (
                  <div key={providerId} className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-gray-800 text-gray-400">
                      {getProviderName(providerId)} ({providerModels.length} models)
                    </div>
                    <div className="p-4 space-y-2 bg-gray-950">
                      {providerModels.map((m) => {
                        const globalIndex = models.findIndex(model => model.id === m.id);
                        return (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded border bg-gray-900/50 border-gray-800/60 transition">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm block truncate text-gray-100">{m.name}</span>
                              <span className="text-[10px] font-mono text-gray-500">{m.id}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button onClick={() => { setEditingModel(m); setModelId(m.id); setModelName(m.name); setModelProvider(m.provider); setShowAddModal(true); }} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-indigo-400 transition">Edit</button>
                              <button onClick={() => deleteModel(m.id)} className="text-xs px-1.5 py-1 rounded text-gray-500 hover:text-red-400 transition">Del</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {models.length === 0 && (
                  <div className="border border-gray-800 rounded-lg p-4 text-center bg-gray-950">
                    <p className="text-sm text-gray-500">No models configured.</p>
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
