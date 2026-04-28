import { NextResponse } from 'next/server';
import { client } from '../../../lib/telegram-client';

export async function POST(request: Request) {
  try {
    const { phoneNumber, code, phoneCodeHash } = await request.json();

    if (!client.connected) {
      await client.connect();
    }

    // Завершаем авторизацию
    await client.signIn({
      phoneNumber,
      phoneCodeHash,
      phoneCode: code,
      onError: (err) => { throw err; },
    });

    // Генерируем ту самую строку сессии, которую нужно будет сохранить в Vercel
    const sessionString = client.session.save();

    return NextResponse.json({ success: true, session: sessionString });
  } catch (error: any) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
