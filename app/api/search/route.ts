import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Прямой путь: выходим из 3-х папок и идем в lib

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { keyword, language = 'RU' } = await request.json();
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!SERPER_API_KEY) return NextResponse.json({ error: 'Ключ Serper не найден' }, { status: 500 });

    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword, gl: 'ru', hl: 'ru', num: 20 }),
    });

    const searchData = await searchResponse.json();
    const results = searchData.organic || [];
    let savedCount = 0;

    for (const item of results) {
      try {
        const existing = await prisma.lead.findUnique({ where: { url: item.link } });
        if (existing) continue;

        let aiScore = 5;
        let aiComment = "Авто-анализ";

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
                  { role: "system", content: "Ты эксперт проекта 'Живое Таро'. Оцени сайт. JSON формат: { \"score\": 1-10, \"comment\": \"почему\" }" },
                  { role: "user", content: `Заголовок: ${item.title}. Описание: ${item.snippet}` }
                ],
                response_format: { type: "json_object" }
              })
            });
            const aiData = await aiRes.json();
            const parsed = JSON.parse(aiData.choices[0].message.content);
            aiScore = parseInt(parsed.score) || 5;
            aiComment = parsed.comment || "Без комментария";
          } catch (aiErr) {
            console.error("Ошибка ИИ", aiErr);
          }
        }

        await prisma.lead.create({
          data: {
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
        console.error("Ошибка записи лида:", e);
      }
    }

    return NextResponse.json({ success: true, count: savedCount });
  } catch (error) {
    console.error("Критическая ошибка:", error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
