'use client';
import Link from 'next/link';

export default function Offline() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">You’re offline</h1>
      <p className="opacity-70 text-sm">Some features may be unavailable. Reconnect to continue.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="px-4 py-2 rounded-full border text-sm">Home</Link>
        <button className="px-4 py-2 rounded-full border text-sm" onClick={() => window.location.reload()}>Try again</button>
      </div>
    </div>
  );
}