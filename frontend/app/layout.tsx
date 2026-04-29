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
    <html lang="en">
      <body className={`${geist.className} bg-rose-50 min-h-screen`}>
        <nav className="bg-white border-b border-rose-100 px-6 py-4 flex items-center gap-8">
          <span className="text-rose-500 font-semibold text-lg tracking-tight">flow</span>
          <Link href="/" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Tracker</Link>
          <Link href="/chat" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Ask the Tutor</Link>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
