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
      if (!SERPER_API_KEY) throw new Error('В Vercel не настроен SERPER_API_KEY');

      // ИСПРАВЛЕНИЕ: Убрали оператор site:, из-за которого блокировал бесплатный тариф.
      // Теперь Гугл видит это как обычный человеческий запрос.
      const searchQuery = `${prompt} t.me`;
      
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, gl: 'ru', hl: 'ru', num: 15 })
      });
      const data = await res.json();

      if (!data.organic) {
        throw new Error(`Сбой Google Serper. Ответ сервера: ${JSON.stringify(data)}`);
      }

      const links = data.organic
        .map((item: any) => item.link)
        .filter((link: string) => link.includes('t.me/'))
        .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
        .slice(0, 6);

      return NextResponse.json({ links });
    }

    // === РЕЖИМ 2: ПРО-БАЗЫ (TGStat) ===
    if (mode === 2) {
      const TGSTAT_API_KEY = process.env.TGSTAT_API_KEY;
      if (!TGSTAT_API_KEY) throw new Error('В Vercel не настроен TGSTAT_API_KEY');

      const tgstatUrl = `https://api.tgstat.ru/channels/search?token=${TGSTAT_API_KEY}&q=${encodeURIComponent(prompt)}&limit=20&subscribers_count_from=10000&subscribers_count_to=150000`;
      
      const res = await fetch(tgstatUrl);
      const data = await res.json();

      if (data.status !== 'ok' || !data.response.items) {
        throw new Error(`Сбой TGStat. Ответ сервера: ${JSON.stringify(data)}`);
      }

      const links = data.response.items
        .map((channel: any) => channel.link)
        .slice(0, 6);
        
      return NextResponse.json({ links });
    }

    // === РЕЖИМ 3: ПАУТИНА (Органический поиск по репостам) ===
    if (mode === 3) {
      const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
      const apiHash = process.env.TELEGRAM_API_HASH || '';
      const sessionString = process.env.TELEGRAM_SESSION || '';

      if (!sessionString) throw new Error('Нет сессии Telegram. Авторизуйтесь через /tg-auth');

      const sourceChannel = prompt.replace(/(https?:\/\/)?(t\.me\/|@)/g, '').split('/')[0];

      const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      const messages = await client.getMessages(sourceChannel, { limit: 100 });
      
      const foundLinks = new Set<string>();

      for (const msg of messages) {
        if (msg.message) {
          const regex = /t\.me\/([a-zA-Z0-9_]+)/g;
          let match;
          while ((match = regex.exec(msg.message)) !== null) {
            const mentionedChannel = match[1];
            if (mentionedChannel.toLowerCase() !== sourceChannel.toLowerCase()) {
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
