import { NextResponse } from 'next/server';
import { client } from '../../../../lib/telegram-client';
import { Api } from 'telegram';

export async function POST(request: Request) {
  try {
    const { phoneNumber, code, phoneCodeHash } = await request.json();

    if (!client.connected) {
      await client.connect();
    }

    // Завершаем авторизацию через прямое обращение к API Telegram
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    // Генерируем ту самую строку сессии, которую нужно будет сохранить в Vercel
    const sessionString = client.session.save() as unknown as string;

    return NextResponse.json({ success: true, session: sessionString });
  } catch (error: any) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
