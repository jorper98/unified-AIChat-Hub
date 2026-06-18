'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import packageJson from '../../../package.json';

const APP_VERSION = packageJson.version;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'canceled'>('idle');
  const [isDark, setIsDark] = useState(true);
  const [creditPrice, setCreditPrice] = useState(300);
  const [creditAmount, setCreditAmount] = useState(50);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) setIsDark(saved === 'dark');
    
    fetch('/api/checkout/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.creditPrice) setCreditPrice(data.creditPrice);
        if (data.creditAmount) setCreditAmount(data.creditAmount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success && sessionId) {
      setCheckoutStatus('loading');
      fetch(`/api/checkout/status?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.payment_status === 'paid') {
            setCheckoutStatus('success');
          } else {
            setCheckoutStatus('error');
          }
        })
        .catch(() => setCheckoutStatus('error'));
    } else if (canceled) {
      setCheckoutStatus('canceled');
    }
  }, [searchParams]);

  const handlePurchase = async () => {
    setIsRedirecting(true);
    try {
      const res = await fetch('/api/checkout/session', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutStatus('error');
        setIsRedirecting(false);
      }
    } catch {
      setCheckoutStatus('error');
      setIsRedirecting(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen items-center justify-center p-4 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`w-full max-w-md rounded-xl border p-8 shadow-2xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`p-3 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
            <svg className={`h-8 w-8 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Purchase Credits</h1>
            <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>v{APP_VERSION}</span>
          </div>
        </div>

        {checkoutStatus === 'success' ? (
          <div className="text-center">
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
              <svg className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Payment Successful!</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {creditAmount} messages have been added to your account.
            </p>
            </div>
            <Link href="/" className={`block w-full py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition text-center`}>
              Back to Chat
            </Link>
          </div>
        ) : checkoutStatus === 'error' ? (
          <div className="text-center">
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <svg className="h-12 w-12 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Payment Error</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Something went wrong. Please try again.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className={`flex-1 py-3 rounded-lg text-sm font-medium border transition text-center ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Back to Chat
              </Link>
              <button onClick={() => { setCheckoutStatus('idle'); window.history.replaceState({}, '', '/checkout'); }} className="flex-1 py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">
                Try Again
              </button>
            </div>
          </div>
        ) : checkoutStatus === 'canceled' ? (
          <div className="text-center">
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
              <h2 className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Checkout Canceled</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Your payment was not processed.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className={`flex-1 py-3 rounded-lg text-sm font-medium border transition text-center ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Back to Chat
              </Link>
              <button onClick={() => { setCheckoutStatus('idle'); window.history.replaceState({}, '', '/checkout'); }} className="flex-1 py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition">
                Try Again
              </button>
            </div>
          </div>
        ) : checkoutStatus === 'loading' ? (
          <div className="text-center">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4`}></div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Verifying your payment...</p>
          </div>
        ) : (
          <div>
            <div className={`rounded-lg border p-4 mb-6 ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{creditAmount} Messages</span>
                <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${(creditPrice / 100).toFixed(2)}</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Credits are deducted per message when you don't have your own API key. Admin users and users with their own API key have unlimited messages.
              </p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={isRedirecting}
              className="w-full py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedirecting ? 'Redirecting to Stripe...' : 'Buy Credits with Stripe'}
            </button>
            <p className={`text-[10px] text-center mt-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Secure payment processed by Stripe. No credit card data stored on our servers.
            </p>
            <div className="mt-4 text-center">
              <Link href="/" className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition`}>
                Cancel and go back
              </Link>
            </div>
          </div>
        )}
      </div>
      <footer className={`mt-6 text-center text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        By <a href="https://35sites.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition">Jorge Pereira (35sites.com LLC)</a>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-900"><p className="text-gray-400">Loading...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
