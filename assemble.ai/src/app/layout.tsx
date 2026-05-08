import type { Metadata } from "next";
import { DM_Sans, Spectral, Exo_2, Inter_Tight, Inter, JetBrains_Mono } from "next/font/google";
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

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo-2",
  display: "swap",
  weight: ["700", "800"],
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SiteWise",
  description: "Architectural Precision in Procurement - AI-powered tender management platform",
};

// Theme initialization script - runs before React hydration to prevent flash.
// Sitewise / Field Console (Devtools Rose) is the active brand.
// Legacy Architectural Precision themes (precision, precision-light) remain switchable.
const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('theme');
      const validThemes = ['sitewise', 'precision', 'precision-light'];

      if (stored && validThemes.includes(stored)) {
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        document.documentElement.setAttribute('data-theme', 'sitewise');
      }

      // Prevent transition flash on load
      document.documentElement.classList.add('no-transitions');
      window.addEventListener('DOMContentLoaded', function() {
        requestAnimationFrame(function() {
          document.documentElement.classList.remove('no-transitions');
        });
      });
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'sitewise');
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
        className={`${dmSans.variable} ${spectral.variable} ${exo2.variable} ${interTight.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
