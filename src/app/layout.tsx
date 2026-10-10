import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist_Mono, Syne } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Imran Hossain — Full Stack Developer",
  description:
    "An immersive 3D portfolio for MD Imran (Imran Hossain) — full-stack developer working with React, Nest.js and TypeScript.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
