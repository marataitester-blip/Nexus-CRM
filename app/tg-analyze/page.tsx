'use client';

import React, { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'system' | 'result';
  content: string | React.ReactNode;
};

// Функция искусственной задержки
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function TelegramAnalyzePage() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<1 | 2 | 3>(1); // 1: Google, 2: TGStat, 3: Spider
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'system' | 'result', content: string | React.ReactNode) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substring(7), role, content }]);
  };

  const executeCommand = async () => {
    if (!prompt.trim()) return;
    
    const userText = prompt;
    setPrompt('');
    addMessage('user', userText);
    setLoading(true);

    const modeNames = { 1: 'Google-Шпион', 2: 'Про-Базы', 3: 'Паутина' };
    addMessage('system', `Активирован модуль: ${modeNames[mode]}. Выполняю захват целей...`);

    try {
      const searchRes = await fetch('/api/tg/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, mode }),
      });
      
      const searchData = await searchRes.json();

      if (searchData.error) {
        addMessage('system', `Ошибка модуля: ${searchData.error}`);
        setLoading(false);
        return;
      }

      // ИСПРАВЛЕНИЕ 1: Теперь терминал выводит причину от бэкенда (например, про карантин)
      if (!searchData.links || searchData.links.length === 0) {
        addMessage('system', searchData.message || 'Цели не обнаружены. Попробуйте изменить параметры запроса.');
        setLoading(false);
        return;
      }

      // ИСПРАВЛЕНИЕ 2: Берем до 6 каналов за раз, как и договаривались
      const targetLinks = searchData.links.slice(0, 6);

      addMessage('system', `Всего найдено целей: ${searchData.links.length}. В целях безопасности беру в работу первые ${targetLinks.length}. Начинаю глубокий анализ...`);

      // Поштучный анализ с искусственной паузой
      for (let i = 0; i < targetLinks.length; i++) {
        const link = targetLinks[i];
        
        try {
          addMessage('system', `[${i+1}/${targetLinks.length}] Сканирую ${link}...`);
          
          const analyzeRes = await fetch('/api/tg/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelUrl: link }),
          });
          
          const analyzeData = await analyzeRes.json();

          if (analyzeData.error) {
            addMessage('system', `[${link}] Сбой анализатора: ${analyzeData.error}`);
          } else {
            const resultCard = (
              <div className="border border-zinc-700 bg-black p-4 rounded mt-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 hover:underline font-bold mb-3 inline-block tracking-wider">
                  {link.replace('https://t.me/', '@')}
                </a>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-2 text-center rounded">
                    <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Вердикт Мессира</span>
                    <span className={`text-2xl font-bold ${analyzeData.aiScore >= 8 ? 'text-green-500' : analyzeData.aiScore >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {analyzeData.aiScore} / 10
                    </span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-2 text-center rounded">
                    <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Вовлеченность (ER)</span>
                    <span className="text-2xl font-bold text-white">{analyzeData.er}%</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 border-l-2 border-yellow-700 pl-3 py-1 font-sans leading-relaxed">
                  {analyzeData.comment}
                </p>
              </div>
            );
            addMessage('result', resultCard);
          }
          
        } catch (err) {
          addMessage('system', `[${link}] Потеря связи с сервером во время анализа.`);
        }

        // Пауза 6 секунд между запросами (кроме последнего)
        if (i < targetLinks.length - 1) {
          addMessage('system', '⏳ Скрываю следы... Ожидание 6 секунд перед следующей целью...');
          await sleep(6000);
        }
      }

      addMessage('system', 'Сеанс сканирования завершен. База данных лидов обновлена.');

    } catch (error: any) {
      addMessage('system', 'Критический сбой терминала.');
    }
    
    setLoading(false);
  };

  const getPlaceholder = () => {
    if (mode === 1) return 'Например: "Бизнес таро" или "Глубинная психология"';
    if (mode === 2) return 'Например: "Архетипы" (Нужен ключ TGStat)';
    if (mode === 3) return 'Введите ссылку на канал-донор (например: t.me/anaktarna)';
    return '';
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col items-center p-4 font-mono">
      <div className="max-w-3xl w-full flex flex-col h-[90vh] border border-yellow-800 rounded shadow-[0_0_30px_rgba(202,138,4,0.1)] bg-[#0a0a0a] overflow-hidden">
        
        {/* Шапка */}
        <div className="bg-zinc-950 border-b border-yellow-900 p-4">
          <h1 className="text-xl uppercase tracking-widest font-bold text-yellow-600 mb-4 text-center">Терминал Мессира: Захват Лидов</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map((m) => (
              <button 
                key={m}
                onClick={() => setMode(m as 1|2|3)}
                className={`flex-1 py-2 text-xs uppercase font-bold tracking-wider rounded border transition-all ${mode === m ? 'bg-yellow-700 text-black border-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.3)]' : 'bg-black text-zinc-500 border-zinc-800 hover:border-yellow-900 hover:text-zinc-300'}`}
              >
                {m === 1 ? '1. Google-Шпион' : m === 2 ? '2. Про-Базы' : '3. Паутина'}
              </button>
            ))}
          </div>
        </div>

        {/* Лог терминала */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-sm text-center space-y-2">
              <p>Ожидаю параметров для запуска алгоритмов.</p>
              <p className="text-xs text-zinc-700">Максимум 6 каналов за цикл для защиты от блокировок.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-3 rounded ${
                msg.role === 'user' ? 'bg-yellow-900/40 border border-yellow-900 text-yellow-100' : 
                msg.role === 'system' ? 'text-zinc-500 text-xs uppercase tracking-wider border-l border-zinc-700 pl-3' : 
                'bg-transparent w-full'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Командная строка */}
        <div className="bg-zinc-950 p-4 border-t border-yellow-900 flex gap-2">
          <input 
            type="text" 
            placeholder={getPlaceholder()} 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
            disabled={loading}
            className="flex-1 bg-black border border-zinc-800 p-3 rounded text-yellow-500 focus:outline-none focus:border-yellow-700 transition-colors placeholder:text-zinc-700"
          />
          <button 
            onClick={executeCommand}
            disabled={loading || !prompt.trim()}
            className="bg-yellow-700 hover:bg-yellow-600 text-black font-bold px-8 py-3 rounded transition-all disabled:opacity-50 tracking-widest uppercase"
          >
            {loading ? '...' : 'Пуск'}
          </button>
        </div>

      </div>
    </div>
  );
}
