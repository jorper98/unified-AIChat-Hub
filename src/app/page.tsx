'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CostCalculator } from './components/CostCalculator';
import { RawDataModal } from './components/RawDataModal';
import { ThreadSidebar } from './components/ThreadSidebar';
import { MessageArea } from './components/MessageArea';
import { ChatInput } from './components/ChatInput';
import { PromptModal } from './components/PromptModal';
import { ArchiveModal } from './components/ArchiveModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AboutModal } from './components/AboutModal';
import { ReadmeModal } from './components/ReadmeModal';
import { SettingsModal } from './components/SettingsModal';
import { GlobalCostModal } from './components/GlobalCostModal';
import { ImageGalleryModal } from './components/ImageGalleryModal';
import { estimateTokens, formatTokenCount, MODEL_CONTEXT_LIMITS, MODEL_PRICING } from '@/lib/tokens';
import { ChatTurn, ThreadSummary, ThreadMetadata, DropdownModel, SavedPrompt } from '@/types';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

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
  const router = useRouter();
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
  const [themeColors, setThemeColors] = useState<any>(null);

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
  const [showReadme, setShowReadme] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [showGlobalCost, setShowGlobalCost] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [bypassRouter, setBypassRouter] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);

    fetch('/api/auth/me')
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  const [threadsLimit, setThreadsLimit] = useState(25);
  const [threadsSkip, setThreadsSkip] = useState(0);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [messagesLimit, setMessagesLimit] = useState(100);
  const [messagesSkip, setMessagesSkip] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [archivedThreadsSkip, setArchivedThreadsSkip] = useState(0);
  const [hasMoreArchivedThreads, setHasMoreArchivedThreads] = useState(true);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const isDark = mounted ? theme === 'dark' : true;

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.themeColors) {
          setThemeColors(data.themeColors);
        }
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
    const colors = themeColors 
      ? (theme === 'dark' ? themeColors.dark : themeColors.light)
      : null;
    
    const root = document.documentElement;
    root.style.setProperty('--bg-background', colors?.background || (theme === 'dark' ? '#111827' : '#f9fafb'));
    root.style.setProperty('--bg-surface', colors?.surface || (theme === 'dark' ? '#1f2937' : '#ffffff'));
    root.style.setProperty('--bg-surface-alt', colors?.surfaceAlt || (theme === 'dark' ? '#030712' : '#f3f4f6'));
    root.style.setProperty('--bg-secondary', colors?.bgSecondary || (theme === 'dark' ? '#374151' : '#d1d5db'));
    root.style.setProperty('--bg-tertiary', colors?.bgTertiary || (theme === 'dark' ? '#4b5563' : '#9ca3af'));
    root.style.setProperty('--text-primary', colors?.textPrimary || (theme === 'dark' ? '#f3f4f6' : '#111827'));
    root.style.setProperty('--text-secondary', colors?.textSecondary || (theme === 'dark' ? '#d1d5db' : '#374151'));
    root.style.setProperty('--text-muted', colors?.textMuted || (theme === 'dark' ? '#6b7280' : '#9ca3af'));
    root.style.setProperty('--color-accent', colors?.accent || '#6366f1');
    root.style.setProperty('--color-accent-hover', colors?.accentHover || (theme === 'dark' ? '#818cf8' : '#4f46e5'));
    root.style.setProperty('--border-color', colors?.border || (theme === 'dark' ? '#374151' : '#e5e7eb'));
    root.style.setProperty('--border-alt', colors?.borderAlt || (theme === 'dark' ? '#1f2937' : '#d1d5db'));
  }, [theme, themeColors]);

  useEffect(() => {
    fetch('/About.md?t=' + Date.now())
      .then(res => res.text())
      .then(text => setAboutContent(text))
      .catch(() => setAboutContent(''));
  }, []);

  useEffect(() => {
    if (showReadme) {
      fetch('/api/readme')
        .then(res => res.text())
        .then(text => setReadmeContent(text))
        .catch(() => setReadmeContent(''));
    }
  }, [showReadme]);

  useEffect(() => {
    if (showSettingsModal) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setSettingsData(data));
    }
  }, [showSettingsModal]);

  const refreshThreads = (search = '', skip = 0, isLoadMore = false) => {
    const url = search 
      ? `/api/threads?q=${encodeURIComponent(search)}&limit=${threadsLimit}&skip=${skip}` 
      : `/api/threads?limit=${threadsLimit}&skip=${skip}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.threads) {
          if (isLoadMore) {
            setThreadsList(prev => [...prev, ...data.threads]);
          } else {
            setThreadsList(data.threads);
          }
          setHasMoreThreads(data.threads.length === threadsLimit);
        }
      });
  };

  const loadMoreThreads = () => {
    const newSkip = threadsSkip + threadsLimit;
    setThreadsSkip(newSkip);
    refreshThreads(searchQuery, newSkip, true);
  };

  useEffect(() => {
    setThreadsSkip(0);
    const delayDebounce = setTimeout(() => {
      refreshThreads(searchQuery, 0, false);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('activeThreadId', threadId);
    } else {
      localStorage.removeItem('activeThreadId');
    }
  }, [threadId]);

  const loadThread = (id: string, skip = 0, isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setThreadId(id);
      setMessagesSkip(0);
    }
    
    fetch(`/api/threads/${id}/messages?limit=${messagesLimit}&skip=${skip}`)
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
            perplexityUsed: m.perplexityUsed,
            routingTool: m.routingTool
          }));
          
          if (isLoadMore) {
            setMessages(prev => [...mappedMessages, ...prev]);
          } else {
            setMessages(mappedMessages);
            const lastMessageWithPrompt = mappedMessages.findLast((m: ChatTurn) => m.promptName);
            if (lastMessageWithPrompt && lastMessageWithPrompt.promptName) {
              setSelectedPromptName(lastMessageWithPrompt.promptName);
            }
          }
          setHasMoreMessages(mappedMessages.length === messagesLimit);
        }
        if (data.thread) {
          setThreadMetadata(data.thread);
          if (data.thread.currentModel) {
            setModel(data.thread.currentModel);
          }
          if (data.thread.systemInstruction) {
            setSystemPrompt(data.thread.systemInstruction);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  const loadOlderMessages = () => {
    if (!threadId) return;
    const newSkip = messagesSkip + messagesLimit;
    setMessagesSkip(newSkip);
    loadThread(threadId, newSkip, true);
  };

  const startNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setInput('');
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
      setErrorMessage('Failed to rename thread.');
    }
  };

  const cancelRename = () => {
    setRenamingThread(null);
    setRenameValue('');
  };

  const refreshPrompts = async () => {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to load prompts.');
      return;
    }
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
      setErrorMessage('Failed to update prompt.');
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
      setErrorMessage('Failed to delete prompt.');
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
      setErrorMessage('Failed to archive thread.');
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
      setErrorMessage('Failed to delete thread.');
    }
  };

  const unarchiveThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}/archive`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) });
      if (res.ok) {
        setArchivedThreads(prev => prev.filter(t => t._id !== id));
        refreshThreads();
      }
    } catch (e) {
      console.error('Failed to unarchive thread:', e);
      setErrorMessage('Failed to unarchive thread.');
    }
  };

  const loadArchivedThreads = async (skip = 0, isLoadMore = false) => {
    try {
      const res = await fetch(`/api/threads?archived=true&limit=${threadsLimit}&skip=${skip}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to load archived threads.');
        return;
      }
      if (data.threads) {
        if (isLoadMore) {
          setArchivedThreads(prev => [...prev, ...data.threads]);
        } else {
          setArchivedThreads(data.threads);
        }
        setHasMoreArchivedThreads(data.threads.length === threadsLimit);
      }
    } catch (e) {
      console.error('Failed to load archived threads:', e);
      setErrorMessage('Failed to load archived threads.');
    }
  };

  const loadMoreArchivedThreads = () => {
    const newSkip = archivedThreadsSkip + threadsLimit;
    setArchivedThreadsSkip(newSkip);
    loadArchivedThreads(newSkip, true);
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
      setErrorMessage('Failed to save prompt.');
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const threadTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  const systemTokens = estimateTokens(systemPrompt);
  const inputTokens = estimateTokens(input);
  const contextLimit = MODEL_CONTEXT_LIMITS[model] || 128000;
  const totalTokens = threadTokens + inputTokens + systemTokens;
  const usagePercent = Math.min(100, Math.round((totalTokens / contextLimit) * 100));

  async function handleSend() {
    if (!input.trim() || loading || !model) return;

    // Require API key for all users EXCEPT admin (who can fall back to global .env key)
    // or users who still have free uses remaining (< 15)
    if (!user?.hasApiKey && user?.role !== 'admin' && (user?.freeUses || 0) >= 15) {
      setShowApiKeyWarning(true);
      return;
    }

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
          promptName: selectedPromptName || null,
          bypassRouter: bypassRouter
        })
      });

      const data = await res.json();
      
      // Catch backend returning 200 OK but with an API error string in the response
      if (data.response && typeof data.response === 'string' && data.response.includes('API Error') && data.response.includes('Missing Authentication')) {
        setShowApiKeyWarning(true);
        setErrorMessage('API Key missing or invalid. Please configure it in Settings.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        if (data.code === 'MISSING_API_KEY' || res.status === 401) {
          setShowApiKeyWarning(true);
          setErrorMessage('API Key missing or invalid. Please configure it in Settings.');
        } else {
          throw new Error(data.error || 'Failed to send message.');
        }
        return;
      }
      
      // Update user freeUses count if the backend returned it
      if (data.freeUses !== undefined && user) {
        setUser({ ...user, freeUses: data.freeUses });
      }

      if (data.threadId) {
        setThreadId(data.threadId);
        
        setThreadsList(prev => {
          const existingIndex = prev.findIndex(t => t._id === data.threadId);
          if (existingIndex >= 0) {
            const updatedThread = { ...prev[existingIndex], updatedAt: new Date().toISOString() };
            const newList = [...prev];
            newList.splice(existingIndex, 1);
            return [updatedThread, ...newList];
          } else {
            const trimmed = userText.trim();
            const firstLine = trimmed.split('\n')[0];
            const words = firstLine.split(/\s+/);
            let name = firstLine;
            if (words.length > 8) {
              let summary = firstLine.substring(0, 60).trim();
              const lastSpace = summary.lastIndexOf(' ');
              if (lastSpace > 20) summary = summary.substring(0, lastSpace);
              name = summary + '...';
            }
            const newThread: ThreadSummary = {
              _id: data.threadId,
              name: name,
              currentModel: model,
              updatedAt: new Date().toISOString()
            };
            return [newThread, ...prev];
          }
        });
      }
      
      setMessages([...ongoingHistory, { 
        role: 'assistant', 
        content: data.response, 
        modelUsed: model,
        promptName: selectedPromptName || undefined,
        routingTool: data.routingTool,
        perplexityUsed: data.perplexityUsed,
        usage: data.usage
      }]);

    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`flex h-screen font-sans ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <ThreadSidebar
        threadsList={threadsList}
        searchQuery={searchQuery}
        threadId={threadId}
        renamingThread={renamingThread}
        renameValue={renameValue}
        isDark={isDark}
        hasMoreThreads={hasMoreThreads}
        threadsLimit={threadsLimit}
        setSearchQuery={setSearchQuery}
        setRenamingThread={setRenamingThread}
        setRenameValue={setRenameValue}
        setThreadsLimit={setThreadsLimit}
        setThreadsSkip={setThreadsSkip}
        loadThread={loadThread}
        startRename={startRename}
        saveRename={saveRename}
        cancelRename={cancelRename}
        archiveThread={archiveThread}
        setDeleteConfirmId={setDeleteConfirmId}
        loadMoreThreads={loadMoreThreads}
        refreshThreads={refreshThreads}
        setShowArchives={setShowArchives}
        loadArchivedThreads={() => loadArchivedThreads(0, false)}
        startNewChat={startNewChat}
        APP_VERSION={APP_VERSION}
        toggleTheme={toggleTheme}
        setShowAbout={setShowAbout}
        setShowGlobalCost={setShowGlobalCost}
        setShowImageGallery={setShowImageGallery}
        user={user}
        handleLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full pb-8">
        {errorMessage && (
          <div className={`mx-8 mt-4 p-3 rounded border flex justify-between items-center ${isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="text-sm">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-xs font-bold px-2 py-1 hover:opacity-75">✕</button>
          </div>
        )}
        
        <MessageArea
          messages={messages}
          loading={loading}
          isDark={isDark}
          hasMoreMessages={hasMoreMessages}
          loadOlderMessages={loadOlderMessages}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          input={input}
          loading={loading}
          model={model}
          availableModels={availableModels}
          systemPrompt={systemPrompt}
          selectedPromptName={selectedPromptName}
          showSavePrompt={showSavePrompt}
          promptName={promptName}
          savedPrompts={savedPrompts}
          bypassRouter={bypassRouter}
          isDark={isDark}
          messages={messages}
          totalTokens={totalTokens}
          contextLimit={contextLimit}
          usagePercent={usagePercent}
          inputTokens={inputTokens}
          inputLength={input.length}
          threadTokens={threadTokens}
          threadChars={messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)}
          messagesCount={messages.length}
          setInput={setInput}
          handleSend={handleSend}
          setModel={setModel}
          setSystemPrompt={setSystemPrompt}
          setShowSavePrompt={setShowSavePrompt}
          setPromptName={setPromptName}
          saveCurrentPrompt={saveCurrentPrompt}
          setBypassRouter={setBypassRouter}
          setShowPromptModal={setShowPromptModal}
          setShowRawData={setShowRawData}
        />
      </div>

      <footer className={`fixed bottom-0 left-0 right-0 border-t py-2 text-center text-xs ${isDark ? 'bg-gray-950 border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        By <a href="https://35sites.com/applications/unified-aichat-hub/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition">Jorge Pereira (35sites.com LLC)</a>
      </footer>

      <RawDataModal
        messages={messages}
        threadId={threadId}
        threadMetadata={threadMetadata}
        isOpen={showRawData}
        onClose={() => setShowRawData(false)}
      />

      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        savedPrompts={savedPrompts}
        selectedPromptName={selectedPromptName}
        editingPrompt={editingPrompt}
        isDark={isDark}
        loadPrompt={loadPrompt}
        startEditPrompt={startEditPrompt}
        saveEditedPrompt={saveEditedPrompt}
        cancelEditPrompt={cancelEditPrompt}
        deletePrompt={deletePrompt}
        setEditingPrompt={setEditingPrompt}
      />

      <ArchiveModal
        isOpen={showArchives}
        onClose={() => setShowArchives(false)}
        archivedThreads={archivedThreads}
        isDark={isDark}
        hasMoreArchivedThreads={hasMoreArchivedThreads}
        loadThread={loadThread}
        unarchiveThread={unarchiveThread}
        setDeleteConfirmId={setDeleteConfirmId}
        loadMoreArchivedThreads={loadMoreArchivedThreads}
      />

      <DeleteConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        isDark={isDark}
        deleteConfirmId={deleteConfirmId}
        deleteThread={deleteThread}
      />

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        aboutContent={aboutContent}
        isDark={isDark}
        appVersion={APP_VERSION}
        setShowReadme={setShowReadme}
        setShowSettingsModal={setShowSettingsModal}
        setShowGlobalCost={setShowGlobalCost}
      />

      <ReadmeModal
        isOpen={showReadme}
        onClose={() => setShowReadme(false)}
        readmeContent={readmeContent}
        isDark={isDark}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settingsData={settingsData}
        isDark={isDark}
        threadsList={threadsList}
        archivedThreads={archivedThreads}
      />

      <GlobalCostModal
        isOpen={showGlobalCost}
        onClose={() => setShowGlobalCost(false)}
        isDark={isDark}
      />

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        isDark={isDark}
      />

      {showApiKeyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <svg className="h-8 w-8 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>API Key Required</h3>
            </div>
            <p className={`mb-6 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Please setup your OpenRouter API key in the settings page before sending messages. Each user must provide their own API key to use the chat.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApiKeyWarning(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/settings?tab=utility-llms')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}