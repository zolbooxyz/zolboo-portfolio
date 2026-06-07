import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import SmoothScroll from "@/lib/SmoothScroll";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import ScrollProgress from "@/components/ScrollProgress";

const display = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
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
    <html lang="mn" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="grain bg-bg text-ink antialiased">
        <LanguageProvider>
          <SmoothScroll>
            <Loader />
            <Cursor />
            <ScrollProgress />
            {children}
          </SmoothScroll>
        </LanguageProvider>
      </body>
    </html>
  );
}
