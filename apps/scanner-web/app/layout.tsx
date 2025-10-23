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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={cn("min-h-screen bg-background text-foreground font-sans antialiased", inter.variable)}>
        {children}
      </body>
    </html>
  );
}
