"use client";

import Link from "next/link";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold bg-linear-to-r from-kingshot-gold-400 to-kingshot-primary-400 bg-clip-text text-transparent">
                Petola Magic Tools
              </span>
            </Link>
            <div className="flex gap-4">
              <Link
                href="/(tools)/beartrap"
                className="text-sm text-gray-400 hover:text-kingshot-gold-400 transition-colors"
              >
                Bear Trap
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-600">
            © 2026 Petola Magic Tools. Community tool — not affiliated with the
            game. (Works in progress)
          </p>
        </div>
      </footer>
    </div>
  );
}
