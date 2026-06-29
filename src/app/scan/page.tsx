"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, AlertCircle, Flashlight, QrCode } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);

  const [error, setError] = useState("");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    checkAuth();
    return () => stopScanner();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      router.push("/login");
      return;
    }
    
    // We don't auto-start anymore to ensure user gesture for permission
    // But we'll check if we can pre-warm the dynamic import
    import("qr-scanner").catch(() => {});
  }

  const startScanner = async () => {
    if (ready || isStarting) return;
    setIsStarting(true);
    setError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
      }

      // Dynamic import — qr-scanner uses browser APIs
      const QrScanner = (await import("qr-scanner")).default;

      if (!videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleResult(result.data),
        {
          preferredCamera: "environment",
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 30,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;

      await scanner.start();
      setReady(true);
      setIsStarting(false);

      // Check flash support
      let hasCam = false;
      try {
        hasCam = await QrScanner.hasCamera();
      } catch (e) {
        console.warn("hasCamera check failed", e);
      }

      if (hasCam) {
        try {
          const fl = await scanner.hasFlash();
          setHasFlash(fl);
        } catch {
          // Flash not supported
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Scanner start error:", err);
      setIsStarting(false);
      
      const isHTTP = !window.isSecureContext && window.location.hostname !== "localhost";
      const isMediaNotSupported = err.message === "MEDIA_DEVICES_NOT_SUPPORTED" || !navigator.mediaDevices;
      const isCapacitor = (window as any).Capacitor;

      if (isHTTP || isMediaNotSupported) {
        setError("Камера требует HTTPS или localhost. Если вы на телефоне через IP, ОБЯЗАТЕЛЬНО используйте Chrome Flags (Insecure origins treated as secure). Если вы в Android Studio — проверьте, что в capacitor.config.ts стоит androidScheme: 'https'.");
      } else if (err.name === "NotAllowedError" || err.message?.includes("permission")) {
        let msg = "Доступ к камере отклонен. ";
        if (isCapacitor) {
          msg += "Убедитесь, что вы добавили <uses-permission android:name=\"android.permission.CAMERA\" /> в AndroidManifest.xml и ПЕРЕСОБРАЛИ приложение в Android Studio.";
        } else {
          msg += "Пожалуйста, разрешите доступ в появившемся окне браузера или в настройках сайта.";
        }
        setError(msg);
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("Камера не найдена. Убедитесь, что у браузера есть доступ к оборудованию и камера не закрыта чем-то.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Камера уже используется другим приложением (например, другим браузером или приложением Камера). Закройте их и попробуйте снова.");
      } else {
        setError(`Техническая ошибка: ${err.name} - ${err.message || "Не удалось запустить камеру"}. Попробуйте перезагрузить страницу.`);
      }
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  };

  const handleResult = (text: string) => {
    const match = text.match(/\/room\/([a-f0-9-]{36})/);
    if (match) {
      stopScanner();
      // Small vibration feedback if supported
      if (navigator.vibrate) navigator.vibrate(100);
      router.push(match[0]);
    } else {
      setError("Это не QR-код LabGate");
      setTimeout(() => setError(""), 2000);
    }
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    if (flashOn) {
      await scannerRef.current.turnFlashOff();
    } else {
      await scannerRef.current.turnFlashOn();
    }
    setFlashOn(!flashOn);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Darkened overlay with transparent center */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 65vw 55vw at 50% 42%, transparent 0%, rgba(0,0,0,0.55) 100%)`
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => { stopScanner(); router.push("/student"); }}
          className="w-11 h-11 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="text-center">
          <h1 className="text-white font-bold text-lg tracking-tight">Сканер QR</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <motion.div
              animate={{ opacity: ready ? [1, 0.3, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-green-400" : (error ? "bg-red-500" : "bg-yellow-400")}`}
            />
            <p className="text-white/60 text-xs">
              {ready ? "Активен" : (error ? "Ошибка" : (isStarting ? "Запуск..." : "Ожидание"))}
            </p>
          </div>
        </div>

        {hasFlash ? (
          <button
            onClick={toggleFlash}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center backdrop-blur-md transition-all ${
              flashOn
                ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-300"
                : "bg-black/40 border-white/10 text-white"
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* Start Button Overlay */}
      <AnimatePresence>
        {!ready && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center"
          >
            {error ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-xs"
              >
                <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mb-6 mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-white font-bold text-xl mb-3">Ошибка камеры</h2>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                  {error}
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={startScanner}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
                  >
                    Попробовать снова
                  </button>
                  <button 
                    onClick={() => router.push("/student")}
                    className="w-full bg-white/5 text-white/60 font-medium py-3 rounded-xl hover:text-white transition-colors"
                  >
                    Вернуться назад
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-xs"
              >
                <div className="w-20 h-20 rounded-[2.5rem] bg-white/10 flex items-center justify-center mb-8 mx-auto relative border border-white/10">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute inset-0 bg-white/20 rounded-[2.5rem]"
                  />
                  <QrCode className="w-10 h-10 text-white/80 relative z-10" />
                </div>
                <h2 className="text-white font-bold text-2xl mb-3">Сканер готов</h2>
                <p className="text-white/60 text-sm mb-10 leading-relaxed">
                  Нажмите на кнопку ниже, чтобы разрешить доступ к камере и начать сканирование
                </p>
                <button 
                  onClick={startScanner}
                  disabled={isStarting}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4.5 px-8 rounded-2xl border border-white/10 active:scale-95 transition-all disabled:opacity-50 shadow-2xl"
                >
                  {isStarting ? "Запуск..." : "Включить камеру"}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan frame */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8">
        <div className="relative w-[72vw] max-w-[290px] aspect-square">
          {/* Corner brackets */}
          {[
            "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
            "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
            "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
            "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
          ].map((cls, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.2 }}
              className={`absolute w-9 h-9 border-white/60 ${cls}`}
            />
          ))}

          <motion.div
            animate={{ y: ["2%", "96%", "2%"] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute left-3 right-3 h-[2px] rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), white, rgba(255,255,255,0.4), transparent)",
              boxShadow: "0 0 15px 2px rgba(255,255,255,0.1)",
            }}
          />
        </div>
      </div>

      <div className="relative z-10 px-6 pb-12 pt-4 space-y-3">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-white/60" />
            <p className="text-white/80 font-medium text-sm">
              Наведите на QR-код комнаты
            </p>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
            Автоматическое сканирование
          </p>
        </div>
      </div>
    </div>
  );
}
