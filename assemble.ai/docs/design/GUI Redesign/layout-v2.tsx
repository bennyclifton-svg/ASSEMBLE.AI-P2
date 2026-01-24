import type { Metadata } from "next";
import { DM_Sans, Spectral } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-spectral",
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "ASSEMBLE.AI - Procurement Intelligence",
  description: "AI-powered procurement and tender management platform",
};

// Theme initialization script - runs before React hydration to prevent flash
// Supports four themes: light, dark, precision, precision-light
const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('theme');
      const validThemes = ['light', 'dark', 'precision', 'precision-light'];
      
      // Check stored theme first
      if (stored && validThemes.includes(stored)) {
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        // Fall back to system preference for light/dark
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = systemDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
      }
      
      // Prevent transition flash on load
      document.documentElement.classList.add('no-transitions');
      window.addEventListener('DOMContentLoaded', function() {
        requestAnimationFrame(function() {
          document.documentElement.classList.remove('no-transitions');
        });
      });
    } catch (e) {
      // Fallback to light theme if localStorage fails
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${dmSans.variable} ${spectral.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
