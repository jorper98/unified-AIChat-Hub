'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        if (res.redirected) {
          const url = new URL(res.url);
          if (url.searchParams.get('error')) {
            setStatus('error');
            setMessage('Verification failed. The token may be invalid or expired.');
          } else if (url.searchParams.get('success') === 'verified') {
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
          }
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred during verification.');
      }
    };

    verify();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 text-center shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Email Verification</h1>
        
        {status === 'verifying' && (
          <div className="text-blue-400">
            <p className="mb-4">{message}</p>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <svg className="mx-auto mb-4 h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-400">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <svg className="mx-auto mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-red-400">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        )}

        <footer className="mt-8 border-t border-gray-700 pt-4 text-xs text-gray-500">
          By Jorge Pereira (35sites.com LLC).{' '}
          <a href="https://35sites.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            https://35sites.com/
          </a>
        </footer>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-white">Email Verification</h1>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
