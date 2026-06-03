'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
}

interface ThreadSummary {
  _id: string;
  name: string;
  currentModel: string;
}

interface DropdownModel {
  id: string;
  name: string;
}

const MASTER_NAME_MAP: Record<string, string> = {
  'openai/gpt-4o': 'GPT-4o (OpenAI)',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet (Anthropic)',
  'anthropic/claude-3-opus': 'Claude 3 Opus (Anthropic)',
  'deepseek/deepseek-chat': 'DeepSeek Chat (DeepSeek)',
  'google/gemini-pro': 'Gemini Pro (Google)',
  'google/gemini-flash-lite': 'Gemini Flash Lite (Google)',
  'qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B (Alibaba)',
  'xiaomi/mimo-v2-pro': 'Mimo V2 Pro (Xiaomi)',
  'minimax/minimax-m2.7': 'MiniMax M2.7 (MiniMax)',
  'moonshot/kimi-k2': 'Kimi K2 (Moonshot)'
};

export default function UnifiedChatInterface() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadsList, setThreadsList] = useState<ThreadSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<DropdownModel[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [loading, setLoading] = useState(false);

  // 1. Initial Load: Get dropdown models and sidebar threads
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.selectedModels && data.selectedModels.length > 0) {
          const formatted = data.selectedModels.map((id: string) => ({
            id,
            name: MASTER_NAME_MAP[id] || id
          }));
          setAvailableModels(formatted);
          setModel(formatted[0].id);
        }
      });
    refreshThreads();
  }, []);

  // 2. Fetch/Search Threads for the Sidebar
  const refreshThreads = (search = '') => {
    const url = search ? `/api/threads?q=${encodeURIComponent(search)}` : '/api/threads';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.threads) setThreadsList(data.threads);
      });
  };

  // Trigger search filtering when user types
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      refreshThreads(searchQuery);
    }, 300); // 300ms debounce to prevent spamming database on every keystroke
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // 3. Load a selected past thread context into view
  const loadThread = (id: string) => {
    setLoading(true);
    setThreadId(id);
    fetch(`/api/threads/${id}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            modelUsed: m.modelUsed
          })));
        }
      })
      .finally(() => setLoading(false));
  };

  const startNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setInput('');
  };

  async function handleSend() {
    if (!input.trim() || loading || !model) return;

    setLoading(true);
    const userText = input;
    setInput('');

    const ongoingHistory: ChatTurn[] = [...messages, { role: 'user', content: userText }];
    setMessages(ongoingHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: threadId,
          messageContent: userText,
          selectedModel: model,
          systemInstruction: systemPrompt
        })
      });

      const data = await res.json();
      if (data.threadId) setThreadId(data.threadId);
      
      setMessages([...ongoingHistory, { 
        role: 'assistant', 
        content: data.response, 
        modelUsed: model 
      }]);

      refreshThreads(searchQuery); // Update sidebar metadata position natively

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Control Panel Panel Sidebar Container */}
      <section className="w-80 bg-gray-950 p-4 flex flex-col gap-4 border-r border-gray-800 h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-md font-bold text-indigo-400">Unified Hub</h1>
          <Link href="/settings" className="text-xs text-gray-400 hover:text-white bg-gray-900 px-2 py-1 rounded border border-gray-800 transition">
            ⚙ Settings
          </Link>
        </div>

        <button 
          onClick={startNewChat}
          className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold py-2 rounded border border-indigo-500/30 transition"
        >
          + Start New Thread
        </button>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Active Model</label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id} className="bg-gray-900 text-white">{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">System Instructions</label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none resize-none text-white"
          />
        </div>

        <hr className="border-gray-800" />

        {/* Global Search Bar Segment */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Search History logs</label>
          <input 
            type="text"
            placeholder="Search keywords inside chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Scrollable Thread History Sidebar List Viewport */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {threadsList.map((t) => (
            <button
              key={t._id}
              onClick={() => loadThread(t._id)}
              className={`w-full text-left p-2 rounded text-xs transition border flex flex-col gap-0.5 ${
                threadId === t._id 
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200' 
                  : 'bg-gray-900/30 border-transparent hover:bg-gray-900/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="font-medium truncate block">{t.name}</span>
              <span className="text-[9px] text-gray-500 font-mono block truncate">
                ID: {t._id}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Primary Conversation Stream Panel */}
      <section className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Initialize a prompt stream or choose an active thread sidebar historical record.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`max-w-3xl mx-auto flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
                {msg.modelUsed && (
                  <span className="text-[10px] font-mono text-gray-500 px-1 mt-0.5">
                    Generated via: {msg.modelUsed.split('/')[1] || msg.modelUsed}
                  </span>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="max-w-3xl mx-auto text-xs text-indigo-400 font-mono animate-pulse">
              Accessing target dataset records...
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-950/60 border-t border-gray-800">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything, switch models dynamically mid-chat..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 px-6 py-3 rounded text-sm font-semibold transition"
            >
              Dispatch
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}