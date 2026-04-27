import { NextResponse } from 'next/server';
import { PrismaClient, Language } from '@prisma/client';

const prisma = new PrismaClient();

// Увеличиваем лимит времени выполнения до 60 секунд (максимум для Vercel Hobby/Pro)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { keyword, language = 'RU' } = await request.json();
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!SERPER_API_KEY) {
      return NextResponse.json({ error: 'Ключ Serper не найден в переменных Vercel' }, { status: 500 });
    }

    // 1. Поиск в Google через Serper (берем 25 результатов для баланса скорости)
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: keyword,
        gl: language === 'RU' ? 'ru' : 'us',
        hl: language.toLowerCase(),
        num: 25, 
      }),
    });

    const searchData = await searchResponse.json();
    const results = searchData.organic || [];
    let savedCount = 0;

    // 2. Обработка результатов
    for (const item of results) {
      try {
        // Проверка на дубликаты
        const existing = await prisma.lead.findUnique({ where: { url: item.link } });
        if (existing) continue;

        let aiScore = 5;
        let aiComment = "Авто-анализ";

        // Анализ через OpenRouter (Gemini-Flash для скорости)
        if (OPENROUTER_API_KEY) {
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
                  content: "Ты эксперт проекта 'Nexus Tarot'. Оцени потенциал сайта для партнерства (Таро, Психология, Стимпанк). JSON: { \"score\": 1-10, \"comment\": \"кратко почему\" }"
                },
                { role: "user", content: `Заголовок: ${item.title}. Сниппет: ${item.snippet}` }
              ],
              response_format: { type: "json_object" }
            })
          });

          const aiData = await aiRes.json();
          const parsed = JSON.parse(aiData.choices[0].message.content);
          aiScore = parsed.score;
          aiComment = parsed.comment;
        }

        // 3. Сохранение в PostgreSQL
        await prisma.lead.create({
          data: {
            name: item.title,
            url: item.link,
            description: item.snippet,
            platform: 'WEB',
            language: language as Language,
            aiScore,
            aiComment
          }
        });
        savedCount++;
      } catch (e) {
        console.error("Ошибка обработки лида:", e);
      }
    }

    return NextResponse.json({ success: true, count: savedCount });
  } catch (error) {
    console.error("Критическая ошибка поиска:", error);
    return NextResponse.json({ error: 'Ошибка на стороне сервера' }, { status: 500 });
  }
}
