import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description = '', labels = [], due_date = null, hours = 0, assignee = null, priority = null, sprint_id = null } = body;

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const now = Date.now() / 1000;
    const result = await db.execute({
      sql: `UPDATE cards SET title=?, description=?, labels=?, due_date=?, hours=?, assignee=?, priority=?, sprint_id=?, updated_at=?
            WHERE id=? RETURNING *`,
      args: [title, description, JSON.stringify(labels), due_date, hours, assignee, priority, sprint_id, now, parseInt(id)],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      labels: (() => { try { return JSON.parse(row.labels as string || '[]'); } catch { return []; } })(),
    });
  } catch (err) {
    console.error('PUT /api/cards/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM cards WHERE id = ?', args: [parseInt(id)] });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/cards/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
