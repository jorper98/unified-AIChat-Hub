'use client';

import React, { useState, useEffect } from 'react';
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);

  useEffect(() => {
    if (isOpen && !latestVersion && !isCheckingVersion) {
      setIsCheckingVersion(true);
      fetch('https://api.github.com/repos/jorper98/unified-AIChat-Hub/releases/latest', {
        headers: { 'User-Agent': 'Unified-Chat-Hub-Updater' }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.tag_name) {
            setLatestVersion(data.tag_name.replace(/^v/, ''));
          }
        })
        .catch(() => {
          // Silently fail, button will just show default state
        })
        .finally(() => {
          setIsCheckingVersion(false);
        });
    }
  }, [isOpen, latestVersion, isCheckingVersion]);

  if (!isOpen) return null;

  let isUpdateAvailable = false;
  if (latestVersion) {
    const currentParts = appVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const curr = currentParts[i] || 0;
      const lat = latestParts[i] || 0;
      if (lat > curr) {
        isUpdateAvailable = true;
        break;
      } else if (lat < curr) {
        break;
      }
    }
  }

  const handleUpdate = async () => {
    if (!confirm('Are you sure you want to check for and apply updates? This will download and extract new files. You may need to restart the container afterward.')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateMessage('Checking for updates...');
    
    try {
      const response = await fetch('/api/update', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setUpdateMessage('✅ Update applied successfully! Please restart the container to apply all changes.');
      } else {
        const errorMsg = data.details ? `${data.error}\n\nDetails: ${data.details}` : (data.error || 'Unknown error');
        setUpdateMessage(`❌ Update failed: ${errorMsg}`);
      }
    } catch (error) {
      setUpdateMessage('❌ Update failed: Network error.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getButtonState = () => {
    if (isUpdating) return { text: '⏳ Updating...', disabled: true, className: 'opacity-50 cursor-not-allowed' };
    if (isCheckingVersion) return { text: '⏳ Checking...', disabled: true, className: 'opacity-50 cursor-not-allowed' };
    if (isUpdateAvailable) return { text: '🔄 Update Available', disabled: false, className: isDark ? 'border-indigo-600 text-indigo-400 hover:bg-indigo-900/30' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' };
    return { text: '✅ Latest Release', disabled: true, className: 'opacity-50 cursor-not-allowed border-gray-600 text-gray-400' };
  };

  const buttonState = getButtonState();

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
          {updateMessage && (
            <div className={`mb-3 p-2 rounded text-[10px] ${updateMessage.includes('✅') ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
              {updateMessage}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              By <a href="https://35sites.com/applications/unified-aichat-hub/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">Jorge Pereira (35sites.com LLC)</a>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={buttonState.disabled}
                className={`text-[10px] px-2 py-1 rounded border transition flex items-center gap-1 ${buttonState.className}`}
                title={buttonState.disabled ? 'You are on the latest version' : 'Check and Apply Updates'}
              >
                {buttonState.text}
              </button>
              <button
                onClick={() => { setShowSettingsModal(true); onClose(); }}
                className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-[var(--border-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]' : 'border-[var(--border-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                title="View Settings"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => { setShowReadme(true); onClose(); }}
                className={`text-[10px] px-2 py-1 rounded border transition ${isDark ? 'border-[var(--border-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]' : 'border-[var(--border-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
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