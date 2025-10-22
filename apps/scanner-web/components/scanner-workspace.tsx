"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
  NotFoundException
} from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  History,
  RefreshCw,
  Scan,
  Smartphone,
  Vibrate
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ScanRecord {
  id: string;
  text: string;
  format: string;
  source: "camera" | "manual";
  timestamp: number;
  processed: boolean;
}

const MAX_HISTORY = 50;

const formatLabels: Partial<Record<BarcodeFormat, string>> = {
  [BarcodeFormat.QR_CODE]: "QR code",
  [BarcodeFormat.CODE_128]: "Code 128",
  [BarcodeFormat.DATA_MATRIX]: "Data Matrix",
  [BarcodeFormat.AZTEC]: "Aztec",
  [BarcodeFormat.PDF_417]: "PDF417",
  [BarcodeFormat.CODE_39]: "Code 39",
  [BarcodeFormat.EAN_13]: "EAN-13",
  [BarcodeFormat.EAN_8]: "EAN-8"
};

function humanizeFormat(format: BarcodeFormat) {
  if (formatLabels[format]) {
    return formatLabels[format] as string;
  }
  const raw = BarcodeFormat[format];
  if (!raw) {
    return "Unknown";
  }
  return raw
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function ScannerWorkspace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [cameraLoading, setCameraLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [autoCopy, setAutoCopy] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const refreshCameras = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setScanError("Camera access requires a secure browser environment.");
      setCameraLoading(false);
      return;
    }

    setCameraLoading(true);
    setScanError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        }
      });

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      stream.getTracks().forEach((track) => track.stop());

      setCameras(devices);

      if (devices.length === 0) {
        setScanError("No cameras detected. Connect a camera or enable permissions.");
      }

      setCameraId((current) => {
        if (current && devices.some((device) => device.deviceId === current)) {
          return current;
        }
        const preferred = devices.find((device) => device.label.toLowerCase().includes("back"));
        return preferred?.deviceId ?? devices[0]?.deviceId ?? "";
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Camera access was blocked. Allow camera permissions to scan tickets.";
      setScanError(message);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCameras();
  }, [refreshCameras]);

  const handleNewScan = useCallback(
    async (text: string, format: string, source: "camera" | "manual") => {
      const cleaned = text.trim();
      if (!cleaned) {
        return;
      }

      let record: ScanRecord | null = null;
      setScans((previous) => {
        const timestamp = Date.now();
        const existing = previous.find((scan) => scan.text === cleaned);
        if (existing) {
          record = { ...existing, timestamp, processed: false };
          const filtered = previous.filter((scan) => scan.text !== cleaned);
          return [record, ...filtered].slice(0, MAX_HISTORY);
        }

        record = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${timestamp}`,
          text: cleaned,
          format,
          source,
          timestamp,
          processed: false
        };

        return [record, ...previous].slice(0, MAX_HISTORY);
      });

      if (!record) {
        return;
      }

      setLastScan(record);
      setScanError(null);

      if (haptics && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(120);
      }

      if (autoCopy && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(record.text);
          setCopiedId(record.id);
          if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
          }
          copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
          console.warn("Unable to copy to clipboard", error);
        }
      }
    },
    [autoCopy, haptics]
  );

  useEffect(() => {
    if (!cameraId || !videoRef.current) {
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(cameraId, videoRef.current, (result, error, controls) => {
        if (cancelled) {
          controls?.stop();
          return;
        }

        if (controls) {
          controlsRef.current = controls;
        }

        if (result) {
          const format = humanizeFormat(result.getBarcodeFormat());
          void handleNewScan(result.getText(), format, "camera");
        }

        if (error && !(error instanceof NotFoundException)) {
          console.error(error);
          setScanError(error.message ?? "Unable to read from the camera feed.");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to connect to the selected camera.";
          setScanError(message);
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      reader.reset();
    };
  }, [cameraId, handleNewScan]);

  const totalProcessed = useMemo(() => scans.filter((scan) => scan.processed).length, [scans]);
  const totalScanned = scans.length;

  const handleManualSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = manualCode.trim();
      if (!trimmed) {
        return;
      }
      void handleNewScan(trimmed, "Manual entry", "manual");
      setManualCode("");
    },
    [handleNewScan, manualCode]
  );

  const toggleProcessed = useCallback((id: string, value: boolean) => {
    setScans((previous) =>
      previous.map((scan) =>
        scan.id === id
          ? {
              ...scan,
              processed: value
            }
          : scan
      )
    );
  }, []);

  const handleCopy = useCallback((scan: ScanRecord) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    navigator.clipboard
      .writeText(scan.text)
      .then(() => {
        setCopiedId(scan.id);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((error) => {
        console.warn("Unable to copy to clipboard", error);
      });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-1 border-none pb-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Scan className="h-5 w-5 text-primary" /> Live scanner
            </CardTitle>
            <CardDescription>Align the ticket barcode inside the frame to capture it instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/70 bg-black/80 shadow-inner">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
                autoPlay
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[65%] w-[82%] rounded-3xl border-2 border-white/40">
                  <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/70 to-transparent" />
                </div>
              </div>
            </div>
            {scanError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {scanError}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Use the rear-facing camera for the fastest reads.</p>
            )}
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {lastScan ? lastScan.text : "Ready for the next ticket"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lastScan
                      ? `Captured ${formatTimestamp(lastScan.timestamp)} · ${lastScan.format}`
                      : "Aim the camera at the barcode or use manual entry."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => void refreshCameras()}
                disabled={cameraLoading}
              >
                <RefreshCw className={cameraLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh cameras
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" /> Scanner controls
              </CardTitle>
              <CardDescription>Select your camera, toggle helpful automation, or add tickets manually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="camera-select" className="text-sm font-medium">
                  Active camera
                </Label>
                <Select
                  value={cameraId || undefined}
                  onValueChange={(value) => setCameraId(value)}
                  disabled={cameraLoading || cameras.length === 0}
                >
                  <SelectTrigger id="camera-select">
                    <SelectValue placeholder={cameraLoading ? "Preparing cameras…" : "Choose a camera"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((device, index) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
                  <div className="pr-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <ClipboardCheck className="h-4 w-4 text-primary" /> Auto-copy
                    </p>
                    <p className="text-xs text-muted-foreground">Drop every scan onto your clipboard instantly.</p>
                  </div>
                  <Switch checked={autoCopy} onCheckedChange={(value) => setAutoCopy(Boolean(value))} />
                </div>
                <div className="flex items-start justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
                  <div className="pr-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Vibrate className="h-4 w-4 text-primary" /> Haptic ping
                    </p>
                    <p className="text-xs text-muted-foreground">Vibrate the device whenever a scan lands.</p>
                  </div>
                  <Switch checked={haptics} onCheckedChange={(value) => setHaptics(Boolean(value))} />
                </div>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="manual-code" className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4 text-primary" /> Manual entry
                  </Label>
                  <Input
                    id="manual-code"
                    placeholder="Type ticket ID or confirmation"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full gap-2" disabled={!manualCode.trim()}>
                  <Scan className="h-4 w-4" /> Add manually
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" /> Session stats
              </CardTitle>
              <CardDescription>Numbers reset when you refresh or sign out.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-background/80 p-4 text-center shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Scanned</p>
                  <p className="text-2xl font-semibold">{totalScanned}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4 text-center shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cleared</p>
                  <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{totalProcessed}</p>
                </div>
              </div>
              {lastScan ? (
                <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>
                    Last scan • <span className="font-medium text-foreground">{lastScan.text}</span>
                  </p>
                  <p className="mt-1">
                    {lastScan.format} · {formatTimestamp(lastScan.timestamp)} · {lastScan.source === "camera" ? "Camera" : "Manual"}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Recent scans</CardTitle>
            <CardDescription>Mark each ticket as cleared once the guest is inside.</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
            {totalScanned} in queue
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
              <Scan className="h-8 w-8 text-muted-foreground/70" />
              <p>No scans yet. Hold a barcode in front of the camera to get started.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {scans.map((scan) => (
                <li
                  key={scan.id}
                  className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {scan.format}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(scan.timestamp)}</span>
                      <span className="text-xs text-muted-foreground/80">
                        {scan.source === "camera" ? "Camera capture" : "Added manually"}
                      </span>
                    </div>
                    <p className="break-all text-base font-semibold tracking-tight">{scan.text}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(scan)}
                      className="h-10 w-10"
                    >
                      {copiedId === scan.id ? (
                        <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
                      <span className="font-medium">Cleared</span>
                      <Switch
                        checked={scan.processed}
                        onCheckedChange={(value) => toggleProcessed(scan.id, Boolean(value))}
                        aria-label={`Toggle cleared for ${scan.text}`}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
