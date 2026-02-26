import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Motion Comic Studio",
  description: "Generate keyframes for motion comics using AI",
  icons: {
    icon: "/icon.svg",
  },
};

import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"

import { Sidebar } from "@/components/layout/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased overflow-hidden")}>
        <div className="flex h-screen w-full flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-background relative">
                {children}
            </main>
          </div>
        </div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
