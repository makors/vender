import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Vender Ticket Scanner",
  description: "Mobile-friendly ticket scanning interface with secure access control"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={cn("gradient-bg min-h-screen bg-background font-sans antialiased", inter.variable)}>
        <div className="flex min-h-screen flex-col backdrop-blur-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
