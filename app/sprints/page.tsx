'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Sprint {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface Card {
  id: number;
  column_id: number;
  title: string;
  description: string;
  labels: string[];
  assignee: string | null;
  priority: string | null;
  sprint_id: number | null;
  hours: number;
}

interface Column {
  id: number;
  title: string;
  position: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  Must: '#ef4444',
  Should: '#f97316',
  Could: '#eab308',
  Wont: '#6b7280',
};

const ASSIGNEE_COLORS: Record<string, string> = {
  Teodor: '#6366f1',
  Eduard: '#10b981',
  John: '#f59e0b',
};

export default function SprintPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [sprintsRes, cardsRes, colsRes] = await Promise.all([
      fetch('/api/sprints').then(r => r.json()),
      fetch('/api/cards').then(r => r.json()),
      fetch('/api/columns').then(r => r.json()),
    ]);
    setSprints(sprintsRes);
    setCards(cardsRes);
    setColumns(colsRes.sort((a: Column, b: Column) => a.position - b.position));
    const active = sprintsRes.find((s: Sprint) => s.status === 'active') || sprintsRes[0] || null;
    setActiveSprint(active);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createSprint() {
    if (!newSprint.name.trim()) return;
    setSaving(true);
    await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSprint),
    });
    setNewSprint({ name: '', start_date: '', end_date: '' });
    setShowNewSprint(false);
    setSaving(false);
    load();
  }

  async function setSprintActive(sprint: Sprint) {
    await fetch(`/api/sprints/${sprint.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sprint, status: 'active' }),
    });
    // Deactivate others
    for (const s of sprints) {
      if (s.id !== sprint.id && s.status === 'active') {
        await fetch(`/api/sprints/${s.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...s, status: 'closed' }),
        });
      }
    }
    load();
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-dim)' }}>
        Loading sprint…
      </div>
    );
  }

  const sprintCards = activeSprint ? cards.filter(c => c.sprint_id === activeSprint.id) : [];
  const doneColId = columns.find(c => c.title === 'Done')?.id;
  const doneCards = sprintCards.filter(c => c.column_id === doneColId);
  const progress = sprintCards.length > 0 ? Math.round((doneCards.length / sprintCards.length) * 100) : 0;

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 24px 40px', fontFamily: 'var(--font-geist-mono, monospace)' }}>

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 12, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← BOARD
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ⚡ Sprint
          </span>
        </div>

        {/* Active Sprint Header */}
        {activeSprint ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                    Active Sprint
                  </span>
                </div>
                <h1 style={{ margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {activeSprint.name}
                </h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-dim)', fontSize: 12 }}>
                  {formatDate(activeSprint.start_date)} → {formatDate(activeSprint.end_date)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                  {doneCards.length}<span style={{ color: 'var(--text-dim)', fontSize: 14 }}>/{sprintCards.length}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>tasks done</div>
                <div style={{ width: 120, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{progress}% complete</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)', border: '1px dashed var(--border)', borderRadius: 12, marginBottom: 32 }}>
            No active sprint. Create one below.
          </div>
        )}

        {/* Sprint board columns */}
        {activeSprint && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
            {columns.map(col => {
              const colCards = sprintCards.filter(c => c.column_id === col.id);
              return (
                <div key={col.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                      {col.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      {colCards.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colCards.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '12px 0', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                        Empty
                      </div>
                    ) : colCards.map(card => (
                      <div key={card.id} style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, marginBottom: 8 }}>
                          {card.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {card.priority && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLORS[card.priority] || '#6b7280', background: `${PRIORITY_COLORS[card.priority] || '#6b7280'}18`, padding: '1px 6px', borderRadius: 4 }}>
                              {card.priority}
                            </span>
                          )}
                          {card.assignee && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: ASSIGNEE_COLORS[card.assignee] || '#9ca3af', background: `${ASSIGNEE_COLORS[card.assignee] || '#9ca3af'}18`, padding: '1px 6px', borderRadius: 4 }}>
                              {card.assignee}
                            </span>
                          )}
                          {card.labels?.length > 0 && card.labels.map(l => (
                            <span key={l} style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sprint List + Create */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              All Sprints
            </span>
            <button
              onClick={() => setShowNewSprint(!showNewSprint)}
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase' }}
            >
              + New Sprint
            </button>
          </div>

          {showNewSprint && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
                <input
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Sprint 2 - March 9"
                  value={newSprint.name}
                  onChange={e => setNewSprint(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div style={{ flex: '0 0 130px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Start</label>
                <input type="date" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  value={newSprint.start_date} onChange={e => setNewSprint(s => ({ ...s, start_date: e.target.value }))} />
              </div>
              <div style={{ flex: '0 0 130px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>End</label>
                <input type="date" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  value={newSprint.end_date} onChange={e => setNewSprint(s => ({ ...s, end_date: e.target.value }))} />
              </div>
              <button
                onClick={createSprint}
                disabled={saving || !newSprint.name.trim()}
                style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sprints.map(sprint => {
              const sCards = cards.filter(c => c.sprint_id === sprint.id);
              const sDone = doneColId ? sCards.filter(c => c.column_id === doneColId).length : 0;
              const isActive = sprint.status === 'active';
              return (
                <div key={sprint.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: isActive ? 'rgba(99,102,241,0.05)' : 'var(--surface)',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '10px 16px', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isActive && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em' }}>ACTIVE</span>}
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isActive ? 600 : 400 }}>{sprint.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sDone}/{sCards.length} done</span>
                    {!isActive && (
                      <button
                        onClick={() => setSprintActive(sprint)}
                        style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-syne)', textTransform: 'uppercase' }}
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
