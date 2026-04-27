'use client';

import { useState } from 'react';

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchStart = () => {
    setIsSearching(true);
    // Здесь будет вызов API парсера
    setTimeout(() => {
      setIsSearching(false);
      alert('Симуляция поиска завершена. Перейдите в базу.');
    }, 2000);
  };

  return (
    <main className="min-h-screen flex flex-col relative items-center justify-center p-6 bg-background">
      
      {/* Навигационная панель */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center border-b border-gold/20 bg-surface/50 backdrop-blur-md">
        <h1 className="text-2xl font-serif text-gold tracking-widest uppercase">Nexus CRM</h1>
        <div className="flex gap-4">
          <button className="text-textMain hover:text-gold transition-colors">База Лидов</button>
          <button className="text-textMain hover:text-gold transition-colors">Словарь Ключей</button>
        </div>
      </nav>

      {/* Центральный блок запуска */}
      <div className="flex flex-col items-center gap-8 z-10">
        <div className="text-center space-y-4 max-w-lg">
          <h2 className="text-4xl font-serif text-gold">Радар Партнеров</h2>
          <p className="text-textMain/70">
            Система автоматизированного сбора и ИИ-анализа площадок, школ и авторов.
          </p>
        </div>

        <div className="flex w-full max-w-md gap-2">
          <input 
            type="text" 
            placeholder="Введите теги (например: Таро, Стимпанк...)" 
            className="flex-1 bg-surface border border-gold/30 rounded-md p-3 text-textMain focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Строго по центру */}
        <button 
          onClick={handleSearchStart}
          disabled={isSearching}
          className="bg-gold text-background font-bold text-lg uppercase tracking-wider py-4 px-12 rounded-sm border-2 border-transparent hover:bg-transparent hover:text-gold hover:border-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? 'Сканирование эфира...' : 'Запустить поиск'}
        </button>
      </div>

      {/* Декоративные элементы */}
      <div className="absolute bottom-10 text-gold/30 text-sm tracking-widest font-serif uppercase">
        Living Tarot Ecosystem
      </div>
    </main>
  );
}
