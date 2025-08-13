import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeToggle from './ThemeToggle';
import "./globals.css";

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
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "QuestBingo — Walk, Snap, Play",
    description: "Daily city bingo, photo swaps, and 10-minute IRL quests.",
    url: "/",
    siteName: "QuestBingo",
    images: [{ url: "/next.svg" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuestBingo — Walk, Snap, Play",
    description: "Daily city bingo, photo swaps, and 10-minute IRL quests.",
    images: ["/next.svg"],
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111111" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="w-full border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="font-semibold tracking-tight">QuestBingo</div>
            <div className="flex items-center gap-2">
              <div className="text-sm opacity-70 hidden sm:block">Walk • Snap • Play</div>
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
