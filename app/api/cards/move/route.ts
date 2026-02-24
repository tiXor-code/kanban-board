import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { card_id, column_id, position } = await req.json();
    if (!card_id || column_id === undefined) {
      return NextResponse.json({ error: 'card_id and column_id required' }, { status: 400 });
    }

    const now = Date.now() / 1000;

    // Get all cards in target column excluding the moved card
    const colCardsRes = await db.execute({
      sql: 'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC',
      args: [column_id, card_id],
    });

    const cardIds = colCardsRes.rows.map((r) => r.id as number);
    const insertPos = typeof position === 'number' ? Math.min(position, cardIds.length) : cardIds.length;
    cardIds.splice(insertPos, 0, card_id);

    // Update all positions
    for (let i = 0; i < cardIds.length; i++) {
      await db.execute({
        sql: 'UPDATE cards SET column_id = ?, position = ?, updated_at = ? WHERE id = ?',
        args: [column_id, i, now, cardIds[i]],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/cards/move error:', err);
    return NextResponse.json({ error: 'Failed to move card' }, { status: 500 });
  }
}
