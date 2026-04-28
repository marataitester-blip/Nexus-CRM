import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link"; // Встроенный компонент Next.js для быстрых переходов

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Nexus CRM | Живое Таро",
  description: "Система поиска и интеллектуального анализа партнеров",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-black text-zinc-300 min-h-screen flex flex-col`}>
        
        {/* Главная навигационная панель Мессира */}
        <header className="bg-zinc-950 border-b border-yellow-900 p-4 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Логотип */}
            <div className="text-yellow-600 font-bold uppercase tracking-widest text-xl flex items-center gap-2">
              <span className="text-zinc-500">❖</span> NEXUS-CRM
            </div>

            {/* Кнопки управления (Роутинг) */}
            <nav className="flex gap-2 flex-wrap justify-center">
              <Link 
                href="/" 
                className="px-5 py-2 text-xs uppercase tracking-widest font-bold rounded border border-zinc-800 bg-black text-zinc-400 hover:border-yellow-700 hover:text-yellow-500 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              >
                Веб-Поиск
              </Link>
              
              <Link 
                href="/tg-analyze" 
                className="px-5 py-2 text-xs uppercase tracking-widest font-bold rounded border border-zinc-800 bg-black text-zinc-400 hover:border-yellow-700 hover:text-yellow-500 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              >
                TG-Терминал
              </Link>
              
              <Link 
                href="/leads" 
                className="px-5 py-2 text-xs uppercase tracking-widest font-bold rounded border border-zinc-800 bg-black text-zinc-400 hover:border-yellow-700 hover:text-yellow-500 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              >
                База Лидов
              </Link>

              <div className="w-px bg-zinc-800 mx-1"></div> {/* Разделитель */}

              <Link 
                href="/tg-auth" 
                className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded border border-zinc-900 bg-zinc-950 text-zinc-600 hover:border-red-900 hover:text-red-500 transition-all"
                title="Техническая настройка доступа к Telegram"
              >
                Активация
              </Link>
            </nav>
            
          </div>
        </header>

        {/* Окно, в которое загружаются сами страницы */}
        <main className="flex-1 flex flex-col w-full relative">
          {children}
        </main>

      </body>
    </html>
  );
}
