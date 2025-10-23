import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vender Scanner",
  description:
    "Secure, mobile-friendly ticket scanning console for Vender staff.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground",
          inter.variable
        )}
      >
        <main className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8">
          <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl" />
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
