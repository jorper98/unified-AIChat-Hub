'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThreadSummary } from '@/types';
import { formatDate } from '@/lib/utils';

interface ThreadSidebarProps {
  threadsList: ThreadSummary[];
  searchQuery: string;
  threadId: string | null;
  renamingThread: string | null;
  renameValue: string;
  isDark: boolean;
  hasMoreThreads: boolean;
  threadsLimit: number;
  setSearchQuery: (q: string) => void;
  setRenamingThread: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  setThreadsLimit: (l: number) => void;
  setThreadsSkip: (s: number) => void;
  loadThread: (id: string) => void;
  startRename: (t: ThreadSummary) => void;
  saveRename: (id: string) => void;
  cancelRename: () => void;
  archiveThread: (id: string) => void;
  setDeleteConfirmId: (id: string | null) => void;
  loadMoreThreads: () => void;
  refreshThreads: (search: string, skip: number, isLoadMore: boolean) => void;
  setShowArchives: (show: boolean) => void;
  loadArchivedThreads: () => void;
  startNewChat: () => void;
  APP_VERSION: string;
  toggleTheme: () => void;
  setShowAbout: (show: boolean) => void;
  setShowGlobalCost: (show: boolean) => void;
  setShowImageGallery: (show: boolean) => void;
  user: any;
  handleLogout: () => void;
}

