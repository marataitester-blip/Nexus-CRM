'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Типы для фронтенда
type Lead = {
  id: string;
  name: string;
  url: string;
  platform: string;
  status: string;
  language: string;
  aiScore: number | null;
  aiComment: string | null;
};

// Добавлен турецкий язык (TR)
const LANGUAGES = ['RU', 'EN', 'DE', 'ES', 'FR', 'PL', 'TR', 'OTHER'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLang, setActiveLang] = useState('RU');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeads(activeLang);
  }, [activeLang]);

  const fetchLeads = async (lang: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads?lang=${lang}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-textMain p-6">
      
      {/* Навигация */}
      <nav className="flex justify-between items-center border-b border-gold/20 pb-4 mb-8">
        <Link href="/" className="text-2xl font-serif text-gold tracking-widest uppercase hover:text-gold/80 transition-colors">
          Nexus CRM
        </Link>
        <div className="text-sm uppercase tracking-widest text-textMain/50">
          Директория Партнеров
        </div>
      </nav>

      {/* Языковые вкладки */}
      <div className="flex justify-center flex-wrap gap-4 mb-8">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-6 py-2 rounded-sm border uppercase font-bold tracking-wider transition-all ${
              activeLang === lang 
                ? 'bg-gold text-background border-gold' 
                : 'bg-surface text-textMain border-gold/30 hover:border-gold'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto bg-surface rounded-md border border-gold/20 shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-background border-b border-gold/20 uppercase tracking-wider text-xs text-gold/70">
              <th className="p-4 font-normal">Название / Ссылка</th>
              <th className="p-4 font-normal">Платформа</th>
              <th className="p-4 font-normal">Статус</th>
              <th className="p-4 font-normal">AI Рейтинг</th>
              <th className="p-4 font-normal w-1/3">AI Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gold">Загрузка данных...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-textMain/50">В сегменте {activeLang} пока нет записей.</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{lead.name}</div>
                    <a href={lead.url} target="_blank" rel="noreferrer" className="text-xs text-gold/80 hover:text-gold underline">
                      {lead.url}
                    </a>
                  </td>
                  <td className="p-4 text-sm">{lead.platform}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded border border-gold/50 bg-background text-gold">
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {lead.aiScore ? (
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${lead.aiScore >= 8 ? 'text-green-500' : lead.aiScore >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {lead.aiScore}/10
                        </span>
                      </div>
                    ) : (
                      <span className="text-textMain/30">-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-textMain/80 italic">
                    {lead.aiComment || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Кнопка ручного добавления (строго по центру) */}
      <div className="flex justify-center mt-8">
        <button className="bg-surface text-gold border border-gold border-dashed py-3 px-8 rounded-sm hover:bg-gold/10 transition-colors uppercase tracking-widest text-sm">
          + Добавить лид вручную
        </button>
      </div>

    </main>
  );
}
