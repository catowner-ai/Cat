import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuestBingo — Walk, Snap, Play",
  description: "Daily city bingo, photo swaps, and 10-minute IRL quests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="w-full border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <div className="font-semibold tracking-tight">QuestBingo</div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="opacity-80 hover:opacity-100">Home</Link>
              <Link href="/shop" className="opacity-80 hover:opacity-100">Shop</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