export function ThreadSidebar({
  threadsList,
  searchQuery,
  threadId,
  renamingThread,
  renameValue,
  isDark,
  hasMoreThreads,
  threadsLimit,
  setSearchQuery,
  setRenamingThread,
  setRenameValue,
  setThreadsLimit,
  setThreadsSkip,
  loadThread,
  startRename,
  saveRename,
  cancelRename,
  archiveThread,
  setDeleteConfirmId,
  loadMoreThreads,
  refreshThreads,
  setShowArchives,
  loadArchivedThreads,
  startNewChat,
  APP_VERSION,
  toggleTheme,
  setShowAbout,
  setShowGlobalCost,
  setShowImageGallery,
  user,
  handleLogout,
}: ThreadSidebarProps) {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    fetch('https://api.github.com/repos/jorper98/unified-AIChat-Hub/releases/latest', {
      headers: { 'User-Agent': 'Unified-Chat-Hub-Updater' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.tag_name) {
          const latestVersion = data.tag_name.replace(/^v/, '');
          const currentParts = APP_VERSION.split('.').map(Number);
          const latestParts = latestVersion.split('.').map(Number);
          let isAvailable = false;
          for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
            const curr = currentParts[i] || 0;
            const lat = latestParts[i] || 0;
            if (lat > curr) {
              isAvailable = true;
              break;
            } else if (lat < curr) {
              break;
            }
          }
          setIsUpdateAvailable(isAvailable);
        }
      })
      .catch(() => {});
  }, [APP_VERSION]);

  return (
    <section className={`w-80 p-4 flex flex-col gap-4 border-r h-full pb-8 ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-md font-bold text-indigo-400">Unified Chat Hub</h1>
          <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>v{APP_VERSION}</span>
        </div>
        <div className="flex justify-end items-center gap-1">
          <button onClick={() => setShowAbout(true)} className={`relative p-1.5 rounded transition ${isUpdateAvailable ? 'text-red-500 hover:text-red-400 hover:bg-red-900/20' : (isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200')}`} title={isUpdateAvailable ? 'Update Available' : 'About'}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isUpdateAvailable && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </button>
          <button onClick={toggleTheme} className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => setShowGlobalCost(true)} 
            className={`p-1.5 rounded transition text-sm font-bold ${isDark ? 'text-gray-500 hover:text-yellow-400 hover:bg-gray-800' : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-200'}`} 
            title="Global Cost Breakdown"
          >
            $
          </button>
          <button 
            onClick={() => setShowImageGallery(true)} 
            className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200'}`} 
            title="Image Gallery"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <Link href="/settings" className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`} title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          {user?.role === 'admin' && (
            <button onClick={() => window.open('/logs', 'serverLogs', 'width=1200,height=800,scrollbars=yes,resizable=yes')} className={`p-1.5 rounded transition ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`} title="Server Logs (new window)">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <button 
        onClick={startNewChat}
        className={`w-full text-xs font-semibold py-2 rounded border transition ${isDark ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'}`}
      >
        + Start New Thread
      </button>

      {user && (
        <div className={`border rounded-lg p-2 flex items-center justify-between gap-2 ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{user.name}</span>
                {user.role !== 'admin' && !user.hasApiKey && (
                  (user.freeUses || 0) < 15 ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      (15 - (user.freeUses || 0)) > 5 
                        ? (isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                        : (isDark ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {15 - (user.freeUses || 0)}
                    </span>
                  ) : (
                    <span 
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer ${
                        (user.messageBalance || 0) < 3 
                          ? (isDark ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70' : 'bg-red-100 text-red-700 hover:bg-red-200')
                          : (isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                      }`}
                      onClick={() => { if ((user.messageBalance || 0) < 3) window.location.href = '/checkout'; }}
                      title={(user.messageBalance || 0) < 3 ? 'Low credits - click to purchase more' : 'Purchased message credits'}
                    >
                      {user.messageBalance || 0}
                    </span>
                  )
                )}
              </div>
              <span className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`p-1.5 rounded border transition shrink-0 ${isDark ? 'text-red-400 border-red-800/50 hover:bg-red-900/30' : 'text-red-600 border-red-200 hover:bg-red-100'}`}
            title="Log Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
      
      <hr className={isDark ? 'border-gray-800' : 'border-gray-200'} />

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search History logs</label>
          <button
            onClick={() => { setShowArchives(true); loadArchivedThreads(); }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition ${isDark ? 'text-gray-500 hover:text-indigo-400' : 'text-gray-400 hover:text-indigo-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg> Archives
          </button>
        </div>
        <input 
          type="text"
          placeholder="Search keywords inside chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-gray-900 border-gray-800 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {threadsList.map((t) => (
          <div
            key={t._id}
            className={`w-full p-2 rounded text-xs transition border flex flex-col gap-0.5 group ${
              threadId === t._id 
                ? (isDark ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-700') 
                : (isDark ? 'bg-gray-900/30 border-transparent hover:bg-gray-900/60 text-gray-400 hover:text-gray-200' : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900')
            }`}
          >
            {renamingThread === t._id ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(t._id);
                    if (e.key === 'Escape') cancelRename();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full border rounded px-1.5 py-0.5 text-xs focus:outline-none ${isDark ? 'bg-gray-800 border-indigo-500 text-white' : 'bg-white border-indigo-400 text-gray-900'}`}
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => saveRename(t._id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => cancelRename()}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-1">
                  <span className="font-medium truncate flex-1 cursor-pointer" onClick={() => loadThread(t._id)}>
                    {t.name}
                  </span>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => startRename(t)}
                      className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Rename thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => archiveThread(t._id)}
                      className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Archive thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(t._id)}
                      className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                      title="Delete thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                 <span className={`text-[9px] font-mono block truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ID: {t._id}
                </span>
                {t.updatedAt && (
                   <span className={`text-[9px] block truncate ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {formatDate(t.updatedAt)}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        
        <div className="pt-2 flex flex-col gap-2 border-t border-gray-800/50">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Show per page:</span>
            <select 
              value={threadsLimit} 
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                setThreadsLimit(newLimit);
                setThreadsSkip(0);
                refreshThreads(searchQuery, 0, false);
              }}
              className={`text-[10px] border rounded px-1 py-0.5 focus:outline-none ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          {hasMoreThreads && (
            <button
              onClick={loadMoreThreads}
              className={`w-full text-xs font-semibold py-1.5 rounded border transition ${isDark ? 'bg-[var(--surface)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]' : 'bg-[var(--surface-alt)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-alt)]'}`}
            >
              Load More Threads
            </button>
          )}
        </div>
      </div>
    </section>
  );
}