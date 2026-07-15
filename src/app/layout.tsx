import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Noto_Sans_Tamil } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for headings — warm, artisan feel
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Proper Tamil glyphs instead of system fallback
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AzhaguThinpandam — Kovilpatti Kadalai Mittai & Traditional Tamil Snacks",
    template: "%s | AzhaguThinpandam",
  },
  description:
    "Authentic Kovilpatti kadalai mittai (kadalaimittai), murukku, sev, seeval and mixture — made fresh in small batches and delivered across India.",
  keywords: [
    "kadalai mittai",
    "kadalaimittai",
    "kovilpatti kadalai mittai",
    "kovilpatti kadalaimittai",
    "கடலை மிட்டாய்",
    "peanut chikki",
    "tamil snacks online",
    "murukku online",
    "sev",
    "mixture",
  ],
  openGraph: {
    type: "website",
    siteName: "AzhaguThinpandam",
    locale: "en_IN",
    url: APP_URL,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "AzhaguThinpandam" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${notoTamil.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: "AzhaguThinpandam",
            alternateName: "அழகு தின்பண்டம்",
            url: APP_URL,
            logo: `${APP_URL}/logo.png`,
            description:
              "Authentic Kovilpatti kadalai mittai (kadalaimittai), murukku, sev, seeval and mixture — made fresh in small batches and delivered across India.",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Kovilpatti",
              addressRegion: "Tamil Nadu",
              addressCountry: "IN",
            },
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
