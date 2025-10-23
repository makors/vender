"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { CheckCircle2, XCircle, LogOut, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { signOut } from "./actions";

type ScanApiResponse = {
  status: "invalid" | "already_scanned" | "valid";
  ticketId?: string;
  eventId?: string;
  email?: string;
  studentName?: string | null;
  scannedAt?: string | null;
  error?: string;
};

type StatusKind = "idle" | "scanning" | "success" | "error" | "duplicate";

interface StatusState {
  kind: StatusKind;
  message: string;
  ticketId?: string;
}

const THROTTLE_MS = 1500;
const STATUS_DURATION_MS = 3000;

async function submitScan(ticketId: string): Promise<ScanApiResponse> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });
  const json = (await res.json().catch(() => ({}))) as ScanApiResponse | { error?: string };
  if (!res.ok) {
    return { status: "invalid", error: (json as any).error || "Scan failed" } as any;
  }
  return json as ScanApiResponse;
}

export function ScannerConsole() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastResultRef = useRef<{ value: string; at: number } | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<StatusState>({
    kind: "idle",
    message: "Initializing camera...",
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [_, startTransition] = useTransition();

  const playFeedback = useCallback((success: boolean) => {
    if (typeof window === "undefined") return;
    
    if (!audioContextRef.current) {
      const AudioContextImpl =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextImpl) {
        audioContextRef.current = new AudioContextImpl();
      }
    }
    
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = success ? "sine" : "sawtooth";
    oscillator.frequency.setValueAtTime(success ? 880 : 220, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleDetection = useCallback((result: any) => {
    const rawText = result.getText?.() ?? "";
    const value = rawText.trim();
    if (!value) return;

    const last = lastResultRef.current;
    const now = Date.now();
    if (last && last.value === value && now - last.at < THROTTLE_MS) {
      return;
    }

    lastResultRef.current = { value, at: now };

    // Clear any existing timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    setStatus({ kind: "scanning", message: "Verifying..." });

    void (async () => {
      try {
        const response = await submitScan(value);
        
        if (response.error) {
          setStatus({ kind: "error", message: response.error, ticketId: value });
          vibrate([100, 50, 100]);
          playFeedback(false);
        } else if (response.status === "invalid") {
          setStatus({ kind: "error", message: "Invalid Ticket", ticketId: value });
          vibrate([100, 50, 100]);
          playFeedback(false);
        } else if (response.status === "already_scanned") {
          setStatus({ kind: "duplicate", message: "Already Scanned", ticketId: response.ticketId || value });
          vibrate([60, 40, 60]);
          playFeedback(false);
        } else if (response.status === "valid") {
          setStatus({ kind: "success", message: "Valid Ticket", ticketId: response.ticketId || value });
          vibrate(50);
          playFeedback(true);
        } else {
          setStatus({ kind: "error", message: "Unexpected Response" });
          vibrate([100, 50, 100]);
          playFeedback(false);
        }

        // Auto-clear status after duration
        statusTimeoutRef.current = setTimeout(() => {
          setStatus({ kind: "idle", message: "Ready to scan" });
        }, STATUS_DURATION_MS);
      } catch (err) {
        setStatus({ kind: "error", message: "Network Error" });
        vibrate([100, 50, 100]);
        playFeedback(false);
        
        statusTimeoutRef.current = setTimeout(() => {
          setStatus({ kind: "idle", message: "Ready to scan" });
        }, STATUS_DURATION_MS);
      }
    })();
  }, [vibrate, playFeedback]);

  // Initialize camera
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check for mediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("MediaDevices API not available");
      setStatus({ kind: "error", message: "Use HTTPS or allow camera" });
      return;
    }

    let active = true;

    const init = async () => {
      try {
        // Request camera with iOS-compatible constraints
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Get the active video track
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          stream.getTracks().forEach((track) => track.stop());
          setStatus({ kind: "error", message: "No video track available" });
          return;
        }
        
        const deviceId = videoTrack.getSettings().deviceId;
        
        // Clean up the test stream
        stream.getTracks().forEach((track) => track.stop());

        setSelectedDeviceId(deviceId);
        setStatus({ kind: "idle", message: "Ready to scan" });
      } catch (error: any) {
        console.error("Camera initialization error:", error);
        
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setStatus({ kind: "error", message: "Camera permission denied" });
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setStatus({ kind: "error", message: "No camera found" });
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          setStatus({ kind: "error", message: "Camera in use" });
        } else {
          setStatus({ kind: "error", message: "Camera unavailable" });
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  // Start scanner
  useEffect(() => {
    if (!selectedDeviceId || !videoRef.current) return;

    const reader = readerRef.current ?? new BrowserMultiFormatReader();
    readerRef.current = reader;

    let cancelled = false;

    const start = async () => {
      try {
        const constraints = {
          deviceId: { exact: selectedDeviceId },
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

        await reader.decodeFromConstraints(
          { video: constraints },
          videoRef.current!,
          (result, error) => {
            if (cancelled) return;
            if (result) {
              handleDetection(result);
            }
            // Silently ignore NotFoundException (no barcode in frame)
          }
        );
      } catch (error: any) {
        console.error("Scanner error:", error);
        if (!cancelled) {
          setStatus({ kind: "error", message: "Scanner failed to start" });
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      // Reader cleanup happens automatically on unmount
    };
  }, [selectedDeviceId, handleDetection]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  const handleSignOut = () => {
    startTransition(() => {
      void signOut();
    });
  };

  // Render status overlay
  const renderStatus = () => {
    if (status.kind === "idle") return null;

    const configs = {
      success: {
        icon: <CheckCircle2 className="w-20 h-20" />,
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/50",
        text: "text-emerald-400",
      },
      error: {
        icon: <XCircle className="w-20 h-20" />,
        bg: "bg-red-500/20",
        border: "border-red-500/50",
        text: "text-red-400",
      },
      duplicate: {
        icon: <AlertCircle className="w-20 h-20" />,
        bg: "bg-yellow-500/20",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
      },
      scanning: {
        icon: <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />,
        bg: "bg-primary/10",
        border: "border-primary/30",
        text: "text-primary",
      },
    };
    
    const config = configs[status.kind] || configs.scanning;

    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm bg-black/40">
        <div className={cn(
          "flex flex-col items-center gap-6 rounded-3xl border-4 p-12 backdrop-blur-xl",
          config.bg,
          config.border
        )}>
          <div className={config.text}>
            {config.icon}
          </div>
          <div className="text-center">
            <div className={cn("text-3xl font-bold mb-2", config.text)}>
              {status.message}
            </div>
            {status.ticketId && (
              <div className="text-lg text-white/70 font-mono">
                {status.ticketId}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-lg font-semibold text-white/90">
          Vender Scanner
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleSignOut}
          className="text-white/70 hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      {/* Video */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
        
        {/* Status Overlay */}
        {renderStatus()}
        
        {/* Scan Frame Indicator */}
        {status.kind === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-white/50 rounded-2xl shadow-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-8 border-l-8 border-primary rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-8 border-r-8 border-primary rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-8 border-l-8 border-primary rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-8 border-r-8 border-primary rounded-br-2xl" />
            </div>
            <div className="absolute bottom-20 text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
              Point camera at barcode
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
