'use client';

import { useState } from 'react';
import { formatTokenCount } from '@/lib/tokens';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt?: string;
}

interface ThreadMetadata {
  id: string;
  name: string;
  currentModel: string;
  systemInstruction: string;
  createdAt: string;
  updatedAt: string;
}

interface RawDataModalProps {
  messages: Message[];
  threadId: string | null;
  threadMetadata: ThreadMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RawDataModal({ messages, threadId, threadMetadata, isOpen, onClose }: RawDataModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rawData = {
    threadId,
    threadMetadata: threadMetadata || null,
    messageCount: messages.length,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      modelUsed: m.modelUsed || null,
      systemInstruction: m.systemInstruction || null,
      tokens: m.usage || null,
      timestamp: m.createdAt || null
    }))
  };

  const jsonString = JSON.stringify(rawData, null, 2);

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(jsonString);
      });
    } else {
      fallbackCopy(jsonString);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  const totalTokens = messages.reduce((sum, m) => sum + (m.usage?.totalTokens || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Raw Thread Data</h3>
            <p className="text-[10px] text-gray-500">{messages.length} messages · {formatTokenCount(totalTokens)} total tokens</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy JSON
                </>
              )}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <pre className="flex-1 overflow-auto bg-gray-950 border border-gray-800 rounded p-3 text-[10px] text-gray-300 font-mono whitespace-pre-wrap break-all">
          {jsonString}
        </pre>
      </div>
    </div>
  );
}
