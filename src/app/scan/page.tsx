"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, AlertCircle, Flashlight, QrCode, CheckCircle2, XCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";

type ScanState = "idle" | "starting" | "scanning" | "submitting" | "success" | "error";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  // Success data
  const [roomName, setRoomName] = useState("");
  const [userName, setUserName] = useState("");

  // Auth check
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
      .select("role, username")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      router.push("/login");
      return;
    }

    setUserName(profile.username || "");
    // Pre-warm dynamic import
    import("qr-scanner").catch(() => {});
  }

  const startScanner = async () => {
    if (scanState === "starting" || scanState === "scanning") return;
    setScanState("starting");
    setCameraError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
      }

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
      setScanState("scanning");

      try {
        const fl = await scanner.hasFlash();
        setHasFlash(fl);
      } catch {
        // Flash not supported
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Scanner start error:", err);

      const isHTTP = !window.isSecureContext && window.location.hostname !== "localhost";
      const isMediaNotSupported = err.message === "MEDIA_DEVICES_NOT_SUPPORTED" || !navigator.mediaDevices;
      const isCapacitor = (window as any).Capacitor;

      let msg = "";
      if (isHTTP || isMediaNotSupported) {
        msg = "Камера требует HTTPS. Убедитесь, что приложение открыто по защищённому соединению.";
      } else if (err.name === "NotAllowedError" || err.message?.includes("permission")) {
        msg = isCapacitor
          ? "Доступ к камере отклонён. Проверьте разрешения в настройках приложения."
          : "Доступ к камере отклонён. Разрешите доступ в настройках браузера.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Камера не найдена на этом устройстве.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Камера занята другим приложением. Закройте его и попробуйте снова.";
      } else {
        msg = `Ошибка: ${err.message || "Не удалось запустить камеру"}`;
      }

      setCameraError(msg);
      setScanState("error");
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  };

  const handleResult = async (text: string) => {
    // Extract room ID and optional token from QR URL like https://...labgate.../room/UUID?token=TOKEN
    const match = text.match(/\/room\/([a-f0-9-]{36})(?:\?token=([a-f0-9-]{36}))?/);
    if (!match) {
      // Not a LabGate QR — ignore silently (scanner keeps running)
      return;
    }

    const roomId = match[1];
    const qrToken = match[2] || null;
    stopScanner();
    setScanState("submitting");

    if (navigator.vibrate) navigator.vibrate(100);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "student") {
        setSubmitError("Только студенты могут сканировать QR-коды.");
        setScanState("error");
        return;
      }

      // Get room info
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("name, is_active, qr_token")
        .eq("id", roomId)
        .single();

      if (roomError || !room) {
        setSubmitError("Комната не найдена. Попросите преподавателя создать комнату заново.");
        setScanState("error");
        return;
      }

      if (!room.is_active) {
        setSubmitError(`Комната «${room.name}» сейчас неактивна.`);
        setScanState("error");
        return;
      }

      // Validate QR token (if present — new QR format)
      if (qrToken && room.qr_token && qrToken !== room.qr_token) {
        setSubmitError("QR-код устарел. Попросите преподавателя показать актуальный QR-код.");
        setScanState("error");
        return;
      }

      // Check if student already registered in this room
      const { data: existingVisit } = await supabase
        .from("visitors")
        .select("id")
        .eq("room_id", roomId)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (existingVisit) {
        setRoomName(room.name);
        setScanState("success");
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        return;
      }

      // Register visit
      const { error: visitError } = await supabase.from("visitors").insert({
        room_id: roomId,
        profile_id: user.id,
        name: profile.username,
      });

      if (visitError) {
        console.error("Visit insert error:", visitError);
        if (visitError.code === "23505" || visitError.message?.includes("duplicate")) {
          setRoomName(room.name);
          setScanState("success");
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
          setSubmitError(visitError.message);
          setScanState("error");
        }
        return;
      }

      setRoomName(room.name);
      setScanState("success");
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    } catch (err: any) {
      console.error("Registration error:", err);
      setSubmitError(err.message || "Произошла ошибка при регистрации.");
      setScanState("error");
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

  const resetScanner = () => {
    setCameraError("");
    setSubmitError("");
    setScanState("idle");
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (scanState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black">
        <div className="liquid-blob top-[-10%] right-[-10%] w-80 h-80 opacity-20" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="glass-card p-10 text-center max-w-sm w-full relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
            className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl"
          >
            <CheckCircle2 className="w-12 h-12 text-white/80" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h1 className="text-3xl font-bold mb-2 text-white/90 tracking-tight">Готово!</h1>
            <p className="text-white/40 text-sm mb-6">Ваш визит успешно зафиксирован</p>

            <div className="py-4 px-6 bg-white/[0.03] border border-white/5 rounded-2xl mb-6">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Лаборатория</p>
              <p className="text-lg font-bold text-white/80 leading-tight">{roomName}</p>
            </div>

            <p className="text-white/40 text-xs">
              Студент: <span className="text-white/70">{userName}</span>
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/student")}
            className="mt-10 w-full glass-button py-4 text-sm font-bold text-white/90"
          >
            Понятно
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── SUBMITTING SCREEN ───────────────────────────────────────────────────────
  if (scanState === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-2 border-white/5 border-t-white/40 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-white/20 font-medium text-sm tracking-widest uppercase">Регистрация входа...</p>
      </div>
    );
  }

  // ── SUBMIT ERROR SCREEN ─────────────────────────────────────────────────────
  if (scanState === "error" && submitError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-white/90">Ошибка регистрации</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">{submitError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetScanner}
              className="w-full glass-button py-4 text-sm font-bold text-white/90"
            >
              Сканировать снова
            </button>
            <button
              onClick={() => router.push("/student")}
              className="w-full py-3 text-xs font-medium text-white/30 hover:text-white transition-colors"
            >
              В личный кабинет
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── CAMERA SCANNER SCREEN ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Darkened overlay */}
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
              animate={{ opacity: scanState === "scanning" ? [1, 0.3, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className={`w-1.5 h-1.5 rounded-full ${
                scanState === "scanning" ? "bg-green-400" :
                scanState === "error" ? "bg-red-500" :
                "bg-yellow-400"
              }`}
            />
            <p className="text-white/60 text-xs">
              {scanState === "scanning" ? "Активен" :
               scanState === "error" ? "Ошибка" :
               scanState === "starting" ? "Запуск..." : "Ожидание"}
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

      {/* Start / Camera Error Overlay */}
      <AnimatePresence>
        {(scanState === "idle" || scanState === "starting" || (scanState === "error" && cameraError)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center"
          >
            {cameraError ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-xs"
              >
                <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center mb-6 mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-white font-bold text-xl mb-3">Ошибка камеры</h2>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">{cameraError}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setCameraError(""); startScanner(); }}
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
                  disabled={scanState === "starting"}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 px-8 rounded-2xl border border-white/10 active:scale-95 transition-all disabled:opacity-50 shadow-2xl"
                >
                  {scanState === "starting" ? "Запуск..." : "Включить камеру"}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan frame */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8">
        <div className="relative w-[72vw] max-w-[290px] aspect-square">
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

      <div className="relative z-10 px-6 pb-12 pt-4">
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
