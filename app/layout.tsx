import type { Metadata } from "next";
import { Syne, Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import SmoothScroll from "@/lib/SmoothScroll";
import { Analytics } from "@vercel/analytics/next";

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

const SITE_URL = "https://zolboo.xyz";
const DESCRIPTION =
  "Web developer & automation specialist building websites, SaaS and AI automation for Mongolian businesses.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Zolboo — Web Developer & Automation Specialist",
    template: "%s · Zolboo.Xyz",
  },
  description: DESCRIPTION,
  keywords: [
    "Zolboo",
    "web developer Mongolia",
    "веб хөгжүүлэгч",
    "автоматжуулалт",
    "automation",
    "SaaS",
    "AI automation",
    "full-stack developer",
    "Ulaanbaatar",
    "Mongolia",
  ],
  authors: [{ name: "Zolboo", url: SITE_URL }],
  creator: "Zolboo",
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Zolboo.Xyz",
    title: "Zolboo — Web Developer & Automation Specialist",
    description: DESCRIPTION,
    locale: "mn_MN",
    alternateLocale: "en_US",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Zolboo — Full-Stack Developer & Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zolboo — Web Developer & Automation Specialist",
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

// structured data so Google can render a rich person/professional result
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Zolboo",
  url: SITE_URL,
  jobTitle: "Web Developer & Automation Specialist",
  description: DESCRIPTION,
  email: "mailto:zolbooq@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ulaanbaatar",
    addressCountry: "MN",
  },
  knowsAbout: [
    "Web Development",
    "AI & Automation",
    "SaaS Development",
    "UI/UX & Motion Design",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className={`${logo.variable} ${sans.variable} ${mono.variable}`}>
      <body className="grain bg-bg text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LanguageProvider>
          <Loader />
          <Cursor />
          <SmoothScroll>{children}</SmoothScroll>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
