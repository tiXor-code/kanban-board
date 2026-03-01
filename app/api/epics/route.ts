import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM epics ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/epics error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, color = '#6366f1', description = '' } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const now = Date.now() / 1000;
    const result = await db.execute({
      sql: 'INSERT INTO epics (title, color, description, status, created_at) VALUES (?,?,?,?,?) RETURNING *',
      args: [title, color, description, 'active', now],
    });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/epics error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
