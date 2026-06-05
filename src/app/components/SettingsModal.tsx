'use client';

import { ThreadSummary } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingsData: any;
  isDark: boolean;
  threadsList: ThreadSummary[];
  archivedThreads: ThreadSummary[];
}

export function SettingsModal({
  isOpen,
  onClose,
  settingsData,
  isDark,
  threadsList,
  archivedThreads,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative w-full max-w-2xl mx-4 rounded-lg border shadow-xl max-h-[85vh] flex flex-col ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Current Settings</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>✕</button>
        </div>
        <div className={`p-4 overflow-y-auto flex-1 text-xs space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {settingsData ? (
            <>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Models</h4>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-mono">
                  {settingsData.models?.map((m: any, i: number) => (
                    <li key={i}>{m.name} ({m.provider})</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Providers</h4>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-mono">
                  {settingsData.providers?.map((p: any, i: number) => (
                    <li key={i}>{p.name} ({p.id})</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Utility LLMs</h4>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-mono">
                  <li>Router: {settingsData.routerModel}</li>
                  <li>Image Generation: {settingsData.imageGenerationModel}</li>
                </ul>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Global System Prompt</h4>
                <p className={`text-[10px] p-2 rounded ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  {settingsData.globalSystemPrompt || 'None'}
                </p>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Theme</h4>
                <p className="text-[10px] font-mono">{settingsData.theme || 'dark'}</p>
                {settingsData.themeColors && (
                  <p className="text-[10px] font-mono mt-1">Custom Colors: {JSON.stringify(settingsData.themeColors)}</p>
                )}
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Statistics</h4>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-mono">
                  <li>Total Chats: {threadsList.length}</li>
                  <li>Total Archives: {archivedThreads.length}</li>
                </ul>
              </div>
            </>
          ) : (
            <p className="text-center py-4">Loading settings...</p>
          )}
        </div>
      </div>
    </div>
  );
}