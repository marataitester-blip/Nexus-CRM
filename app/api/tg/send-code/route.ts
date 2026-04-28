import { NextResponse } from 'next/server';
import { client } from '../../../../lib/telegram-client';

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();
    
    if (!client.connected) {
      await client.connect();
    }

    // Запрашиваем код у Telegram. 
    const { phoneCodeHash } = await client.sendCode(
      {
        apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
        apiHash: process.env.TELEGRAM_API_HASH || '',
      },
      phoneNumber
    );

    return NextResponse.json({ success: true, phoneCodeHash });
  } catch (error: any) {
    console.error('Ошибка отправки кода:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
