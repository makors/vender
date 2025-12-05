"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, Ticket, CheckCircle, Loader2, LogOut, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { selectEvent } from "./actions";
import { signOut } from "../scanner/actions";

type EventWithStats = {
  id: string;
  name: string;
  ticketCount: number;
  scannedCount: number;
  created_at: string;
};

export function EventPicker() {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) {
          setError("Failed to load events");
          return;
        }
        const data = await res.json();
        setEvents(data.events || []);
      } catch {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const handleSelect = (event: EventWithStats) => {
    setSelectedId(event.id);
    startTransition(() => {
      void selectEvent(event.id, event.name);
    });
  };

  const handleSignOut = () => {
    startTransition(() => {
      void signOut();
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-lg">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="mt-6">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Select Event
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose an event to start scanning tickets
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={isPending}
          className="text-muted-foreground hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CalendarDays className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg text-muted-foreground">No events found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create an event to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => {
            const isSelected = selectedId === event.id;
            const progress = event.ticketCount > 0 
              ? Math.round((event.scannedCount / event.ticketCount) * 100) 
              : 0;

            return (
              <button
                key={event.id}
                onClick={() => handleSelect(event)}
                disabled={isPending}
                className={cn(
                  "group relative text-left transition-all duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl",
                  isPending && !isSelected && "opacity-50"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  "hover:border-white/20 hover:shadow-2xl hover:shadow-primary/10",
                  "hover:-translate-y-1",
                  isSelected && "border-primary/50 bg-primary/10"
                )}>
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300" />
                  
                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate pr-2 group-hover:text-white transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{new Date(event.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isSelected && isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                      ) : (
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 transition-all duration-200 shrink-0",
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30 group-hover:border-muted-foreground/60"
                        )}>
                          {isSelected && <CheckCircle className="h-full w-full text-primary-foreground" />}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{event.ticketCount}</span>
                        <span className="text-muted-foreground">tickets</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-emerald-400">{event.scannedCount}</span>
                        <span className="text-muted-foreground"> scanned</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground text-right">
                      {progress}% checked in
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

