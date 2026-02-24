import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, start_date = null, end_date = null, status = 'active' } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const result = await db.execute({
      sql: 'UPDATE sprints SET name=?, start_date=?, end_date=?, status=? WHERE id=? RETURNING *',
      args: [name, start_date, end_date, status, parseInt(id)],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/sprints/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}
