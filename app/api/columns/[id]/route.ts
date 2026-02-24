import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, color } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const result = await db.execute({
      sql: 'UPDATE columns SET title = ?, color = ? WHERE id = ? RETURNING *',
      args: [title, color || '#6366f1', parseInt(id)],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/columns/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const colId = parseInt(id);

    await db.execute({ sql: 'DELETE FROM cards WHERE column_id = ?', args: [colId] });
    await db.execute({ sql: 'DELETE FROM columns WHERE id = ?', args: [colId] });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/columns/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 });
  }
}
