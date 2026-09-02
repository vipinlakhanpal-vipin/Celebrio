import type { Metadata, Viewport } from "next";
import { Outfit, Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import { NO_FLASH_SCRIPT } from "@/components/ThemeProvider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Used only for the "Celebrio" wordmark itself — a warm serif so the brand
// name can carry the whole logo without an icon, the way a fine stationer's
// name-only mark works.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Celebrio",
  description: "Celebrio — never miss a birthday, anniversary, or holiday. Upload contacts, review AI-drafted greetings, and send them right on time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Celebrio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
