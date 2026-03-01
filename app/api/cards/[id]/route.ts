import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function parseAssignees(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [p]; } catch { return raw ? [raw] : []; }
  }
  return [];
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Fetch current card first
    const cur = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [parseInt(id)] });
    if (cur.rows.length === 0) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const current = cur.rows[0];

    // Merge: only update fields that were provided
    const title = 'title' in body ? body.title : current.title;
    const description = 'description' in body ? body.description : current.description;
    const labels = 'labels' in body ? JSON.stringify(body.labels) : current.labels;
    const due_date = 'due_date' in body ? body.due_date : current.due_date;
    const hours = 'hours' in body ? body.hours : current.hours;
    const assignees = 'assignees' in body ? JSON.stringify(body.assignees) : current.assignee;
    const priority = 'priority' in body ? body.priority : current.priority;
    const sprint_id = 'sprint_id' in body ? body.sprint_id : current.sprint_id;
    const progress = 'progress' in body ? body.progress : (current.progress ?? 0);
    const epic_id = 'epic_id' in body ? body.epic_id : current.epic_id;
    const column_id = 'column_id' in body ? body.column_id : current.column_id;
    const now = Date.now() / 1000;

    const result = await db.execute({
      sql: `UPDATE cards SET title=?, description=?, labels=?, due_date=?, hours=?, assignee=?, priority=?, sprint_id=?, progress=?, epic_id=?, column_id=?, updated_at=?
            WHERE id=? RETURNING *`,
      args: [title, description, labels, due_date, hours, assignees, priority, sprint_id, progress, epic_id ?? null, column_id, now, parseInt(id)],
    });

    const row = result.rows[0];
    return NextResponse.json({
      ...row,
      labels: (() => { try { return JSON.parse(row.labels as string || '[]'); } catch { return []; } })(),
      assignees: parseAssignees(row.assignee),
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
