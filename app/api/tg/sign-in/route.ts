import { NextResponse } from 'next/server';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

export async function POST(request: Request) {
  try {
    const { phoneNumber, code, phoneCodeHash, tempSession } = await request.json();
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';

    // Восстанавливаем подключение из переданной "памяти" (tempSession)
    const client = new TelegramClient(new StringSession(tempSession), apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    // Завершаем авторизацию
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    // Генерируем финальную, постоянную сессию
    const sessionString = client.session.save() as unknown as string;

    return NextResponse.json({ success: true, session: sessionString });
  } catch (error: any) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
