import { NextResponse } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    // Создаем свежий клиент с пустой сессией
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    // Запрашиваем код
    const { phoneCodeHash } = await client.sendCode(
      { apiId, apiHash },
      phoneNumber
    );

    // СОХРАНЯЕМ "память" (временную сессию) этого подключения
    const tempSession = client.session.save() as unknown as string;

    return NextResponse.json({ success: true, phoneCodeHash, tempSession });
  } catch (error: any) {
    console.error('Ошибка отправки кода:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
