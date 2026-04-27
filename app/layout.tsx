import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus CRM | Living Tarot",
  description: "Система автоматизированного сбора и ИИ-анализа партнерских площадок",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-background text-textMain min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
