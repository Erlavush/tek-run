import type { Metadata } from "next";
import {
  Carter_One,
  Luckiest_Guy,
  Manrope,
  Montserrat,
  Orbitron,
  Roboto_Mono,
  Sora,
} from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const festivalTitleFont = Luckiest_Guy({
  subsets: ["latin"],
  variable: "--font-festival-title",
  weight: "400",
});

const festivalCardFont = Carter_One({
  subsets: ["latin"],
  variable: "--font-festival-card",
  weight: "400",
});

const festivalClockFont = Orbitron({
  subsets: ["latin"],
  variable: "--font-festival-clock",
  weight: ["500", "700", "800"],
});

const overlayHeaderFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-overlay-header",
  weight: ["700", "800"],
});

const overlayTimeFont = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-overlay-time",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Finish Line Operator Dashboard",
  description:
    "Offline AI-assisted finish line dashboard for race operators, public display screens, and future OCR integrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Carter+One&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/digital-7-mono"
        />
      </head>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${festivalTitleFont.variable} ${festivalCardFont.variable} ${festivalClockFont.variable} ${overlayHeaderFont.variable} ${overlayTimeFont.variable} min-h-screen bg-[var(--background-light)] text-[var(--text-dark)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
