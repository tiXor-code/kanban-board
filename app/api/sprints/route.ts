import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Ensure sprints table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        created_at REAL NOT NULL
      )
    `);

    const result = await db.execute('SELECT * FROM sprints ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/sprints error:', err);
    return NextResponse.json({ error: 'Failed to load sprints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, start_date = null, end_date = null, status = 'active' } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const now = Date.now() / 1000;
    const result = await db.execute({
      sql: 'INSERT INTO sprints (name, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *',
      args: [name, start_date, end_date, status, now],
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/sprints error:', err);
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
  }
}
