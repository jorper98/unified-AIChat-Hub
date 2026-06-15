'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // 1. Call the logout API to clear the HTTP-only auth cookie
        await fetch('/api/auth/logout', { method: 'POST' });
        
        // 2. Clear client-side session data
        localStorage.removeItem('activeThreadId');
        
        // 3. Redirect to login page
        router.replace('/login');
      } catch (error) {
        console.error('Logout failed:', error);
        // Fallback redirect even if API fails
        router.replace('/login');
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 text-center shadow-xl">
        <h1 className="mb-4 text-2xl font-bold text-white">Logging Out</h1>
        <p className="mb-6 text-gray-400">Clearing your session and local data...</p>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    </div>
  );
}
