import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import LogoutButton from "@/components/logout-button";
import ScannerWorkspace from "@/components/scanner-workspace";

export default function ScannerApp() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-6 py-5">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
              <Sparkles className="h-3.5 w-3.5" /> Vender Live Ops
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Ticket Control Hub</h1>
            <p className="text-sm text-muted-foreground">Scan, verify, and keep the line flowing smoothly.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Live
            </Badge>
            <LogoutButton />
          </div>
        </div>
      </header>
      <ScannerWorkspace />
    </div>
  );
}
