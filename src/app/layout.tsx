import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoGuard } from "@/src/app/components/DemoGuard";
import { Nav } from "@/src/app/components/Nav";
import { SessionProvider } from "@/src/app/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pipos Fitness",
  description: "Entrenamiento + Nutrición + Guía visual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <DemoGuard>
            <div className="min-h-screen pb-16">{children}</div>
            <Nav />
          </DemoGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
