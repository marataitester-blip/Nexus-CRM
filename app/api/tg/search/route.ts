import { NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import prisma from '../../../../lib/prisma';

export const maxDuration = 60;

// Вспомогательная функция для очистки ссылок (убирает слеши в конце для точного сравнения)
const normalizeUrl = (url: string) => {
  return url.replace(/\/+$/, '').toLowerCase();
};

export async function POST(request: Request) {
  try {
    const { prompt, mode, minSubs, maxSubs } = await request.json();

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Функция для фильтрации ссылок от тех, что уже есть в базе (свежее 10 дней)
    const filterQuarantinedLinks = async (urls: string[]) => {
      if (urls.length === 0) return { fresh: [], totalFound: 0 };
      
      const normalizedInput = urls.map(normalizeUrl);
      
      const existingLeads = await prisma.lead.findMany({
        where: {
          url: { in: normalizedInput },
          createdAt: { gt: tenDaysAgo }
        },
        select: { url: true }
      });

      const quarantinedUrls = new Set(existingLeads.map(l => normalizeUrl(l.url)));
      const fresh = urls.filter(url => !quarantinedUrls.has(normalizeUrl(url)));
      
      return { fresh, totalFound: urls.length };
    };

    // === РЕЖИМ 1: GOOGLE-ШПИОН ===
    if (mode === 1) {
      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      if (!SERPER_API_KEY) throw new Error('Не настроен SERPER_API_KEY');

      const searchQuery = `site:t.me ${prompt} -чат -chat -бот -bot`;
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, gl: 'ru', hl: 'ru', num: 40 })
      });
      const data = await res.json();

      if (!data.organic) return NextResponse.json({ links: [], message: "Ничего не найдено в Google" });

      const allLinks = data.organic
        .map((item: any) => item.link)
        .filter((link: string) => link.includes('t.me/') && !link.includes('joinchat') && !link.includes('+') && link.split('/').length <= 5)
        .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);

      const { fresh, totalFound } = await filterQuarantinedLinks(allLinks);
      
      if (totalFound > 0 && fresh.length === 0) {
        return NextResponse.json({ links: [], message: "Все найденные топ-каналы (около 40) уже находятся в карантине. Попробуйте уточнить запрос." });
      }

      return NextResponse.json({ links: fresh.slice(0, 6) });
    }

    // === РЕЖИМ 2: ПРО-БАЗЫ (TGStat) ===
    if (mode === 2) {
      const TGSTAT_API_KEY = process.env.TGSTAT_API_KEY;
      if (!TGSTAT_API_KEY) throw new Error('Нужен TGSTAT_API_KEY');

      let url = `https://api.tgstat.ru/channels/search?token=${TGSTAT_API_KEY}&q=${encodeURIComponent(prompt)}&limit=20`;
      if (minSubs) url += `&subscribers_count_from=${minSubs}`;
      if (maxSubs) url += `&subscribers_count_to=${maxSubs}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'ok' || !data.response.items) return NextResponse.json({ links: [], message: "TGStat не вернул результатов" });

      const allLinks = data.response.items.map((channel: any) => channel.link);
      const { fresh, totalFound } = await filterQuarantinedLinks(allLinks);

      if (totalFound > 0 && fresh.length === 0) {
        return NextResponse.json({ links: [], message: "Все подходящие каналы из базы TGStat уже отработаны. Измените фильтр подписчиков." });
      }
      
      return NextResponse.json({ links: fresh.slice(0, 6) });
    }

    // === РЕЖИМ 3: ПАУТИНА ===
    if (mode === 3) {
      const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
      const apiHash = process.env.TELEGRAM_API_HASH || '';
      const sessionString = process.env.TELEGRAM_SESSION || '';

      if (!sessionString) throw new Error('Нет сессии Telegram');

      const sourceChannel = prompt.replace(/(https?:\/\/)?(t\.me\/|@)/g, '').split('/')[0];
      const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      const messages = await client.getMessages(sourceChannel, { limit: 50 });
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

      const { fresh, totalFound } = await filterQuarantinedLinks(Array.from(foundLinks));

      if (totalFound > 0 && fresh.length === 0) {
        return NextResponse.json({ links: [], message: "В этом канале найдены только те ресурсы, которые уже есть в нашей базе." });
      }
      
      return NextResponse.json({ links: fresh.slice(0, 6) });
    }

    return NextResponse.json({ error: 'Неизвестный режим' }, { status: 400 });

  } catch (error: any) {
    console.error('Ошибка поисковика:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
