'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ALL_MASTER_MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (Anthropic)' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (DeepSeek)' },
  { id: 'google/gemini-pro', name: 'Gemini Pro (Google)' },
  { id: 'google/gemini-flash-lite', name: 'Gemini Flash Lite (Google)' },
  { id: 'qwen/qwen3.6-plus', name: 'Qwen3.6-plus (Alibaba)' },
  { id: 'x-ai/grok-4.3', name: 'x-ai/grok-4.3' },
  { id: 'MiniMax: MiniMax M3', name: 'MiniMax M3 (MiniMax)' },
  { id: 'moonshot/kimi-k2', name: 'Kimi K2 (Moonshot)' }
];

export default function SettingsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.selectedModels) setSelectedIds(data.selectedModels);
      });
  }, []);

  const toggleModel = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(mId => mId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const updated = [...selectedIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    // Swap positions
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedIds(updated);
  };

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedModels: selectedIds })
    });
    setSaving(false);
    alert("Dropdown visibility configurations saved successfully!");
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-indigo-400">Dropdown Model Configurations</h1>
          <Link href="/" className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded transition">
            ← Back to Chat
          </Link>
        </div>

        <p className="text-sm text-gray-400">
          Toggle which OpenRouter models appear in your dynamic chat view, and adjust their list priority sequence order.
        </p>

        {/* List Selector Box */}
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-3">
          {ALL_MASTER_MODELS.map((m) => {
            const isChecked = selectedIds.includes(m.id);
            const orderIndex = selectedIds.indexOf(m.id);

            return (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-800/60 hover:border-gray-700 transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleModel(m.id)}
                    className="w-4 h-4 rounded text-indigo-600 bg-gray-900 border-gray-700 focus:ring-indigo-500"
                  />
                  <span className={`text-sm ${isChecked ? 'text-gray-100' : 'text-gray-500'}`}>{m.name}</span>
                </div>

                {isChecked && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                      Pos: {orderIndex + 1}
                    </span>
                    <button 
                      onClick={() => moveOrder(orderIndex, 'up')}
                      disabled={orderIndex === 0}
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 px-2 py-1 rounded"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => moveOrder(orderIndex, 'down')}
                      disabled={orderIndex === selectedIds.length - 1}
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 px-2 py-1 rounded"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 px-4 py-3 rounded font-semibold text-sm tracking-wide transition"
        >
          {saving ? 'Committing Configurations...' : 'Save Dropdown Layout Settings'}
        </button>
      </div>
    </main>
  );
}