'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CostCalculator } from './components/CostCalculator';
import { RawDataModal } from './components/RawDataModal';
import { estimateTokens, formatTokenCount, MODEL_CONTEXT_LIMITS, MODEL_PRICING } from '@/lib/tokens';

const APP_VERSION = '0.1.5';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  promptName?: string;
  systemInstruction?: string;
  perplexityUsed?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    imageTokens?: number;
    actualCost?: number;
    perplexityTokens?: number;
    perplexityCost?: number;
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
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeThreadId') || null;
    }
    return null;
  });
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, []);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPromptName, setSelectedPromptName] = useState('');
  const [showRawData, setShowRawData] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<{ id: string; name: string; content: string } | null>(null);
  const [threadMetadata, setThreadMetadata] = useState<ThreadMetadata | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const [archivedThreads, setArchivedThreads] = useState<ThreadSummary[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutContent, setAboutContent] = useState('');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isDark = mounted ? theme === 'dark' : true;

  // 1. Initial Load: Get dropdown models and sidebar threads
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const modelList = data.models || data.selectedModels || [];
        const formatted = modelList.map((m: any) => ({
          id: typeof m === 'string' ? m : m.id,
          name: typeof m === 'string' ? (MASTER_NAME_MAP[m] || m) : m.name,
          provider: typeof m === 'string' ? 'openrouter' : (m.provider || 'openrouter')
        }));

        const openRouterModels = formatted.filter((m: any) => m.provider === 'openrouter');
        const otherModels = formatted.filter((m: any) => m.provider !== 'openrouter');

        const processModels = (validatedOpenRouterModels: DropdownModel[]) => {
          const allModels = [...validatedOpenRouterModels, ...otherModels];
          if (allModels.length > 0) {
            setAvailableModels(allModels);
            setModel(allModels[0].id);
          }
        };

        if (openRouterModels.length > 0) {
          fetch('https://openrouter.ai/api/v1/models')
            .then(res => res.json())
            .then(apiData => {
              const validIds = new Set(apiData.data?.map((m: any) => m.id) || []);
              const validModels = openRouterModels.filter((m: any) => validIds.has(m.id));
              processModels(validModels);
            })
            .catch(() => {
              processModels(openRouterModels);
            });
        } else {
          processModels([]);
        }
      });
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => {
        if (data.prompts) setSavedPrompts(data.prompts);
      });
    refreshThreads();
    const savedThreadId = localStorage.getItem('activeThreadId');
    if (savedThreadId) {
      loadThread(savedThreadId);
    }
  }, []);

  useEffect(() => {
    fetch('/About.md')
      .then(res => res.text())
      .then(text => setAboutContent(text))
      .catch(() => setAboutContent(''));
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

  // Persist active thread ID
  useEffect(() => {
    if (threadId) {
      localStorage.setItem('activeThreadId', threadId);
    } else {
      localStorage.removeItem('activeThreadId');
    }
  }, [threadId]);

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
            promptName: m.promptName,
            perplexityUsed: m.perplexityUsed
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

  const refreshPrompts = async () => {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    if (data.prompts) setSavedPrompts(data.prompts);
  };

  const saveEditedPrompt = async () => {
    if (!editingPrompt) return;
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPrompt.id, name: editingPrompt.name, content: editingPrompt.content })
      });
      if (res.ok) {
        if (editingPrompt.name === selectedPromptName) {
          setSelectedPromptName(editingPrompt.name);
        }
        setEditingPrompt(null);
        await refreshPrompts();
      }
    } catch (e) {
      console.error('Failed to update prompt:', e);
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const res = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSavedPrompts(prev => prev.filter(p => p._id !== id));
      }
    } catch (e) {
      console.error('Failed to delete prompt:', e);
    }
  };

  const startEditPrompt = (prompt: SavedPrompt) => {
    setEditingPrompt({ id: prompt._id, name: prompt.name, content: prompt.content });
  };

  const cancelEditPrompt = () => {
    setEditingPrompt(null);
  };

  const archiveThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}/archive`, { method: 'PATCH' });
      if (res.ok) {
        setThreadsList(prev => prev.filter(t => t._id !== id));
        if (threadId === id) {
          setThreadId(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Failed to archive thread:', e);
    }
  };

  const deleteThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setThreadsList(prev => prev.filter(t => t._id !== id));
        if (threadId === id) {
          setThreadId(null);
          setMessages([]);
        }
        setDeleteConfirmId(null);
      }
    } catch (e) {
      console.error('Failed to delete thread:', e);
    }
  };

  const unarchiveThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archived: false }) });
      if (res.ok) {
        setArchivedThreads(prev => prev.filter(t => t._id !== id));
        refreshThreads();
      }
    } catch (e) {
      console.error('Failed to unarchive thread:', e);
    }
  };

  const loadArchivedThreads = async () => {
    try {
      const res = await fetch('/api/threads?archived=true');
      const data = await res.json();
      if (data.threads) setArchivedThreads(data.threads);
    } catch (e) {
      console.error('Failed to load archived threads:', e);
    }
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
        <div className="flex justify-between items-start gap-2">
          <div>
            <h1 className="text-md font-bold text-indigo-400">Unified Chat Hub</h1>
            <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            <button
              onClick={() => setShowAbout(true)}
              className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
              title="About"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link href="/settings" className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`} title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
          <div className="flex justify-between items-center">
            <label className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search History logs</label>
            <button
              onClick={() => { setShowArchives(true); loadArchivedThreads(); }}
              className={`text-[10px] px-1.5 py-0.5 rounded transition ${isDark ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600'}`}
            >
              📁 Archives
            </button>
          </div>
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
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => startRename(t)}
                        className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Rename thread"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => archiveThread(t._id)}
                        className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Archive thread"
                      >
                        📦
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(t._id)}
                        className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        title="Delete thread"
                      >
                        🗑️
                      </button>
                    </div>
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
                    : (isDark ? 'bg-gray-800 text-gray-200 rounded-bl-none' : 'bg-gray-700 text-gray-100 rounded-bl-none')
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
                <span>Thread: ~{formatTokenCount(threadTokens)} ({messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)} chars, {messages.length} msgs)
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
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-6 py-3 rounded text-sm font-semibold transition shrink-0"
              >
                Dispatch
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold uppercase text-gray-500 tracking-wider">Active Model</label>
                  {MODEL_PRICING[model] && (
                    <span className={`text-[9px] font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      ${MODEL_PRICING[model].input.toFixed(2)} in / ${MODEL_PRICING[model].output.toFixed(2)} out per 1M
                    </span>
                  )}
                </div>
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
                <div className="flex gap-1">
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={1}
                    className={`flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 resize-none ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="You are a helpful assistant."
                  />
                  {savedPrompts.length > 0 && (
                    <button
                      onClick={() => setShowPromptModal(true)}
                      className={`border rounded px-2 py-1.5 text-xs shrink-0 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-800'}`}
                      title="Load saved prompt"
                    >
                      📋
                    </button>
                  )}
                </div>
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

      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowPromptModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div 
            className={`relative w-full max-w-lg mx-4 mb-16 rounded-lg border shadow-xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Load System Prompt</h3>
              <button onClick={() => setShowPromptModal(false)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}></button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto space-y-2">
              {savedPrompts.map(p => (
                editingPrompt?.id === p._id ? (
                  <div key={p._id} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="text"
                      value={editingPrompt.name}
                      onChange={(e) => setEditingPrompt({...editingPrompt, name: e.target.value})}
                      className={`w-full border rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Prompt name"
                    />
                    <textarea
                      value={editingPrompt.content}
                      onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                      rows={3}
                      className={`w-full border rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:border-indigo-500 resize-none ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="System instructions..."
                    />
                    <div className="flex gap-1 justify-end">
                      <button onClick={cancelEditPrompt} className={`text-[10px] px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Cancel</button>
                      <button onClick={saveEditedPrompt} className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500">Save</button>
                    </div>
                  </div>
                ) : (
                  <div key={p._id} className={`p-2.5 rounded-lg border transition ${
                    selectedPromptName === p.name
                      ? (isDark ? 'bg-indigo-900/40 border-indigo-500/40' : 'bg-indigo-50 border-indigo-200')
                      : (isDark ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50')
                  }`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { loadPrompt(p._id); setShowPromptModal(false); }}>
                        <div className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{p.name}</div>
                        <div className={`text-[10px] mt-0.5 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.content}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditPrompt(p)} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} title="Edit">✏️</button>
                        <button onClick={() => deletePrompt(p._id)} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} title="Delete">🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteConfirmId(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative w-full max-w-sm mx-4 rounded-lg border shadow-xl p-5 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Delete Thread</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This will permanently delete this thread and all its messages. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className={`text-xs px-3 py-1.5 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Cancel</button>
              <button onClick={() => deleteThread(deleteConfirmId)} className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showArchives && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowArchives(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className={`relative w-full max-w-lg mx-4 mb-16 rounded-lg border shadow-xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between items-center p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Archived Threads</h3>
              <button onClick={() => setShowArchives(false)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}></button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto space-y-1">
              {archivedThreads.length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No archived threads</p>
              ) : (
                archivedThreads.map(t => (
                  <div key={t._id} className={`p-2.5 rounded-lg border flex justify-between items-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { loadThread(t._id); setShowArchives(false); }}>
                      <div className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.name}</div>
                      <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.updatedAt ? formatDate(t.updatedAt) : ''}</div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button onClick={() => unarchiveThread(t._id)} className={`text-[10px] px-2 py-1 rounded ${isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`} title="Unarchive">📤 Unarchive</button>
                      <button onClick={() => { setDeleteConfirmId(t._id); setShowArchives(false); }} className={`text-[10px] px-1.5 py-1 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} title="Delete">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAbout(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className={`relative w-full max-w-lg mx-4 rounded-lg border shadow-xl max-h-[85vh] flex flex-col ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>About Unified Chat Hub</h3>
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Version {APP_VERSION}</p>
              </div>
              <button onClick={() => setShowAbout(false)} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}></button>
            </div>
            <div className={`p-4 overflow-y-auto flex-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''} prose-headings:text-sm prose-p:text-xs prose-ul:text-xs prose-strong:text-white`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutContent || 'Loading...'}</ReactMarkdown>
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                By Jorge Pereira (35sites.com LLC) · <a href="https://35sites.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">35sites.com</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}