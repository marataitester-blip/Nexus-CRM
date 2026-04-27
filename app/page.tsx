'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [foundCount, setFoundCount] = useState(0);

  const handleSearch = async () => {
    if (!keyword) return alert('Введите ключевое слово');
    
    setStatus('searching');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, language: 'RU' })
      });
      const data = await res.json();
      
      if (data.success) {
        setFoundCount(data.count);
        setStatus('done');
      } else {
        alert('Ошибка поиска: ' + data.error);
        setStatus('idle');
      }
    } catch (error) {
      alert('Сбой сети');
      setStatus('idle');
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative items-center justify-center p-6 bg-background">
      
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center border-b border-gold/20 bg-surface/50 backdrop-blur-md">
        <h1 className="text-2xl font-serif text-gold tracking-widest uppercase">Nexus CRM</h1>
        <div className="flex gap-6">
          <Link href="/leads" className="text-silver-light hover:text-gold transition-colors font-semibold tracking-wide uppercase text-sm">
            База Лидов
          </Link>
          <button className="text-silver-light/50 cursor-not-allowed text-sm uppercase font-semibold">Словарь</button>
        </div>
      </nav>

      <div className="flex flex-col items-center gap-8 z-10 w-full max-w-2xl text-center">
        <div className="space-y-4">
          <h2 className="text-4xl font-serif text-gold tracking-tight">Эфирный Радар</h2>
          <p className="text-silver opacity-80">
            {status === 'searching' 
              ? 'Идет сканирование Google и ИИ-анализ...' 
              : 'Введите тему для автоматического сбора партнерской базы.'}
          </p>
        </div>

        <div className="flex w-full gap-2 group">
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={status === 'searching'}
            placeholder="Например: школы таро, юнгианская психология..." 
            className="flex-1 bg-surface border border-gold/30 rounded-sm p-4 text-silver-light focus:outline-none focus:border-gold transition-all"
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={status === 'searching'}
          className="bg-gold text-background font-bold text-lg uppercase tracking-widest py-5 px-16 rounded-sm border border-transparent hover:bg-transparent hover:text-gold hover:border-gold transition-all disabled:opacity-30 shadow-[0_0_25px_rgba(184,153,71,0.1)]"
        >
          {status === 'searching' ? 'Поиск...' : 'Запустить сканер'}
        </button>

        {status === 'done' && (
          <div className="mt-4 animate-fade-in">
            <p className="text-gold font-bold">Найдено и проанализировано новых лидов: {foundCount}</p>
            <Link href="/leads" className="text-silver underline text-sm mt-2 block">Перейти к просмотру базы</Link>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 text-gold/20 text-xs tracking-[0.3em] font-serif uppercase italic">
        Powered by Serper & Gemini-Flash
      </div>
    </main>
  );
}
