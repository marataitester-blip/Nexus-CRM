import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

// Получаем ключи из безопасного окружения Vercel
const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';
const sessionString = process.env.TELEGRAM_SESSION || '';

// Создаем пустую сессию. Позже мы запишем сюда уникальный ключ после ввода кода из СМС
const stringSession = new StringSession(sessionString);

// Инициализируем клиента
export const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Инженерная логика: мы пока только подключаемся к серверу, но не запрашиваем авторизацию,
// так как для авторизации нам потребуется отдельный веб-интерфейс
export async function initTelegram() {
  if (!client.connected) {
    await client.connect(); 
  }
  return client;
}
