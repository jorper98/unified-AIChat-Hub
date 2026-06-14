'use client';

import { useRef, useEffect, useState } from 'react';
import { DropdownModel, SavedPrompt, ChatTurn } from '@/types';
import { CostCalculator } from './CostCalculator';
import { formatTokenCount, MODEL_CONTEXT_LIMITS, MODEL_PRICING } from '@/lib/tokens';

interface ChatInputProps {
  input: string;
  loading: boolean;
  model: string;
  availableModels: DropdownModel[];
  systemPrompt: string;
  selectedPromptName: string;
  showSavePrompt: boolean;
  promptName: string;
  savedPrompts: SavedPrompt[];
  bypassRouter: boolean;
  isDark: boolean;
  messages: ChatTurn[];
  totalTokens: number;
  contextLimit: number;
  usagePercent: number;
  inputTokens: number;
  inputLength: number;
  threadTokens: number;
  threadChars: number;
  messagesCount: number;
  setInput: (v: string) => void;
  handleSend: () => void;
  setModel: (v: string) => void;
  setSystemPrompt: (v: string) => void;
  setShowSavePrompt: (v: boolean) => void;
  setPromptName: (v: string) => void;
  saveCurrentPrompt: () => void;
  setBypassRouter: (v: boolean) => void;
  setShowPromptModal: (v: boolean) => void;
  setShowRawData: (v: boolean) => void;
}

export function ChatInput({
  input,
  loading,
  model,
  availableModels,
  systemPrompt,
  selectedPromptName,
  showSavePrompt,
  promptName,
  savedPrompts,
  bypassRouter,
  isDark,
  messages,
  totalTokens,
  contextLimit,
  usagePercent,
  inputTokens,
  inputLength,
  threadTokens,
  threadChars,
  messagesCount,
  setInput,
  handleSend,
  setModel,
  setSystemPrompt,
  setShowSavePrompt,
  setPromptName,
  saveCurrentPrompt,
  setBypassRouter,
  setShowPromptModal,
  setShowRawData,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sysInputRef = useRef<HTMLTextAreaElement>(null);
  const [sysFocused, setSysFocused] = useState(false);

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    autoGrow(textareaRef.current);
  }, [input]);

  useEffect(() => {
    if (sysFocused) autoGrow(sysInputRef.current);
  }, [systemPrompt, sysFocused]);

  const truncatedPrompt = systemPrompt.length > 100
    ? systemPrompt.slice(0, 100) + '...'
    : systemPrompt;

  return (
    <div className={`p-4 border-t ${isDark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>Context: {formatTokenCount(totalTokens)} / {formatTokenCount(contextLimit)} ({usagePercent}%)</span>
          <div className="flex items-center gap-3">
            <span>Input: ~{formatTokenCount(inputTokens)} ({inputLength} chars)</span>
            <span>Thread: ~{formatTokenCount(threadTokens)} ({threadChars} chars, {messagesCount} msgs)</span>
            <div className="flex items-center gap-1">
              <CostCalculator messages={messages} />
              <button
                onClick={() => setShowRawData(true)}
                className={`border px-1.5 py-0.5 rounded text-[9px] font-mono transition shrink-0 ${isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'}`}
                title="View raw thread data"
              >
                {'{ }'}
              </button>
            </div>
          </div>
        </div>
        <div className={`w-full rounded-full h-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div 
            className={`h-1 rounded-full transition-all ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex gap-3 items-start">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything, switch models dynamically mid-chat..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-100 resize-none overflow-y-auto min-h-[44px] transition-[height] duration-200"
          />
          <button
            type="button"
            onClick={() => setBypassRouter(!bypassRouter)}
            className={`rounded-md p-2.5 transition shrink-0 border cursor-pointer ${bypassRouter
              ? 'border-indigo-500 bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
              : 'border-gray-600 bg-gray-800 text-gray-500 hover:border-indigo-500 hover:text-indigo-400'
            }`}
            title={bypassRouter ? 'Router bypassed - sending directly to LLM' : 'Skip router, send directly to LLM'}
          >
            <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 002-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg> Save
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
              {!sysFocused && systemPrompt ? (
                <div
                  onClick={() => setSysFocused(true)}
                  className={`flex-1 border rounded px-2 py-1.5 text-xs truncate cursor-text ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'} hover:border-indigo-500/50 transition-colors`}
                  title="Click to edit system instructions"
                >
                  {truncatedPrompt}
                </div>
              ) : (
                <textarea
                  ref={sysInputRef}
                  autoFocus={sysFocused}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  onBlur={() => setSysFocused(false)}
                  rows={1}
                  className={`flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 resize-none overflow-y-auto min-h-[32px] transition-[height] duration-200 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="You are a helpful assistant."
                />
              )}
              {savedPrompts.length > 0 && (
                <button
                  onClick={() => setShowPromptModal(true)}
                  className={`border rounded px-2 py-1.5 text-xs shrink-0 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-800'}`}
                  title="Load saved prompt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
