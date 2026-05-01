import { NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { prompt, mode } = await request.json();

    // === РЕЖИМ 1: GOOGLE-ШПИОН ===
    if (mode === 1) {
      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      if (!SERPER_API_KEY) throw new Error('Не настроен SERPER_API_KEY');

      const searchQuery = `site:t.me ${prompt} -чат -chat -бот -bot`;
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, gl: 'ru', hl: 'ru', num: 15 })
      });
      const data = await res.json();

      if (!data.organic) return NextResponse.json({ links: [] });

      const links = data.organic
        .map((item: any) => item.link)
        .filter((link: string) => link.includes('t.me/') && !link.includes('joinchat') && !link.includes('+') && link.split('/').length === 4)
        .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
        .slice(0, 6);

      return NextResponse.json({ links });
    }

    // === РЕЖИМ 2: ПРО-БАЗЫ (TGStat) ===
    if (mode === 2) {
      const TGSTAT_API_KEY = process.env.TGSTAT_API_KEY;
      if (!TGSTAT_API_KEY) throw new Error('Для этого режима нужен TGSTAT_API_KEY в Vercel. Зарегистрируйтесь на api.tgstat.ru');

      const res = await fetch(`https://api.tgstat.ru/channels/search?token=${TGSTAT_API_KEY}&q=${encodeURIComponent(prompt)}&limit=6`);
      const data = await res.json();

      if (data.status !== 'ok' || !data.response.items) return NextResponse.json({ links: [] });

      const links = data.response.items.map((channel: any) => channel.link);
      return NextResponse.json({ links });
    }

    // === РЕЖИМ 3: ПАУТИНА (Органический поиск по репостам) ===
    if (mode === 3) {
      const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
      const apiHash = process.env.TELEGRAM_API_HASH || '';
      const sessionString = process.env.TELEGRAM_SESSION || '';

      if (!sessionString) throw new Error('Нет сессии Telegram. Авторизуйтесь через /tg-auth');

      // Очищаем ссылку источника
      const sourceChannel = prompt.replace(/(https?:\/\/)?(t\.me\/|@)/g, '').split('/')[0];

      const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      // Берем последние 50 сообщений канала-донора
      const messages = await client.getMessages(sourceChannel, { limit: 50 });
      
      const foundLinks = new Set<string>();

      for (const msg of messages) {
        // Ищем прямые ссылки t.me/ в текстах постов
        if (msg.message) {
          const regex = /t\.me\/([a-zA-Z0-9_]+)/g;
          let match;
          while ((match = regex.exec(msg.message)) !== null) {
            const mentionedChannel = match[1];
            // Исключаем сам канал-донор и всякие чаты/боты (по базовой эвристике)
            if (mentionedChannel.toLowerCase() !== sourceChannel.toLowerCase() && 
                !mentionedChannel.toLowerCase().includes('bot') &&
                !mentionedChannel.toLowerCase().includes('chat')) {
              foundLinks.add(`https://t.me/${mentionedChannel}`);
            }
          }
        }
      }

      const links = Array.from(foundLinks).slice(0, 6);
      return NextResponse.json({ links });
    }

    return NextResponse.json({ error: 'Неизвестный режим' }, { status: 400 });

  } catch (error: any) {
    console.error('Ошибка поисковика:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
