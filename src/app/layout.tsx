import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/components/PWAProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "LabGate — Laboratory Access Control",
  description: "Modern QR-based laboratory access control system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LabGate",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#030712] text-white selection:bg-white/20">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#030712]">
          <div className="liquid-blob w-[500px] h-[500px] -top-48 -left-24 opacity-[0.07]" />
          <div className="liquid-blob w-[400px] h-[400px] top-1/2 -right-24 opacity-[0.04]" style={{ animationDelay: '-5s' }} />
          <div className="liquid-blob w-[300px] h-[300px] -bottom-24 left-1/4 opacity-[0.05]" style={{ animationDelay: '-10s' }} />
        </div>
        {children}
        <PWAProvider />
      </body>
    </html>
  );
}
