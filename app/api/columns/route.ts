import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM columns ORDER BY position');
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/columns error:', err);
    return NextResponse.json({ error: 'Failed to fetch columns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, color = '#6366f1' } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const posRes = await db.execute('SELECT COALESCE(MAX(position), -1) as maxpos FROM columns');
    const maxPos = (posRes.rows[0].maxpos as number) ?? -1;

    const result = await db.execute({
      sql: 'INSERT INTO columns (title, color, position) VALUES (?, ?, ?) RETURNING *',
      args: [title, color, maxPos + 1],
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/columns error:', err);
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 });
  }
}
