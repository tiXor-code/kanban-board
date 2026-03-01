import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/cards/[id]/dependencies — returns { blockedBy: Card[], blocking: Card[] }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cardId = parseInt(id);

    // Cards this card depends on (blockers)
    const blockedByRes = await db.execute({
      sql: `SELECT c.* FROM cards c
            JOIN card_dependencies d ON c.id = d.depends_on_id
            WHERE d.card_id = ?`,
      args: [cardId],
    });

    // Cards that depend on this card (this is a blocker for them)
    const blockingRes = await db.execute({
      sql: `SELECT c.* FROM cards c
            JOIN card_dependencies d ON c.id = d.card_id
            WHERE d.depends_on_id = ?`,
      args: [cardId],
    });

    return NextResponse.json({
      blockedBy: blockedByRes.rows,
      blocking: blockingRes.rows,
    });
  } catch (err) {
    console.error('GET dependencies error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST /api/cards/[id]/dependencies — add dependency { depends_on_id }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { depends_on_id } = await req.json();
    const cardId = parseInt(id);

    if (cardId === depends_on_id) {
      return NextResponse.json({ error: 'A card cannot depend on itself' }, { status: 400 });
    }

    await db.execute({
      sql: 'INSERT OR IGNORE INTO card_dependencies (card_id, depends_on_id, created_at) VALUES (?, ?, ?)',
      args: [cardId, depends_on_id, Date.now() / 1000],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST dependency error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/cards/[id]/dependencies — remove dependency { depends_on_id }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { depends_on_id } = await req.json();
    await db.execute({
      sql: 'DELETE FROM card_dependencies WHERE card_id = ? AND depends_on_id = ?',
      args: [parseInt(id), depends_on_id],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE dependency error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
