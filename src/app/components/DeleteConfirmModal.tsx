'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  deleteConfirmId: string | null;
  deleteThread: (id: string) => void;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  isDark,
  deleteConfirmId,
  deleteThread,
}: DeleteConfirmModalProps) {
  if (!isOpen || !deleteConfirmId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative w-full max-w-sm mx-4 rounded-lg border shadow-xl p-5 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Delete Thread</h3>
        <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>This will permanently delete this thread and all its messages. This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className={`text-xs px-3 py-1.5 rounded ${isDark ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>Cancel</button>
          <button onClick={() => deleteThread(deleteConfirmId)} className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-500">Delete</button>
        </div>
      </div>
    </div>
  );
}