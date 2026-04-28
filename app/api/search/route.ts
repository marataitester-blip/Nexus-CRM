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

        let aiScore = 5;
        let aiComment = "Сайт найден в сети";

        // Блок ИИ с защитой от вылета
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
                  { role: "system", content: "Оцени сайт для проекта 'Живое Таро'. Ответ JSON: { \"score\": число, \"comment\": \"текст\" }" },
                  { role: "user", content: `Сайт: ${item.title}. Описание: ${item.snippet}` }
                ],
                response_format: { type: "json_object" }
              })
            });

            const aiData = await aiRes.json();
            
            // ИНЖЕНЕРНАЯ ЗАЩИТА: проверяем, что ИИ реально что-то ответил
            if (aiData?.choices?.[0]?.message?.content) {
              const parsed = JSON.parse(aiData.choices[0].message.content);
              aiScore = parseInt(parsed.score) || 5;
              aiComment = parsed.comment || "Без комментария";
            }
          } catch (aiErr) {
            console.error("ИИ временно недоступен, сохраняем без оценки");
          }
        }

        // Сохранение (теперь до него точно дойдет очередь)
        await prisma.lead.create({
          data: {
            id: crypto.randomUUID(), // Генерируем ID вручную для надежности
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
        console.error("Ошибка при записи конкретного лида:", e);
      }
    }

    return NextResponse.json({ success: true, count: savedCount });
  } catch (error) {
    console.error("Критическая ошибка сервера:", error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
