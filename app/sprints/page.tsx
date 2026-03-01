'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Sprint { id: number; name: string; start_date: string | null; end_date: string | null; status: string; }
interface Epic { id: number; title: string; color: string; description: string; }
interface Card { id: number; column_id: number; title: string; description: string; labels: string[]; assignee: string | null; priority: string | null; sprint_id: number | null; hours: number; progress: number; epic_id: number | null; due_date: string | null; }
interface Column { id: number; title: string; position: number; }
interface Comment { id: number; card_id: number; author: string; body: string; created_at: number; }

const PRIORITY_COLORS: Record<string, string> = { Must: '#ef4444', Should: '#f97316', Could: '#eab308', Wont: '#6b7280' };
const ASSIGNEE_COLORS: Record<string, string> = { Teodor: '#6366f1', Eduard: '#10b981', John: '#f59e0b', Mozi: '#ec4899' };
const ASSIGNEES = ['Teodor', 'Eduard', 'John', 'Mozi'];

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function timeAgo(ts: number) {
  const diff = (Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Card Detail Modal ─────────────────────────────────────────────────────────

function CardDetailModal({ card, columns, sprints, epics, onClose, onSave }: {
  card: Card;
  columns: Column[];
  sprints: Sprint[];
  epics: Epic[];
  onClose: () => void;
  onSave: (updated: Partial<Card>) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...card, progress: card.progress ?? 0 });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Teodor');
  const [saving, setSaving] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [showNewEpic, setShowNewEpic] = useState(false);
  const [newEpic, setNewEpic] = useState({ title: '', color: '#6366f1' });

  useEffect(() => {
    fetch(`/api/cards/${card.id}/comments`).then(r => r.json()).then(setComments);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [card.id, onClose]);

  async function handleSave() {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/cards/${card.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: commentAuthor, body: newComment.trim() }),
    });
    const comment = await res.json();
    setComments(c => [...c, comment]);
    setNewComment('');
    setPostingComment(false);
  }

  async function createEpicAndAssign() {
    if (!newEpic.title.trim()) return;
    const res = await fetch('/api/epics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEpic),
    });
    const epic = await res.json();
    setForm(f => ({ ...f, epic_id: epic.id }));
    setShowNewEpic(false);
    setNewEpic({ title: '', color: '#6366f1' });
  }

  const currentEpic = epics.find(e => e.id === form.epic_id);
  const colName = columns.find(c => c.id === card.column_id)?.title || '—';

  const inp = (style?: object) => ({
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    ...style,
  });

  const label = (text: string) => (
    <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 5, fontFamily: 'var(--font-syne)' }}>
      {text}
    </label>
  );

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 680, position: 'relative' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{colName}</span>
            {currentEpic && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${currentEpic.color}22`, color: currentEpic.color }}>
                ◆ {currentEpic.title}
              </span>
            )}
          </div>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ ...inp(), fontSize: 17, fontWeight: 700, background: 'transparent', border: 'none', padding: '0', letterSpacing: '-0.01em', color: 'var(--text)' }}
          />
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'flex', gap: 24 }}>
          {/* Left: main content */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Description */}
            <div>
              {label('Description')}
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Add a description..."
                style={{ ...inp(), resize: 'vertical' as const, lineHeight: 1.6 }}
              />
            </div>

            {/* Progress */}
            <div>
              {label(`Progress — ${form.progress ?? 0}%`)}
              <input
                type="range" min={0} max={100} step={5}
                value={form.progress ?? 0}
                onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${form.progress ?? 0}%`, height: '100%', background: (form.progress ?? 0) === 100 ? '#10b981' : 'var(--accent)', borderRadius: 3, transition: 'width 0.2s' }} />
              </div>
            </div>

            {/* Comments */}
            <div>
              {label('Comments')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {comments.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>No comments yet.</div>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ASSIGNEE_COLORS[c.author] || 'var(--accent)' }}>{c.author}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.body}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <select value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} style={{ ...inp({ width: 'auto', flex: '0 0 auto' }) }}>
                  {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
                </select>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment(); }}
                  rows={2}
                  placeholder="Write a comment... (Ctrl+Enter to post)"
                  style={{ ...inp({ flex: 1 }), resize: 'none' as const }}
                />
                <button
                  onClick={postComment}
                  disabled={postingComment || !newComment.trim()}
                  style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, opacity: postingComment ? 0.6 : 1 }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Right: sidebar fields */}
          <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Assignee */}
            <div>
              {label('Assignee')}
              <select value={form.assignee || ''} onChange={e => setForm(f => ({ ...f, assignee: e.target.value || null }))} style={inp()}>
                <option value="">Unassigned</option>
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
              {form.assignee && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ASSIGNEE_COLORS[form.assignee] || '#888' }} />
                  <span style={{ fontSize: 11, color: ASSIGNEE_COLORS[form.assignee] || 'var(--text)' }}>{form.assignee}</span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              {label('Priority')}
              <select value={form.priority || ''} onChange={e => setForm(f => ({ ...f, priority: e.target.value || null }))} style={inp()}>
                <option value="">None</option>
                <option value="Must">Must Have</option>
                <option value="Should">Should Have</option>
                <option value="Could">Could Have</option>
                <option value="Wont">Won&apos;t Have</option>
              </select>
            </div>

            {/* Sprint */}
            <div>
              {label('Sprint')}
              <select value={form.sprint_id || ''} onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value ? parseInt(e.target.value) : null }))} style={inp()}>
                <option value="">No Sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Hours */}
            <div>
              {label('Hours')}
              <input type="number" min={0} step={0.5} value={form.hours || 0} onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))} style={inp()} />
            </div>

            {/* Due Date */}
            <div>
              {label('Due Date')}
              <input type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value || null }))} style={inp()} />
            </div>

            {/* Epic */}
            <div>
              {label('Epic')}
              {currentEpic ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: currentEpic.color }}>◆ {currentEpic.title}</span>
                  <button onClick={() => setForm(f => ({ ...f, epic_id: null }))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ) : (
                <select value={form.epic_id || ''} onChange={e => setForm(f => ({ ...f, epic_id: e.target.value ? parseInt(e.target.value) : null }))} style={inp()}>
                  <option value="">No Epic</option>
                  {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                </select>
              )}
              <button onClick={() => setShowNewEpic(!showNewEpic)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11, padding: '4px 0', display: 'block' }}>
                + New Epic
              </button>
              {showNewEpic && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input placeholder="Epic name" value={newEpic.title} onChange={e => setNewEpic(n => ({ ...n, title: e.target.value }))} style={inp({ fontSize: 12 })} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['#6366f1','#10b981','#f59e0b','#ec4899','#ef4444'].map(c => (
                      <div key={c} onClick={() => setNewEpic(n => ({ ...n, color: c }))} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: newEpic.color === c ? '2px solid white' : '2px solid transparent' }} />
                    ))}
                  </div>
                  <button onClick={createEpicAndAssign} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Create & Assign
                  </button>
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-syne)', opacity: saving ? 0.6 : 1, marginTop: 4 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sprint Page ──────────────────────────────────────────────────────────

