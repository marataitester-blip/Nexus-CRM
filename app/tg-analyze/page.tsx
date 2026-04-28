'use client';

import React, { useState } from 'react';

export default function TelegramAnalyzePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyzeChannel = async () => {
    if (!url) return;
    
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/tg/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: url }),
      });
      
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: 'Сбой соединения с сервером аналитики.' });
    }
    
    setLoading(false);
  };

  // Функция для определения цвета оценки
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500 border-green-500';
    if (score >= 5) return 'text-yellow-500 border-yellow-500';
    return 'text-red-500 border-red-500';
  };

  return (
    <div className="min-h-screen bg-black text-yellow-500 flex flex-col items-center justify-center p-4 font-mono">
      <div className="max-w-2xl w-full border-2 border-yellow-600 p-8 rounded-lg shadow-[0_0_20px_rgba(202,138,4,0.1)] bg-zinc-900">
        <h1 className="text-2xl mb-2 text-center uppercase tracking-widest font-bold text-yellow-500">
          Рабочий стол Мессира
        </h1>
        <p className="text-center text-zinc-500 text-sm mb-8">Бизнес-анализ каналов на пригодность для рекламы</p>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Ссылка на канал (например, t.me/durov):</p>
            <input 
              type="text" 
              placeholder="https://t.me/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-black border border-yellow-700 p-3 rounded text-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
            />
          </div>

          <button 
            onClick={analyzeChannel}
            disabled={loading || !url}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 rounded transition-all disabled:opacity-50 tracking-widest"
          >
            {loading ? 'СКАНИРОВАНИЕ И АНАЛИЗ (может занять до 30 секунд)...' : 'АНАЛИЗИРОВАТЬ КАНАЛ'}
          </button>
        </div>

        {/* Вывод результатов */}
        {result && (
          <div className="mt-8 border-t border-zinc-800 pt-6 animate-fade-in">
            {result.error ? (
              <div className="p-4 border border-red-900 bg-red-950 text-red-500 rounded">
                <p className="font-bold">Критическая ошибка:</p>
                <p className="text-sm">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 border-2 rounded text-center ${getScoreColor(result.aiScore)} bg-black`}>
                    <p className="text-xs uppercase tracking-wider mb-1 text-zinc-400">Оценка Мессира</p>
                    <p className="text-4xl font-bold">{result.aiScore} / 10</p>
                  </div>
                  <div className="p-4 border-2 border-zinc-700 rounded text-center bg-black text-white">
                    <p className="text-xs uppercase tracking-wider mb-1 text-zinc-400">Реальный ER</p>
                    <p className="text-4xl font-bold">{result.er}%</p>
                  </div>
                </div>

                <div className="bg-black border border-zinc-700 p-5 rounded">
                  <p className="text-xs uppercase tracking-wider mb-2 text-zinc-500">Вердикт</p>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {result.comment}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
