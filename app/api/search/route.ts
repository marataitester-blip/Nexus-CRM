import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Увеличиваем лимит работы функции до 60 секунд
export const maxDuration = 60;

export async function POST(request: Request) {
  const { keyword, language = 'RU' } = await request.json();
  const SERPER_API_KEY = process.env.SERPER_API_KEY;

  if (!SERPER_API_KEY) {
    return NextResponse.json({ error: 'Ключ Serper не найден' }, { status: 500 });
  }

  try {
    // 1. Запрос к поисковику Google
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
        num: 10, // Собираем по 10 результатов за раз
      }),
    });

    const searchData = await searchResponse.json();
    const results = searchData.organic || [];

    const processedLeads = [];

    // 2. Обработка каждого результата
    for (const item of results) {
      try {
        // Проверяем, нет ли уже такого URL в базе
        const existing = await prisma.lead.findUnique({ where: { url: item.link } });
        if (existing) continue;

        // Отправляем описание в OpenRouter для ИИ-оценки
        let aiScore = 5;
        let aiComment = "Авто-сбор";

        if (process.env.OPENROUTER_API_KEY) {
          const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash-001",
              messages: [
                {
                  role: "system",
                  content: "Ты эксперт проекта 'Живое Таро'. Оцени сайт для партнерства. Тематика: Таро, Психология, Стимпанк. Ответь JSON: { \"score\": 1-10, \"comment\": \"почему\" }"
                },
                { role: "user", content: `Сайт: ${item.title}. Описание: ${item.snippet}` }
              ],
              response_format: { type: "json_object" }
            })
          });
          const aiData = await aiRes.json();
          const parsed = JSON.parse(aiData.choices[0].message.content);
          aiScore = parsed.score;
          aiComment = parsed.comment;
        }

        // 3. Сохраняем в базу
        const newLead = await prisma.lead.create({
          data: {
            name: item.title,
            url: item.link,
            description: item.snippet,
            platform: 'WEB',
            language: language as any,
            aiScore,
            aiComment
          }
        });
        processedLeads.push(newLead);
      } catch (e) {
        console.error("Ошибка обработки лида:", e);
      }
    }

    return NextResponse.json({ success: true, count: processedLeads.length });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка поиска' }, { status: 500 });
  }
}
