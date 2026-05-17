import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emporio Flow",
  description: "Sistema de gestion interna",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
