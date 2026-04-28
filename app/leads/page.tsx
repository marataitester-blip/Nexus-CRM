'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Lead {
  id: string;
  name: string;
  url: string;
  description: string;
  aiScore: number;
  aiComment: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background p-8 text-silver-light">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12 border-b border-gold/20 pb-6">
          <div>
            <h1 className="text-3xl font-serif text-gold uppercase tracking-tighter">Архив Эфира</h1>
            <p className="text-xs text-gold/50 uppercase tracking-[0.3em] mt-1">База найденных партнеров</p>
          </div>
          <Link href="/" className="px-6 py-2 border border-gold/50 text-gold hover:bg-gold hover:text-background transition-all text-sm uppercase font-bold tracking-widest">
            На Радар
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 animate-pulse text-gold uppercase tracking-widest">Считывание данных...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gold/20 rounded">
            <p className="text-silver/50">В базе пока пусто. Запустите сканер на главной.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-surface border border-gold/10 p-6 rounded-sm hover:border-gold/40 transition-all group shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-serif text-gold mb-1 group-hover:text-gold-light transition-colors">
                      {lead.name}
                    </h3>
                    <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-xs text-silver/60 hover:text-gold underline break-all">
                      {lead.url}
                    </a>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-3xl font-serif text-gold leading-none">{lead.aiScore}</div>
                    <div className="text-[10px] uppercase tracking-tighter text-gold/50">Рейтинг ИИ</div>
                  </div>
                </div>
                
                <p className="text-sm text-silver/80 mb-4 italic leading-relaxed line-clamp-2">
                  {lead.description}
                </p>
                
                <div className="bg-background/50 p-3 border-l-2 border-gold/30">
                  <span className="text-[10px] uppercase text-gold/60 font-bold block mb-1">Анализ Мессира:</span>
                  <p className="text-xs text-silver-light">{lead.aiComment}</p>
                </div>
                
                <div className="mt-4 text-[9px] text-silver/30 uppercase tracking-widest text-right">
                  Зафиксировано: {new Date(lead.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
