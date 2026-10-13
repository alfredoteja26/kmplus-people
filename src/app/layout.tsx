import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppFrame } from "@/components/shell/AppFrame";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "KMPlus People", template: "%s · KMPlus People" },
  description: "People, with evidence. KMPlus Optima Internasional.",
  applicationName: "KMPlus People",
};

export const viewport: Viewport = {
  themeColor: "#1A7870",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-brand="kmplus" className={`${plusJakarta.variable} ${plexMono.variable}`}>
      <body className={`${plusJakarta.className} relative isolate`}>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
