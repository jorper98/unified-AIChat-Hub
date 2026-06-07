'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  aboutContent: string;
  isDark: boolean;
  appVersion: string;
  setShowReadme: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
}

export function AboutModal({
  isOpen,
  onClose,
  aboutContent,
  isDark,
  appVersion,
  setShowReadme,
  setShowSettingsModal,
}: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative w-full max-w-lg mx-4 rounded-lg border shadow-xl max-h-[85vh] flex flex-col ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>About Unified Chat Hub</h3>
            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Version {appVersion}</p>
          </div>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>✕</button>
        </div>
        <div className={`p-4 overflow-y-auto flex-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''} prose-headings:text-sm prose-p:text-xs prose-ul:text-xs prose-strong:text-white`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutContent || 'Loading...'}</ReactMarkdown>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              By Jorge Pereira (35sites.com LLC) · <a href="https://35sites.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">35sites.com</a>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSettingsModal(true); onClose(); }}
                className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-500 hover:text-gray-800'}`}
                title="View Settings"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => { setShowReadme(true); onClose(); }}
                className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-500 hover:text-gray-800'}`}
                title="View README"
              >
                📄 README
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}