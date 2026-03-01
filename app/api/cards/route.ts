import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM cards ORDER BY column_id, position');
    const cards = result.rows.map(r => ({
      ...r,
      labels: (() => { try { return JSON.parse(r.labels as string); } catch { return []; } })(),
    }));
    return NextResponse.json(cards);
  } catch (err) {
    console.error('GET /api/cards error:', err);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { column_id, title, description = '', labels = [], due_date = null, hours = 0, assignee = null, priority = null, sprint_id = null } = body;

    if (!column_id || !title) {
      return NextResponse.json({ error: 'column_id and title required' }, { status: 400 });
    }

    const posRes = await db.execute({
      sql: 'SELECT COALESCE(MAX(position), -1) as maxpos FROM cards WHERE column_id = ?',
      args: [column_id],
    });
    const maxPos = (posRes.rows[0].maxpos as number) ?? -1;
    const now = Date.now() / 1000;

    const result = await db.execute({
      sql: `INSERT INTO cards 
        (column_id, title, description, labels, due_date, position, created_at, updated_at, hours, assignee, priority, sprint_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        column_id, title, description,
        JSON.stringify(labels), due_date, maxPos + 1,
        now, now, hours, assignee, priority, sprint_id,
      ],
    });

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      labels: (() => { try { return JSON.parse(row.labels as string || '[]'); } catch { return []; } })(),
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/cards error:', err);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
