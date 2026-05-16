import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WAVE - Water Anomaly & Validation Engine",
  description:
    "Vietnam's AI-powered water pollution intelligence platform. Fusing satellite data, citizen reports, and geospatial AI into one explainable risk score - for every river, every day.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#76b900",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
