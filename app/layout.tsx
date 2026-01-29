import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "../components/layout/TopNav";
import { cn } from "../lib/cn";
import { AuthGate } from "../components/auth/AuthGate";
import { IdentitySync } from "../components/auth/IdentitySync";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "ARC // Raiders Outpost",
    template: "%s | ARC // Raiders Outpost",
  },
  description:
    "Companion HUD for tracking needed ARC Raiders items and syncing blueprint ownership with your crew.",
  applicationName: "ARC // Raiders Outpost",
  keywords: [
    "ARC Raiders",
    "outpost",
    "blueprints",
    "item tracker",
    "community",
    "crew",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "ARC // Raiders Outpost",
    description:
      "Companion HUD for tracking needed ARC Raiders items and syncing blueprint ownership with your crew.",
    type: "website",
    locale: "de_DE",
    siteName: "ARC // Raiders Outpost",
  },
  twitter: {
    card: "summary",
    title: "ARC // Raiders Outpost",
    description:
      "Companion HUD for tracking needed ARC Raiders items and syncing blueprint ownership with your crew.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080c1a",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="de">
      <body
        className={cn(
          "min-h-screen bg-arc-grid font-sans text-text",
          spaceGrotesk.variable,
          plexMono.variable
        )}
      >
        <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <TopNav />
          <main className="flex-1">{children}</main>
        </div>
        <IdentitySync />
        <AuthGate />
      </body>
    </html>
  );
}
