import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'RU';

  try {
    const leads = await prisma.lead.findMany({
      where: {
        language: lang as any,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при загрузке базы' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, description, platform, language } = body;

    let aiScore = 0;
    let aiComment = "Ожидает оценки";

    // Обращение к OpenRouter для ИИ-анализа, если есть описание
    if (description && process.env.OPENROUTER_API_KEY) {
      try {
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                content: "Ты аналитик проекта 'Living Tarot'. Оцени площадку (от 1 до 10) на предмет пригодности для рекламы таро-бота, юнгианской психологии, стимпанка и ретрофутуризма. Ответь строго в JSON формате: { \"score\": число, \"comment\": \"краткая причина\" }"
              },
              {
                role: "user",
                content: `Название: ${name}. Описание: ${description}`
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        const data = await aiResponse.json();
        const aiResult = JSON.parse(data.choices[0].message.content);
        aiScore = aiResult.score;
        aiComment = aiResult.comment;
      } catch (aiError) {
        console.error("Ошибка ИИ оценки:", aiError);
        aiComment = "Ошибка при запросе к ИИ";
      }
    }

    const newLead = await prisma.lead.create({
      data: {
        name,
        url,
        description,
        platform,
        language: language || 'RU',
        aiScore,
        aiComment
      }
    });

    return NextResponse.json(newLead);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка создания лида' }, { status: 500 });
  }
}
