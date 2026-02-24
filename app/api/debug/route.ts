import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const result = await db.execute('SELECT 1 as ok');
    return NextResponse.json({ 
      ok: true, 
      result: result.rows,
      env: {
        url: process.env.TURSO_DB_URL?.slice(0, 30) + '...',
        token: process.env.TURSO_DB_TOKEN ? 'SET' : 'NOT SET',
      }
    });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ 
      ok: false, 
      error: e.message, 
      stack: e.stack?.slice(0, 500),
      env: {
        url: process.env.TURSO_DB_URL?.slice(0, 30) || 'NOT SET',
        token: process.env.TURSO_DB_TOKEN ? 'SET' : 'NOT SET',
      }
    }, { status: 500 });
  }
}
