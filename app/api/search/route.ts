import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!SERPER_API_KEY) return NextResponse.json({ error: 'Ключ Serper не найден' }, { status: 500 });

    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword, num: 20 }),
    });

    const searchData = await searchResponse.json();
    const results = searchData.organic || [];
    let savedCount = 0;

    for (const item of results) {
      try {
        const existing = await prisma.lead.findUnique({ where: { url: item.link } });
        if (existing) continue;

        let aiScore = 1; // Теперь дефолт — низкий, чтобы видеть реальную работу ИИ
        let aiComment = "Не прошел первичный фильтр";

        if (OPENROUTER_API_KEY) {
          try {
            const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                  { 
                    role: "system", 
                    content: `Ты — Мессир, строгий философ и аналитик проекта 'Живое Таро'. 
                    Твоя задача: оценить сайт на пригодность к партнерству.
                    
                    КРИТЕРИИ ОЦЕНКИ (0-10):
                    1. ГЛУБИНА (40%): Это серьезная психология/архетипы или 'попса'? 
                    2. ЭСТЕТИКА (30%): Насколько описание резонирует с Retro-Futurism, Steampunk или Магическим реализмом?
                    3. ПОТЕНЦИАЛ (30%): Насколько ценна аудитория этого ресурса для проекта?

                    ШКАЛА:
                    1-3: Мусор, спам, дешевые гадания.
                    4-6: Обычные школы таро или психологические блоги.
                    7-8: Высокое качество, созвучная эстетика, глубокий подход.
                    9-10: Идеальное совпадение по 'вайбу' и смыслам.

                    ОТВЕТЬ СТРОГО JSON: { "score": число, "reason": "краткий инженерный вывод" }` 
                  },
                  { role: "user", content: `АНАЛИЗИРУЙ: Заголовок: ${item.title}. Описание: ${item.snippet}` }
                ],
                response_format: { type: "json_object" }
              })
            });

            const aiData = await aiRes.json();
            const content = aiData?.choices?.[0]?.message?.content;
            
            if (content) {
              const parsed = JSON.parse(content);
              aiScore = Math.min(10, Math.max(1, parseInt(parsed.score) || 1));
              aiComment = parsed.reason || "Без резюме";
            }
          } catch (aiErr) {
            console.error("Ошибка ИИ:", aiErr);
            aiComment = "Ошибка анализа ИИ";
          }
        }

        await prisma.lead.create({
          data: {
            id: crypto.randomUUID(),
            name: item.title,
            url: item.link,
            description: item.snippet,
            platform: 'WEB',
            language: 'RU',
            aiScore: aiScore,
            aiComment: aiComment
          }
        });
        savedCount++;
      } catch (e) {
        console.error("Ошибка записи:", e);
      }
    }

    return NextResponse.json({ success: true, count: savedCount });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