export default function SprintPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const load = useCallback(async () => {
    const [sprintsRes, cardsRes, colsRes, epicsRes] = await Promise.all([
      fetch('/api/sprints').then(r => r.json()),
      fetch('/api/cards').then(r => r.json()),
      fetch('/api/columns').then(r => r.json()),
      fetch('/api/epics').then(r => r.json()),
    ]);
    setSprints(sprintsRes);
    setCards(cardsRes);
    setColumns(colsRes.sort((a: Column, b: Column) => a.position - b.position));
    setEpics(epicsRes);
    const active = sprintsRes.find((s: Sprint) => s.status === 'active') || sprintsRes[0] || null;
    setActiveSprint(active);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
    for (const s of sprints) {
      if (s.status === 'active') {
        await fetch(`/api/sprints/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, status: 'closed' }) });
      }
    }
    await fetch(`/api/sprints/${sprint.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sprint, status: 'active' }) });
    load();
  }

  async function saveCard(updated: Partial<Card>) {
    if (!selectedCard) return;
    const res = await fetch(`/api/cards/${selectedCard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selectedCard, ...updated }),
    });
    const saved = await res.json();
    setCards(cs => cs.map(c => c.id === saved.id ? saved : c));
    setSelectedCard(null);
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-dim)' }}>Loading…</div>;
  }

  const sprintCards = activeSprint ? cards.filter(c => c.sprint_id === activeSprint.id) : [];
  const doneColId = columns.find(c => c.title === 'Done')?.id;
  const doneCards = sprintCards.filter(c => c.column_id === doneColId);
  const progress = sprintCards.length > 0 ? Math.round((doneCards.length / sprintCards.length) * 100) : 0;

  // Rename "Backlog" → "To-do" for sprint view
  const sprintColumns = columns.map(c => ({ ...c, title: c.title === 'Backlog' ? 'To-do' : c.title }));

  const inp = (style?: object) => ({
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const, ...style,
  });

  return (
    <>
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          columns={columns}
          sprints={sprints}
          epics={epics}
          onClose={() => setSelectedCard(null)}
          onSave={saveCard}
        />
      )}

      <div style={{ minHeight: '100vh', overflowY: 'auto', background: 'var(--bg)', padding: '80px 24px 60px', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Header */}
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
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Active Sprint</span>
                  </div>
                  <h1 style={{ margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {activeSprint.name}
                  </h1>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-dim)', fontSize: 12 }}>
                    {formatDate(activeSprint.start_date)} → {formatDate(activeSprint.end_date)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                    {doneCards.length}<span style={{ color: 'var(--text-dim)', fontSize: 15 }}>/{sprintCards.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>tasks done</div>
                  <div style={{ width: 140, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
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
              {sprintColumns.map(col => {
                const origCol = columns.find(c => c.id === col.id)!;
                const colCards = sprintCards.filter(c => c.column_id === origCol.id);
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
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '12px 0', textAlign: 'center', borderTop: '1px solid var(--border)' }}>Empty</div>
                      ) : colCards.map(card => {
                        const epic = epics.find(e => e.id === card.epic_id);
                        return (
                          <div
                            key={card.id}
                            onClick={() => setSelectedCard(card)}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                          >
                            {epic && (
                              <div style={{ fontSize: 10, color: epic.color, fontWeight: 700, marginBottom: 5 }}>◆ {epic.title}</div>
                            )}
                            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, marginBottom: 8 }}>{card.title}</div>

                            {/* Progress bar */}
                            {(card.progress ?? 0) > 0 && (
                              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                                <div style={{ width: `${card.progress}%`, height: '100%', background: card.progress === 100 ? '#10b981' : 'var(--accent)', borderRadius: 2 }} />
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
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
                              {(card.progress ?? 0) > 0 && (
                                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{card.progress}%</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sprint List + Create */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>All Sprints</span>
              <button onClick={() => setShowNewSprint(!showNewSprint)} style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase' }}>
                + New Sprint
              </button>
            </div>

            {showNewSprint && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
                  <input style={{ ...inp({ width: '100%' }) }} placeholder="Sprint 2 - March 9" value={newSprint.name} onChange={e => setNewSprint(s => ({ ...s, name: e.target.value }))} />
                </div>
                <div style={{ flex: '0 0 130px' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Start</label>
                  <input type="date" style={{ ...inp({ width: '100%' }) }} value={newSprint.start_date} onChange={e => setNewSprint(s => ({ ...s, start_date: e.target.value }))} />
                </div>
                <div style={{ flex: '0 0 130px' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>End</label>
                  <input type="date" style={{ ...inp({ width: '100%' }) }} value={newSprint.end_date} onChange={e => setNewSprint(s => ({ ...s, end_date: e.target.value }))} />
                </div>
                <button onClick={createSprint} disabled={saving || !newSprint.name.trim()} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1 }}>
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
                  <div key={sprint.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isActive ? 'rgba(99,102,241,0.05)' : 'var(--surface)', border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 16px', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isActive && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em' }}>ACTIVE</span>}
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isActive ? 600 : 400 }}>{sprint.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sDone}/{sCards.length} done</span>
                      {!isActive && (
                        <button onClick={() => setSprintActive(sprint)} style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-syne)', textTransform: 'uppercase' }}>
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
    </>
  );
}
