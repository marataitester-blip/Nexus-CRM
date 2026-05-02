import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import prisma from '../../../../lib/prisma';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();
    const channelUsername = channelUrl.replace(/(https?:\/\/)?(t\.me\/|@)/g, '').split('/')[0];

    if (!channelUsername) {
      return NextResponse.json({ error: 'Неверный формат ссылки' }, { status: 400 });
    }

    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';
    const sessionString = process.env.TELEGRAM_SESSION || '';
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!sessionString || !OPENROUTER_API_KEY) return NextResponse.json({ error: 'Ошибка конфигурации' }, { status: 500 });

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
    await client.connect();

    let participantsCount = 0;
    try {
      const fullChannel = await client.invoke(new Api.channels.GetFullChannel({ channel: channelUsername }));
      participantsCount = (fullChannel.fullChat as any).participantsCount || 0;
    } catch (e) {
      console.warn("Ошибка получения подписчиков.");
    }

    // --- ОПРЕДЕЛЕНИЕ КАТЕГОРИИ ---
    let rangeTag = "[<1K]";
    if (participantsCount >= 50000) rangeTag = "[50K+]";
    else if (participantsCount >= 10000) rangeTag = "[10K-50K]";
    else if (participantsCount >= 1000) rangeTag = "[1K-10K]";

    const messages = await client.getMessages(channelUsername, { limit: 100 });
    let totalViews = 0, postsWithViews = 0, contentToAnalyze = "";

    for (const msg of messages) {
      if (msg.views) { totalViews += msg.views; postsWithViews++; }
      if (msg.message && msg.message.length > 20) {
        contentToAnalyze += msg.message.substring(0, 500) + "\n---\n";
      }
    }

    const avgViews = postsWithViews > 0 ? Math.round(totalViews / postsWithViews) : 0;
    const er = participantsCount > 0 ? ((avgViews / participantsCount) * 100).toFixed(2) : "0.00";

    // Анализ Мессира
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { 
            role: "system", 
            content: `Ты — Мессир, циничный бизнес-аналитик. Оцени Telegram-канал для рекламы таро-бота.
            
            ДИАПАЗОН КАНАЛА: ${rangeTag} (${participantsCount} подписчиков).
            
            Твои поправки на масштаб:
            - [<1K] и [1K-10K]: Не штрафуй за малый охват. Ищи лояльность и живого автора.
            - [10K-50K]: Идеальный баланс. Жди высокого качества контента.
            - [50K+]: Будь предельно придирчив. Ищи признаки накрутки или "мусорной" аудитории. 

            КРИТЕРИИ (1-10): Платежеспособность, Отсутствие инфоцыганства, Аутентичность текста.
            ОТВЕТЬ СТРОГО JSON: { "score": число, "reason": "краткий жесткий вывод" }` 
          },
          { role: "user", content: `ОЦЕНИ КАНАЛ.\n\nПосты:\n${contentToAnalyze}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content;
    let aiScore = 1, aiComment = "Ошибка";

    if (content) {
      const parsed = JSON.parse(content);
      aiScore = Math.min(10, Math.max(1, parseInt(parsed.score) || 1));
      // Добавляем тег диапазона в начало комментария
      aiComment = `${rangeTag} [ER: ${er}%] ` + (parsed.reason || "Без резюме");
    }

    await prisma.lead.upsert({
      where: { url: `https://t.me/${channelUsername}` },
      update: { aiScore, aiComment, description: `Подписчиков: ${participantsCount}, Просмотров: ${avgViews}` },
      create: {
        id: crypto.randomUUID(),
        name: channelUsername,
        url: `https://t.me/${channelUsername}`,
        description: `Подписчиков: ${participantsCount}, Просмотров: ${avgViews}`,
        aiScore,
        aiComment
      }
    });

    return NextResponse.json({ success: true, aiScore, er, comment: aiComment });
  } catch (error: any) {
    console.error('Ошибка анализатора:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
