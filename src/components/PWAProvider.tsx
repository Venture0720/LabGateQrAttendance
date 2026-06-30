"use client";

import { useEffect, useState, useCallback } from "react";

export default function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    const { outcome } = await new Promise<{ outcome: string }>(
      (resolve) => {
        (deferredPrompt as unknown as {
          userChoice: Promise<{ outcome: string }>;
        }).userChoice.then(resolve);
      }
    );
    setDeferredPrompt(null);
    setIsInstalled(outcome === "accepted");
  }, [deferredPrompt]);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed:", err));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [handleBeforeInstallPrompt]);

  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg glow"
    >
      Установить LabGate
    </button>
  );
}
