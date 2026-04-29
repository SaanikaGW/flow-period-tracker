import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flow — Period Tracker & Tutor",
  description: "Track symptoms and learn about your cycle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`${geist.className} min-h-screen`} style={{ background: "var(--background)" }}>
        <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-rose-100 px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">f</div>
            <span className="text-rose-600 font-semibold text-base tracking-tight">flow</span>
          </div>
          <div className="flex gap-1">
            <Link
              href="/"
              className="text-sm px-3 py-1.5 rounded-full text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              Tracker
            </Link>
            <Link
              href="/chat"
              className="text-sm px-3 py-1.5 rounded-full text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              Ask the Tutor
            </Link>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
