'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  readmeContent: string;
  isDark: boolean;
}

export function ReadmeModal({
  isOpen,
  onClose,
  readmeContent,
  isDark,
}: ReadmeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative w-full max-w-3xl mx-4 rounded-lg border shadow-xl max-h-[90vh] flex flex-col ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>README</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>✕</button>
        </div>
        <div className={`p-4 overflow-y-auto flex-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} prose prose-sm max-w-none ${isDark ? 'prose-invert prose-strong:text-white' : 'prose-strong:text-gray-900'} prose-headings:text-sm prose-p:text-xs prose-ul:text-xs`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeContent || 'Loading...'}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}