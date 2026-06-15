import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-white">Email Verification</h1>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        }
      >
        <VerifyEmailClient />
      </Suspense>
    </div>
  );
}
