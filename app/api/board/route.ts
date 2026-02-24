import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const columnsRes = await db.execute(
      'SELECT * FROM columns ORDER BY position ASC'
    );
    const cardsRes = await db.execute(
      'SELECT * FROM cards ORDER BY position ASC'
    );

    const columns = columnsRes.rows.map((col) => {
      const cards = cardsRes.rows
        .filter((c) => c.column_id === col.id)
        .map((c) => ({
          ...c,
          labels: (() => {
            try { return JSON.parse(c.labels as string || '[]'); } catch { return []; }
          })(),
        }));
      return { ...col, cards };
    });

    return NextResponse.json(columns);
  } catch (err) {
    console.error('GET /api/board error:', err);
    return NextResponse.json({ error: 'Failed to load board' }, { status: 500 });
  }
}
