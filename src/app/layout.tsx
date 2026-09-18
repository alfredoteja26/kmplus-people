import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { AppFrame } from "@/components/shell/AppFrame";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "KMPlus People",
  description: "People, with evidence. KMPlus Optima Internasional.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-brand="kmplus" className={`${inter.variable} ${plexMono.variable}`}>
      <body className={inter.className}>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
