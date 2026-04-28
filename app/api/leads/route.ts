import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic'; // Запрещаем кэширование, чтобы видеть новые лиды сразу

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' } // Новые лиды будут в самом верху
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Ошибка API при получении лидов:", error);
    return NextResponse.json({ error: "Ошибка базы данных" }, { status: 500 });
  }
}
