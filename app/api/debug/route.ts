import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const result = await db.execute('SELECT 1 as ok');
    return NextResponse.json({ 
      ok: true, 
      result: result.rows,
      env: {
        url: process.env.TURSO_DB_URL,
        tokenLen: process.env.TURSO_DB_TOKEN?.length,
      }
    });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ 
      ok: false, 
      error: e.message, 
      stack: e.stack?.slice(0, 800),
      env: {
        url: JSON.stringify(process.env.TURSO_DB_URL),
        tokenLen: process.env.TURSO_DB_TOKEN?.length,
      }
    }, { status: 500 });
  }
}
