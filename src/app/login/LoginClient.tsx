'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import packageJson from '../../../package.json';

const APP_VERSION = packageJson.version;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'missing_token') setError('Verification token is missing.');
    else if (err === 'invalid_token') setError('Invalid or expired verification token.');
    else if (err === 'server_error') setError('An error occurred during verification.');

    const success = searchParams.get('success');
    if (success === 'verified') setError('');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        const from = searchParams.get('from') || '/';
        router.push(from);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 shadow-xl">
      <h1 className="mb-2 text-center text-2xl font-bold text-white">Unified Chat Hub</h1>
      <p className="mb-6 text-center text-gray-400 text-sm">v{APP_VERSION}</p>

      {error && (
        <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Remember me for 24 hours</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <a href="/register" className="text-blue-400 hover:underline">
          Register
        </a>
      </p>

      <p className="mt-4 text-center text-xs text-gray-500">
        <a href="https://go.35s.be/AIChatHub" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          Learn more about this application
        </a>
      </p>

      <footer className="mt-8 border-t border-gray-700 pt-4 text-center text-xs text-gray-500">
        By{' '}
        <a href="https://35sites.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          Jorge Pereira (35sites.com LLC)
        </a>
        .
      </footer>
    </div>
  );
}
