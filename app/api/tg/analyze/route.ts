import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import prisma from '../../../../lib/prisma'; // Подключаем вашу базу данных

export const maxDuration = 60; // Даем Vercel время на парсинг и анализ

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();
    
    // Очищаем ссылку, чтобы получить только username (например, из t.me/anaktarna -> anaktarna)
    const channelUsername = channelUrl.replace(/(https?:\/\/)?(t\.me\/|@)/g, '').split('/')[0];

    if (!channelUsername) {
      return NextResponse.json({ error: 'Неверный формат ссылки' }, { status: 400 });
    }

    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';
    const sessionString = process.env.TELEGRAM_SESSION || '';
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!sessionString) return NextResponse.json({ error: 'Нет сессии Telegram' }, { status: 500 });
    if (!OPENROUTER_API_KEY) return NextResponse.json({ error: 'Нет ключа OpenRouter' }, { status: 500 });

    // 1. ПОДКЛЮЧАЕМСЯ К TELEGRAM ОТ ВАШЕГО ИМЕНИ
    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();

    // 2. ПОЛУЧАЕМ ДАННЫЕ КАНАЛА (Подписчики и Посты)
    let participantsCount = 0;
    try {
      const fullChannel = await client.invoke(new Api.channels.GetFullChannel({ channel: channelUsername }));
      participantsCount = fullChannel.fullChat.participantsCount || 0;
    } catch (e) {
      console.warn("Не удалось получить точное количество подписчиков. Канал может быть закрытым.");
    }

    // Собираем последние 15 постов
    const messages = await client.getMessages(channelUsername, { limit: 15 });
    
    let totalViews = 0;
    let postsWithViews = 0;
    let contentToAnalyze = "";

    for (const msg of messages) {
      if (msg.views) {
        totalViews += msg.views;
        postsWithViews++;
      }
      if (msg.message && msg.message.length > 20) {
        // Собираем тексты для Мессира (ограничиваем длину, чтобы не перегрузить токен)
        contentToAnalyze += msg.message.substring(0, 500) + "\n---\n";
      }
    }

    // 3. МАТЕМАТИКА ВОВЛЕЧЕННОСТИ (ER)
    const avgViews = postsWithViews > 0 ? Math.round(totalViews / postsWithViews) : 0;
    let er = participantsCount > 0 ? ((avgViews / participantsCount) * 100).toFixed(2) : "0.00";
    const erNumber = parseFloat(er);

    // Если ER критически низкий, мы даже не тратим деньги на запрос к ИИ
    if (erNumber > 0 && erNumber < 1.0) {
      return NextResponse.json({ 
        success: true, 
        aiScore: 1, 
        er, 
        comment: `[ER: ${er}%] Отбраковано: Мертвая аудитория или накрутка.` 
      });
    }

    // 4. АНАЛИЗ МЕССИРА (LLM)
    let aiScore = 1;
    let aiComment = "Ошибка анализа";

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
            content: `Ты — Мессир, циничный и прагматичный бизнес-аналитик проекта. 
            Твоя задача: оценить Telegram-канал как площадку для закупки рекламы элитного психологического/таро-бота.
            
            ЖЕСТКИЕ КРИТЕРИИ ОЦЕНКИ (1-10):
            1. Платежеспособность и Осознанность (40%): Это взрослая, думающая аудитория (бизнес, глубокая психология, архетипы) или школьники/любители "приворотов"?
            2. Отсутствие Инфоцыганства (30%): Жестко штрафуй за призывы на марафоны желаний, денежные медитации, обилие спама и прогревов.
            3. Аутентичность / Степень ИИ (30%): Текст написан живым человеком со своим стилем? СНИЖАЙ ОЦЕНКУ ДО 1-3, если видишь дешевую генерацию нейросетями (пластиковые фразы, изобилие эмодзи, бездушные списки). Нам не нужны каналы-пылесосы, сгенерированные ChatGPT.

            ШКАЛА:
            1-3: Спам, генерация ИИ, инфоцыгане, дешевая эзотерика. Рекламу здесь не покупаем.
            4-6: Средние блоги. Автор живой, но аудитория бедная или тема слишком поверхностная.
            7-8: Качественные каналы. Есть мысль, живой автор, хорошая публика.
            9-10: Идеальный "прогретый" бизнес-эзотерический канал.

            ОТВЕТЬ СТРОГО JSON: { "score": число, "reason": "краткий жесткий вывод для инвестора" }` 
          },
          { role: "user", content: `ОЦЕНИ КАНАЛ.\n\nПоследние посты:\n${contentToAnalyze}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content);
      aiScore = Math.min(10, Math.max(1, parseInt(parsed.score) || 1));
      aiComment = `[ER: ${er}%] ` + (parsed.reason || "Без резюме");
    }

    // 5. СОХРАНЯЕМ В БАЗУ (В таблицу Leads)
    try {
      await prisma.lead.upsert({
        where: { url: `https://t.me/${channelUsername}` },
        update: {
          aiScore: aiScore,
          aiComment: aiComment,
          description: `Подписчиков: ${participantsCount}, Просмотров: ${avgViews}`,
        },
        create: {
          id: crypto.randomUUID(),
          name: channelUsername,
          url: `https://t.me/${channelUsername}`,
          description: `Подписчиков: ${participantsCount}, Просмотров: ${avgViews}`,
          platform: 'TELEGRAM',
          language: 'RU',
          aiScore: aiScore,
          aiComment: aiComment
        }
      });
    } catch (dbErr) {
      console.error("Ошибка сохранения в БД:", dbErr);
    }

    return NextResponse.json({ success: true, aiScore, er, comment: aiComment });
  } catch (error: any) {
    console.error('Ошибка анализатора:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
