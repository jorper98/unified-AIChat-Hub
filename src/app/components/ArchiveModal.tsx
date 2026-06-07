'use client';

import { ThreadSummary } from '@/types';
import { formatDate } from '@/lib/utils';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedThreads: ThreadSummary[];
  isDark: boolean;
  hasMoreArchivedThreads: boolean;
  loadThread: (id: string) => void;
  unarchiveThread: (id: string) => void;
  setDeleteConfirmId: (id: string | null) => void;
  loadMoreArchivedThreads: () => void;
}

export function ArchiveModal({
  isOpen,
  onClose,
  archivedThreads,
  isDark,
  hasMoreArchivedThreads,
  loadThread,
  unarchiveThread,
  setDeleteConfirmId,
  loadMoreArchivedThreads,
}: ArchiveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className={`relative w-full max-w-lg mx-4 mb-16 rounded-lg border shadow-xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Archived Threads</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>✕</button>
        </div>
        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {archivedThreads.length === 0 ? (
            <p className={`text-xs text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No archived threads</p>
          ) : (
            archivedThreads.map(t => (
              <div key={t._id} className={`p-2.5 rounded-lg border flex justify-between items-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { loadThread(t._id); onClose(); }}>
                  <div className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.name}</div>
                  <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.updatedAt ? formatDate(t.updatedAt) : ''}</div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button onClick={() => unarchiveThread(t._id)} className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${isDark ? 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`} title="Unarchive">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg> Unarchive
                  </button>
                  <button onClick={() => { setDeleteConfirmId(t._id); onClose(); }} className={`text-[10px] px-1.5 py-1 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`} title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
          
          {archivedThreads.length > 0 && (
            <div className="pt-2 mt-2 flex flex-col gap-2 border-t border-gray-800/50">
              {hasMoreArchivedThreads && (
                <button
                  onClick={loadMoreArchivedThreads}
                  className={`w-full text-xs font-semibold py-1.5 rounded border transition ${isDark ? 'bg-[var(--surface)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]' : 'bg-[var(--surface-alt)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-alt)]'}`}
                >
                  Load More Archived Threads
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}