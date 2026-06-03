'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { CostCalculator } from './components/CostCalculator';
import { RawDataModal } from './components/RawDataModal';
import { estimateTokens, formatTokenCount, MODEL_CONTEXT_LIMITS } from '@/lib/tokens';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  promptName?: string;
  systemInstruction?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ThreadSummary {
  _id: string;
  name: string;
  currentModel: string;
  updatedAt?: string;
}

interface ThreadMetadata {
  id: string;
  name: string;
  currentModel: string;
  systemInstruction: string;
  createdAt: string;
  updatedAt: string;
}

interface DropdownModel {
  id: string;
  name: string;
}

interface SavedPrompt {
  _id: string;
  name: string;
  content: string;
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
  const [renamingThread, setRenamingThread] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPromptName, setSelectedPromptName] = useState('');
  const [showRawData, setShowRawData] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [threadMetadata, setThreadMetadata] = useState<ThreadMetadata | null>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isDark = theme === 'dark';

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
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => {
        if (data.prompts) setSavedPrompts(data.prompts);
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
          const mappedMessages = data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            modelUsed: m.modelUsed,
            usage: m.usage,
            systemInstruction: m.systemInstruction,
            promptName: m.promptName
          }));
          setMessages(mappedMessages);
          
          // Restore the last used prompt name from messages
          const lastMessageWithPrompt = mappedMessages.findLast((m: ChatTurn) => m.promptName);
          if (lastMessageWithPrompt && lastMessageWithPrompt.promptName) {
            setSelectedPromptName(lastMessageWithPrompt.promptName);
          }
        }
        if (data.thread) {
          setThreadMetadata(data.thread);
          // Restore the system prompt from thread metadata
          if (data.thread.systemInstruction) {
            setSystemPrompt(data.thread.systemInstruction);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  const startNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setInput('');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const startRename = (thread: ThreadSummary) => {
    setRenamingThread(thread._id);
    setRenameValue(thread.name);
  };

  const saveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    
    try {
      const res = await fetch(`/api/threads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue })
      });
      
      if (res.ok) {
        setThreadsList(prev => prev.map(t => 
          t._id === id ? { ...t, name: renameValue } : t
        ));
        setRenamingThread(null);
        setRenameValue('');
      }
    } catch (e) {
      console.error('Failed to rename thread:', e);
    }
  };

  const cancelRename = () => {
    setRenamingThread(null);
    setRenameValue('');
  };

  const loadPrompt = (id: string) => {
    const prompt = savedPrompts.find(p => p._id === id);
    if (prompt) {
      setSystemPrompt(prompt.content);
      setSelectedPromptName(prompt.name);
    }
  };

  const saveCurrentPrompt = async () => {
    if (!promptName.trim() || !systemPrompt.trim()) return;
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: promptName, content: systemPrompt })
      });
      if (res.ok) {
        setPromptName('');
        setShowSavePrompt(false);
        setSelectedPromptName(promptName);
        const promptsRes = await fetch('/api/prompts');
        const promptsData = await promptsRes.json();
        if (promptsData.prompts) setSavedPrompts(promptsData.prompts);
      }
    } catch (e) {
      console.error('Failed to save prompt:', e);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const threadTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  const systemTokens = estimateTokens(systemPrompt);
  const inputTokens = estimateTokens(input);
  const contextLimit = MODEL_CONTEXT_LIMITS[model] || 128000;
  const totalTokens = threadTokens + inputTokens + systemTokens;
  const usagePercent = Math.min(100, Math.round((totalTokens / contextLimit) * 100));

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
          systemInstruction: systemPrompt,
          promptName: selectedPromptName || null
        })
      });

      const data = await res.json();
      if (data.threadId) setThreadId(data.threadId);
      
      setMessages([...ongoingHistory, { 
        role: 'assistant', 
        content: data.response, 
        modelUsed: model,
        promptName: selectedPromptName || undefined,
        usage: data.usage
      }]);

      refreshThreads(searchQuery); // Update sidebar metadata position natively

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`flex h-screen font-sans ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Control Panel Panel Sidebar Container */}
      <section className={`w-80 p-4 flex flex-col gap-4 border-r h-full pb-8 ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-md font-bold text-indigo-400">Unified Chat Hub</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`text-xs px-2 py-1 rounded border transition ${isDark ? 'text-gray-400 hover:text-white bg-gray-900 border-gray-800' : 'text-gray-600 hover:text-gray-900 bg-gray-100 border-gray-300'}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <Link href="/settings" className={`text-xs px-2 py-1 rounded border transition ${isDark ? 'text-gray-400 hover:text-white bg-gray-900 border-gray-800' : 'text-gray-600 hover:text-gray-900 bg-gray-100 border-gray-300'}`}>
              ⚙ Settings
            </Link>
          </div>
        </div>

        <button 
          onClick={startNewChat}
          className={`w-full text-xs font-semibold py-2 rounded border transition ${isDark ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'}`}
        >
          + Start New Thread
        </button>
        
        <hr className={isDark ? 'border-gray-800' : 'border-gray-200'} />

        {/* Global Search Bar Segment */}
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search History logs</label>
          <input 
            type="text"
            placeholder="Search keywords inside chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-gray-900 border-gray-800 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
          />
        </div>

        {/* Scrollable Thread History Sidebar List Viewport */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {threadsList.map((t) => (
            <div
              key={t._id}
              className={`w-full p-2 rounded text-xs transition border flex flex-col gap-0.5 group ${
                threadId === t._id 
                  ? (isDark ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-700') 
                  : (isDark ? 'bg-gray-900/30 border-transparent hover:bg-gray-900/60 text-gray-400 hover:text-gray-200' : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900')
              }`}
            >
              {renamingThread === t._id ? (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(t._id);
                      if (e.key === 'Escape') cancelRename();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full border rounded px-1.5 py-0.5 text-xs focus:outline-none ${isDark ? 'bg-gray-800 border-indigo-500 text-white' : 'bg-white border-indigo-400 text-gray-900'}`}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveRename(t._id)}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => cancelRename()}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-medium truncate flex-1 cursor-pointer" onClick={() => loadThread(t._id)}>
                      {t.name}
                    </span>
                    <button
                      onClick={() => startRename(t)}
                      className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Rename thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                   <span className={`text-[9px] font-mono block truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ID: {t._id}
                  </span>
                  {t.updatedAt && (
                     <span className={`text-[9px] block truncate ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {formatDate(t.updatedAt)}
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Primary Conversation Stream Panel */}
      <section className={`flex-1 flex flex-col h-full pb-8 ${isDark ? '' : ''}`}>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className={`h-full flex items-center justify-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Initialize a prompt stream or choose an active thread sidebar historical record.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`max-w-3xl mx-auto flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? (isDark ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-indigo-500 text-white rounded-br-none') 
                    : (isDark ? 'bg-gray-800 text-gray-200 rounded-bl-none' : 'bg-gray-200 text-gray-800 rounded-bl-none')
                }`}>
                  <MarkdownRenderer content={msg.content} isUser={msg.role === 'user'} />
                </div>
                {msg.modelUsed && (
                  <div className={`text-[10px] font-mono px-1 mt-0.5 space-y-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>
                      Generated via: {msg.modelUsed.split('/')[1] || msg.modelUsed}{msg.promptName ? ` (${msg.promptName})` : ''}
                    </span>
                    {msg.systemInstruction && (
                      <span className="block text-gray-600 truncate max-w-md" title={msg.systemInstruction}>
                        using: {msg.systemInstruction}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className={`max-w-3xl mx-auto text-xs font-mono animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Accessing target dataset records...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-4 border-t ${isDark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>Context: {formatTokenCount(totalTokens)} / {formatTokenCount(contextLimit)} ({usagePercent}%)</span>
              <div className="flex gap-3">
                <span>Input: ~{formatTokenCount(inputTokens)} ({input.length} chars)</span>
                <span>Thread: ~{formatTokenCount(threadTokens)} ({messages.reduce((sum, msg) => sum + msg.content.length, 0)} chars, {messages.length} msgs)
                  <CostCalculator messages={messages} />
                </span>
              </div>
            </div>
            <div className={`w-full rounded-full h-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div 
                className={`h-1 rounded-full transition-all ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex gap-3 items-start">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything, switch models dynamically mid-chat..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-100"
              />
              <button
                onClick={() => setShowRawData(true)}
                className={`border px-3 py-3 rounded text-sm font-semibold transition shrink-0 ${isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'}`}
                title="View raw thread data"
              >
                {'{ }'}
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 px-6 py-3 rounded text-sm font-semibold transition shrink-0"
              >
                Dispatch
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase text-gray-500 tracking-wider">Active Model</label>
                <select 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id} className="bg-gray-900 text-white">{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[2] flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold uppercase text-gray-500 tracking-wider">System Instructions</label>
                  <div className="flex gap-1 items-center">
                    {selectedPromptName && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                        Active: {selectedPromptName}
                      </span>
                    )}
                    <button
                      onClick={() => setShowSavePrompt(!showSavePrompt)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition ${isDark ? 'text-gray-400 border-gray-700 hover:text-gray-200' : 'text-gray-500 border-gray-300 hover:text-gray-700'}`}
                      title="Save current prompt"
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
                {showSavePrompt && (
                  <div className="flex gap-1 mb-1">
                    <input
                      type="text"
                      value={promptName}
                      onChange={(e) => setPromptName(e.target.value)}
                      placeholder="Prompt name..."
                      className={`flex-1 border rounded px-1.5 py-1 text-xs focus:outline-none ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button onClick={saveCurrentPrompt} className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded">OK</button>
                  </div>
                )}
                {savedPrompts.length > 0 && (
                  <select
                    onChange={(e) => loadPrompt(e.target.value)}
                    value=""
                    className={`w-full border rounded px-1.5 py-1 text-xs focus:outline-none mb-1 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                  >
                    <option value="">Load saved prompt...</option>
                    {savedPrompts.map(p => (
                      <option key={p._id} value={p._id} className="bg-gray-900 text-white">{p.name}</option>
                    ))}
                  </select>
                )}
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={1}
                  className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 resize-none ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="You are a helpful assistant."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 border-t py-2 text-center text-xs ${isDark ? 'bg-gray-950 border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        By <a href="https://35sites.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition">Jorge Pereira (35sites.com LLC)</a>
      </footer>

      <RawDataModal
        messages={messages}
        threadId={threadId}
        threadMetadata={threadMetadata}
        isOpen={showRawData}
        onClose={() => setShowRawData(false)}
      />
    </main>
  );
}