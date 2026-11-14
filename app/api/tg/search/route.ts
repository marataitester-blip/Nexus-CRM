import { NextResponse } from 'next/server';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import prisma from '../../../../lib/prisma';

export const maxDuration = 60;

// Search locale controls query phrasing and Google region, not a strict
// classification of the channel's actual content.
const SEARCH_LOCALES = {
  ru: { gl: 'ru', hl: 'ru', hint: 'телеграм каналы' },
  'es-ES': { gl: 'es', hl: 'es', hint: 'canales de Telegram España' },
  'es-MX': { gl: 'mx', hl: 'es', hint: 'canales de Telegram México' },
  en: { gl: 'us', hl: 'en', hint: 'Telegram channels' },
  de: { gl: 'de', hl: 'de', hint: 'Telegram Kanäle' },
  fr: { gl: 'fr', hl: 'fr', hint: 'chaînes Telegram' },
  it: { gl: 'it', hl: 'it', hint: 'canali Telegram' },
  pt: { gl: 'br', hl: 'pt', hint: 'canais Telegram' },
} as const;
type SearchLocale = keyof typeof SEARCH_LOCALES;

// Ads targeting requires public channel usernames; invitation URLs are not usable.
const RESERVED_PATHS = new Set(['joinchat','share','addstickers','addemoji','proxy','socks','iv','login','faq','blog','apps','contact','confirmphone','setlanguage']);
function publicChannelLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0]?.toLowerCase() === 's') parts.shift();
    if (parts.length !== 1) return null;
    const username = parts[0];
    if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) return null;
    if (RESERVED_PATHS.has(username.toLowerCase())) return null;
    return 'https://t.me/' + username;
  } catch { return null; }
}
function cleanPublicLinks(values: unknown[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const link = publicChannelLink(value);
    if (link) unique.set(link.toLowerCase(), link);
  }
  return Array.from(unique.values()).slice(0, 15);
}

type VerifiedChannel = { url: string; title: string; subscribers: number };

// Verify genuine broadcast channels through Telegram. A username alone may
// belong to a group, user or an unrelated channel with fewer than 1000 members.
async function verifyChannels(candidates: string[]): Promise<VerifiedChannel[]> {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const session = process.env.TELEGRAM_SESSION || '';
  if (!apiId || !apiHash || !session) {
    throw new Error('Для проверки каналов нужны TELEGRAM_API_ID, TELEGRAM_API_HASH и TELEGRAM_SESSION');
  }
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 });
  const verified: VerifiedChannel[] = [];
  try {
    await client.connect();
    for (const url of candidates.slice(0, 15)) {
      try {
        const entity = await client.getEntity(url.replace('https://t.me/', ''));
        if (!(entity instanceof Api.Channel) || !entity.broadcast) continue;
        const info = await client.invoke(new Api.channels.GetFullChannel({ channel: entity }));
        const subscribers = Number((info.fullChat instanceof Api.ChannelFull ? info.fullChat.participantsCount : 0) || entity.participantsCount || 0);
        if (!Number.isFinite(subscribers) || subscribers < 1000) continue;
        verified.push({ url, title: entity.title || url, subscribers });
        if (verified.length >= 6) break;
      } catch (error) {
        console.warn('Не удалось проверить Telegram-канал:', url, error instanceof Error ? error.message : String(error));
      }
    }
  } finally {
    await client.disconnect();
  }
  return verified;
}

// Сохраняем только адреса публичных каналов, без invite-ссылок.
async function saveFoundChannels(links: string[]) {
  const unique = new Map<string, string>();
  for (const link of links) {
    const normalized = publicChannelLink(link);
    if (!normalized) continue;
    const username = normalized.slice('https://t.me/'.length);
    unique.set(username.toLowerCase(), username);
  }
  let savedCount = 0;
  const saveErrors: string[] = [];
  for (const username of Array.from(unique.values())) {
    const url = 'https://t.me/' + username;
    try {
      await prisma.lead.upsert({
        where: { url },
        update: { platform: 'TELEGRAM' },
        create: { name: username, url, platform: 'TELEGRAM' },
      });
      savedCount++;
    } catch (error) {
      console.error('Ошибка сохранения Telegram-адреса:', url, error);
      saveErrors.push(url);
    }
  }
  return { savedCount, saveErrors };
}


export async function POST(request: Request) {
  try {
    const { prompt, mode, language = 'ru' } = await request.json();
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 250)
      return NextResponse.json({ error: 'Введите тему поиска (до 250 символов)' }, { status: 400 });
    if (!Object.prototype.hasOwnProperty.call(SEARCH_LOCALES, language))
      return NextResponse.json({ error: 'Неизвестный язык поиска' }, { status: 400 });
    const locale = SEARCH_LOCALES[language as SearchLocale];

    // === РЕЖИМ 1: GOOGLE-ШПИОН ===
    if (mode === 1) {
      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      if (!SERPER_API_KEY) throw new Error('В Vercel не настроен SERPER_API_KEY');

      // ИСПРАВЛЕНИЕ: Убрали оператор site:, из-за которого блокировал бесплатный тариф.
      // Теперь Гугл видит это как обычный человеческий запрос.
      const searchQuery = `${prompt.trim()} ${locale.hint} t.me`;
      
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, gl: locale.gl, hl: locale.hl, num: 30 })
      });
      const data = await res.json();

      if (!data.organic) {
        throw new Error(`Сбой Google Serper. Ответ сервера: ${JSON.stringify(data)}`);
      }

      const channels = await verifyChannels(cleanPublicLinks(data.organic.map((item: any) => item.link)));
      const links = channels.map(channel => channel.url);
      return NextResponse.json({ links, channels, language, minSubscribers: 1000, ...(await saveFoundChannels(links)) });
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

      const channels = await verifyChannels(cleanPublicLinks(data.response.items.map((channel: any) => channel.link)));
      const links = channels.map(channel => channel.url);
      return NextResponse.json({ links, channels, minSubscribers: 1000, ...(await saveFoundChannels(links)) });
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

      const channels = await verifyChannels(cleanPublicLinks(Array.from(foundLinks)));
      const links = channels.map(channel => channel.url);
      return NextResponse.json({ links, channels, minSubscribers: 1000, ...(await saveFoundChannels(links)) });
    }

    return NextResponse.json({ error: 'Неизвестный режим' }, { status: 400 });

  } catch (error: any) {
    console.error('Ошибка поисковика:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
