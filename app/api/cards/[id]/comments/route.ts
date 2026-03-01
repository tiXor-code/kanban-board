import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: 'SELECT * FROM card_comments WHERE card_id=? ORDER BY created_at ASC',
      args: [parseInt(id)],
    });
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { author, body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 });
    const now = Date.now() / 1000;
    const result = await db.execute({
      sql: 'INSERT INTO card_comments (card_id, author, body, created_at) VALUES (?,?,?,?) RETURNING *',
      args: [parseInt(id), author || 'Anonymous', body.trim(), now],
    });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
