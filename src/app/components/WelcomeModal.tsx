'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function WelcomeModal({ isOpen, onClose, isDark }: WelcomeModalProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/users/welcome-seen', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark welcome modal as seen:', error);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const handleAddKey = () => {
    handleDismiss();
    router.push('/settings?tab=utility-llms');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleDismiss}>
      <div 
        className={`w-full max-w-lg rounded-xl border p-6 shadow-2xl ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
            <svg className={`h-6 w-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome to Unified Chat Hub!</h3>
        </div>
        
        <div className={`mb-6 space-y-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <p>
            To help you get started, we've gifted you <strong className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>15 free credits</strong> (messages) to interact with our AI tools using our master API key.
          </p>
          <p>
            Once you've used your free credits, you have two options to continue:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Add your own OpenRouter API Key:</strong> Bring your own key for unlimited, pay-as-you-go access.</li>
            <li><strong>Purchase Credits:</strong> Buy additional message credits for $3.00 per 50 messages.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={handleDismiss}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-50`}
          >
            {isSaving ? 'Saving...' : 'Maybe Later'}
          </button>
          <button
            onClick={() => { handleDismiss(); router.push('/checkout'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Purchase Credits
          </button>
          <button
            onClick={handleAddKey}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Add API Key
          </button>
        </div>
      </div>
    </div>
  );
}
