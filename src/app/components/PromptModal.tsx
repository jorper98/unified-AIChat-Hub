'use client';

import { SavedPrompt } from '@/types';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPrompts: SavedPrompt[];
  selectedPromptName: string;
  editingPrompt: { id: string; name: string; content: string } | null;
  isDark: boolean;
  loadPrompt: (id: string) => void;
  startEditPrompt: (prompt: SavedPrompt) => void;
  saveEditedPrompt: () => void;
  cancelEditPrompt: () => void;
  deletePrompt: (id: string) => void;
  setEditingPrompt: (prompt: { id: string; name: string; content: string } | null) => void;
}

export function PromptModal({
  isOpen,
  onClose,
  savedPrompts,
  selectedPromptName,
  editingPrompt,
  isDark,
  loadPrompt,
  startEditPrompt,
  saveEditedPrompt,
  cancelEditPrompt,
  deletePrompt,
  setEditingPrompt,
}: PromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div 
        className={`relative w-full max-w-lg mx-4 mb-16 rounded-lg border shadow-xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Load System Prompt</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>✕</button>
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
                  <button onClick={cancelEditPrompt} className={`text-[10px] px-2 py-1 rounded ${isDark ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>Cancel</button>
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
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { loadPrompt(p._id); onClose(); }}>
                    <div className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{p.name}</div>
                    <div className={`text-[10px] mt-0.5 line-clamp-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.content}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEditPrompt(p)} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deletePrompt(p._id)} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}