'use client';

import { ChatTurn } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageAreaProps {
  messages: ChatTurn[];
  loading: boolean;
  isDark: boolean;
  hasMoreMessages: boolean;
  loadOlderMessages: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageArea({
  messages,
  loading,
  isDark,
  hasMoreMessages,
  loadOlderMessages,
  messagesEndRef,
}: MessageAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadOlderMessages}
              className={`text-xs font-semibold py-2 px-4 rounded border transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'}`}
            >
              Load Older Messages
            </button>
          </div>
        )}
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
                    {msg.routingTool === 'web_search' && ' | web_search (Perplexity)'}
                    {msg.routingTool && msg.routingTool.includes('/') && ` | image (${msg.routingTool.split('/')[1]})`}
                    {msg.routingTool === 'direct' && ' | direct'}
                    {msg.perplexityUsed && !msg.routingTool && ' | Perplexity'}
                    {!msg.routingTool && msg.usage?.routerTokens && msg.usage.routerTokens > 0 && ' | direct'}
                  </span>
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
  );
}