import type { Metadata } from "next";
import { Syne, Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import SmoothScroll from "@/lib/SmoothScroll";

// Syne is reserved for the brand logo only (the "zolboo.xyz" signature)
const logo = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-logo",
  display: "swap",
});

// Onest drives everything else — headings + body (Latin + Cyrillic)
const sans = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zolboo — Web Developer & Automation",
  description:
    "Web developer & automation specialist building websites and automation for Mongolian businesses.",
  openGraph: {
    title: "Zolboo — Web Developer & Automation",
    description:
      "Building websites and automation for Mongolian businesses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className={`${logo.variable} ${sans.variable} ${mono.variable}`}>
      <body className="grain bg-bg text-ink antialiased">
        <LanguageProvider>
          <Loader />
          <Cursor />
          <SmoothScroll>{children}</SmoothScroll>
        </LanguageProvider>
      </body>
    </html>
  );
}
