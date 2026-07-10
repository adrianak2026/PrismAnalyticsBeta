import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PrismAnalytics — Privacy-first web analytics",
    template: "%s | PrismAnalytics",
  },
  description: "Privacy-first, cookie-free, GDPR-friendly analytics you can self-host on Cloudflare Workers. No cookies. No fingerprinting. Your data, your rules.",
  applicationName: "PrismAnalytics",
  keywords: ["analytics", "privacy", "cookie-free", "GDPR", "open-source", "Cloudflare Workers", "D1", "web analytics", "self-hosted"],
  authors: [{ name: "PrismAnalytics Team" }],
  creator: "PrismAnalytics",
  publisher: "PrismAnalytics",
  metadataBase: new URL("https://prism-analytics.example.workers.dev"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PrismAnalytics",
    title: "PrismAnalytics — Privacy-first web analytics",
    description: "Cookie-free, self-hostable analytics on Cloudflare's free tier.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PrismAnalytics dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrismAnalytics — Privacy-first web analytics",
    description: "Cookie-free, GDPR-friendly analytics you control.",
    images: ["/og-image.png"],
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
