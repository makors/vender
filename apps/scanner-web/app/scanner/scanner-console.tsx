"use client";

import {
  BrowserMultiFormatReader,
  NotFoundException,
  Result,
} from "@zxing/browser";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Copy,
  History,
  LogOut,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Scan,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { signOut } from "./actions";

type ScanSource = "camera" | "manual";

type StatusKind = "idle" | "scanning" | "success" | "warning" | "error";

interface ScanRecord {
  id: string;
  value: string;
  timestamp: number;
  source: ScanSource;
  duplicate: boolean;
}

interface StatusState {
  kind: StatusKind;
  message: string;
}

const MAX_HISTORY = 15;
const THROTTLE_MS = 1500;

export function ScannerConsole() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastResultRef = useRef<{ value: string; at: number } | null>(null);

  const [status, setStatus] = useState<StatusState>({
    kind: "idle",
    message: "Preparing camera…",
  });
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [_, startTransition] = useTransition();

  const hasCameraOptions = videoDevices.length > 1;
  const totalScans = scans.length;
  const recentScan = scans[0];

  const statusBadge = useMemo(() => {
    switch (status.kind) {
      case "success":
        return <Badge variant="success">{status.message}</Badge>;
      case "warning":
        return <Badge variant="warning">{status.message}</Badge>;
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <CircleAlert className="h-3.5 w-3.5" /> {status.message}
          </Badge>
        );
      case "scanning":
        return (
          <Badge variant="outline" className="gap-1 text-primary">
            <Scan className="h-3.5 w-3.5" /> {status.message}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status.message}</Badge>;
    }
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      setCameraError("Camera access is not supported in this browser.");
      setStatus({ kind: "error", message: "Camera unsupported" });
      return;
    }

    let active = true;

    const prepare = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((track) => track.stop());
        if (!active) {
          return;
        }
        setCameraError(null);
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(videoInputs);

        if (videoInputs.length === 0) {
          setCameraError("No camera detected. Connect a camera to start scanning.");
          setStatus({ kind: "error", message: "No camera found" });
          setIsScanning(false);
          return;
        }

        const preferred = videoInputs.find((device) =>
          device.label.toLowerCase().includes("back")
        );
        const nextDeviceId = preferred?.deviceId ?? videoInputs[0]?.deviceId;
        setSelectedDeviceId((current) => current ?? nextDeviceId);
        setStatus({ kind: "scanning", message: "Point at a barcode" });
        setIsScanning(true);
      } catch (error) {
        console.error("Camera error", error);
        setCameraError(
          "We couldn't access the camera. Allow permissions or plug in a camera."
        );
        setStatus({ kind: "error", message: "Camera permission denied" });
      }
    };

    prepare();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isScanning || !selectedDeviceId || !videoRef.current) {
      return;
    }

    const reader = readerRef.current ?? new BrowserMultiFormatReader();
    readerRef.current = reader;

    let isCancelled = false;

    const start = async () => {
      try {
        setStatus({ kind: "scanning", message: "Point at a barcode" });
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, error) => {
            if (isCancelled) {
              return;
            }
            if (result) {
              handleDetection(result, "camera");
            }
            if (error && !(error instanceof NotFoundException)) {
              console.error("Decode error", error);
              setStatus({
                kind: "error",
                message: "Trouble reading the barcode",
              });
            }
          }
        );
      } catch (error) {
        console.error("Reader start error", error);
        setStatus({ kind: "error", message: "Unable to start scanner" });
      }
    };

    start();

    return () => {
      isCancelled = true;
      reader.reset();
    };
  }, [isScanning, selectedDeviceId]);

  useEffect(() => {
    return () => {
      readerRef.current?.reset();
      readerRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  const ensureAudioContext = () => {
    if (typeof window === "undefined") {
      return null;
    }
    if (!audioContextRef.current) {
      const AudioContextImpl =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextImpl) {
        return null;
      }
      audioContextRef.current = new AudioContextImpl();
    }
    return audioContextRef.current;
  };

  const playFeedback = (success: boolean) => {
    const ctx = ensureAudioContext();
    if (!ctx) {
      return;
    }
    ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = success ? "triangle" : "sawtooth";
    oscillator.frequency.setValueAtTime(success ? 880 : 220, now);
    gain.gain.setValueAtTime(success ? 0.15 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof window === "undefined") {
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  };

  const handleDetection = (result: Result, source: ScanSource, options?: { bypassThrottle?: boolean }) => {
    const rawText = result.getText?.() ?? "";
    const value = rawText.trim();
    if (!value) {
      return;
    }

    const last = lastResultRef.current;
    const now = Date.now();
    if (!options?.bypassThrottle && last && last.value === value && now - last.at < THROTTLE_MS) {
      return;
    }

    lastResultRef.current = { value, at: now };

    let isDuplicate = false;
    setScans((previous) => {
      isDuplicate = previous.some((entry) => entry.value === value);
      const record: ScanRecord = {
        id: createId(),
        value,
        timestamp: now,
        source,
        duplicate: isDuplicate,
      };
      const next = [record, ...previous];
      return next.slice(0, MAX_HISTORY);
    });

    if (isDuplicate) {
      setStatus({ kind: "warning", message: `Duplicate scan • ${value}` });
      vibrate([60, 60, 60]);
      playFeedback(false);
    } else {
      setStatus({ kind: "success", message: `Captured ${value}` });
      vibrate(50);
      playFeedback(true);
    }
  };

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualCode.trim()) {
      return;
    }
    const fakeResult = {
      getText: () => manualCode,
    } as Result;
    handleDetection(fakeResult, "manual", { bypassThrottle: true });
    setManualCode("");
  };

  const clearHistory = () => {
    setScans([]);
    setStatus({ kind: "scanning", message: "History cleared" });
    lastResultRef.current = null;
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  const copyToClipboard = (value: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => undefined);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pb-10">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg shadow-primary/5 backdrop-blur-xl sm:flex-row sm:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-primary/80">
            Vender ticket scanner
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
            Mobile verification console
          </h1>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {statusBadge}
          <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Live scanner</CardTitle>
              <CardDescription>
                Align the ticket barcode inside the frame. We'll chime and vibrate when it reads successfully.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() =>
                  setIsScanning((prev) => {
                    const next = !prev;
                    if (next && !cameraError) {
                      setStatus({ kind: "scanning", message: "Point at a barcode" });
                    }
                    if (!next) {
                      setStatus((current) =>
                        current.kind === "error"
                          ? current
                          : { kind: "idle", message: "Scanner paused" }
                      );
                    }
                    return next;
                  })
                }
                disabled={!!cameraError}
              >
                {isScanning ? (
                  <>
                    <PauseCircle className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Resume
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" className="gap-2" onClick={clearHistory}>
                <RefreshCw className="h-4 w-4" /> Reset history
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-inner">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-5">
                  <div className="w-full max-w-xs rounded-full border border-white/20 bg-black/20 px-3 py-1 text-center text-xs uppercase tracking-[0.4em] text-white/60">
                    {isScanning ? "Scanning" : "Paused"}
                  </div>
                  <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-primary/30 bg-black/10 p-4 text-center text-sm text-white/80">
                    <Camera className="mx-auto h-6 w-6 text-primary" />
                    <p>Hold steady • Auto-focus will snap when the code is clear.</p>
                  </div>
                </div>
                <video
                  ref={videoRef}
                  className={cn(
                    "h-[480px] w-full object-cover transition-opacity duration-300",
                    isScanning ? "opacity-100" : "opacity-60"
                  )}
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              {cameraError ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                  {cameraError}
                </p>
              ) : null}
              {hasCameraOptions ? (
                <div className="space-y-2">
                  <Label htmlFor="camera">Camera</Label>
                  <select
                    id="camera"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={selectedDeviceId}
                    onChange={(event) => setSelectedDeviceId(event.target.value)}
                  >
                    {videoDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId} className="bg-slate-900 text-slate-100">
                        {device.label || `Camera ${device.deviceId.slice(-4)}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Recent scans
              </CardTitle>
              <CardDescription>
                We keep the last {MAX_HISTORY} scans handy so you can double-check entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total captured</p>
                  <p className="text-2xl font-semibold">{totalScans}</p>
                </div>
                {recentScan ? (
                  <div className="text-right text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-wide">Last</p>
                    <p className="text-base text-foreground">{recentScan.value}</p>
                  </div>
                ) : null}
              </div>
              <Separator className="h-px w-full" />
              <div className="space-y-3">
                {scans.length === 0 ? (
                  <p className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
                    No scans yet. Aim the camera or enter a ticket manually.
                  </p>
                ) : (
                  scans.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{entry.value}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {entry.source === "camera" ? "Camera" : "Manual"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.duplicate ? "warning" : "success"}>
                          {entry.duplicate ? "Duplicate" : "Fresh"}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(entry.value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5 text-primary" /> Manual entry
              </CardTitle>
              <CardDescription>
                If a barcode is damaged, key it in and we'll track it with the same duplicate protection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual">Ticket ID or code</Label>
                  <Input
                    id="manual"
                    name="manual"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    placeholder="e.g. TCK-2024-0427"
                    className="bg-black/20"
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Add scan
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
