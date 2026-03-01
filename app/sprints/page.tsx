'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';

interface Sprint { id: number; name: string; start_date: string | null; end_date: string | null; status: string; }
interface Epic { id: number; title: string; color: string; description: string; }
interface Card { id: number; column_id: number; title: string; description: string; labels: string[]; assignees: string[]; priority: string | null; sprint_id: number | null; hours: number; progress: number; epic_id: number | null; due_date: string | null; }
interface Column { id: number; title: string; position: number; }
interface Comment { id: number; card_id: number; author: string; body: string; created_at: number; }

const PRIORITY_COLORS: Record<string, string> = { Must: '#ef4444', Should: '#f97316', Could: '#eab308', Wont: '#6b7280' };
const ASSIGNEE_COLORS: Record<string, string> = { Teodor: '#6366f1', Eduard: '#10b981', John: '#f59e0b', Mozi: '#ec4899' };
const ASSIGNEE_INITIALS: Record<string, string> = { Teodor: 'T', Eduard: 'E', John: 'J', Mozi: 'M' };
const ASSIGNEES = ['Teodor', 'Eduard', 'John', 'Mozi'];

// Sprint-only columns (map DB column names to sprint labels)
const SPRINT_COLUMN_MAP: Record<string, string> = {
  'Backlog': 'To-do',
  'In Progress': 'In Progress',
  'Review': 'Review',
  'Done': 'Done',
};

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

const inp = (extra: Record<string, unknown> = {}) => ({
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 12,
  padding: '6px 10px',
  outline: 'none',
  fontFamily: 'var(--font-geist-mono, monospace)',
  ...extra,
});

// ─── Card Detail Modal ──────────────────────────────────────────────────────

function CardDetailModal({ card, columns, sprints, epics, onClose, onSave, onEpicCreated }: {
  card: Card;
  columns: Column[];
  sprints: Sprint[];
  epics: Epic[];
  onClose: () => void;
  onSave: (updated: Partial<Card>) => Promise<void>;
  onEpicCreated: (epic: Epic) => void;
}) {
  const [form, setForm] = useState({ ...card, progress: card.progress ?? 0, assignees: card.assignees ?? [] });
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
    const created: Epic = await res.json();
    onEpicCreated(created);
    setForm(f => ({ ...f, epic_id: created.id }));
    setShowNewEpic(false);
    setNewEpic({ title: '', color: '#6366f1' });
  }

  const currentEpic = epics.find(e => e.id === form.epic_id);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', marginBottom: 40 }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {currentEpic && (
              <div style={{ fontSize: 10, color: currentEpic.color, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>◆ {currentEpic.title}</div>
            )}
            <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4 }}>{card.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', gap: 24 }}>
          {/* Left: progress, comments */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Comments */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Comments</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {comments.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>No comments yet</div>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ASSIGNEE_COLORS[c.author] || 'var(--accent)' }}>{c.author}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{c.body}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <select value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} style={{ ...inp({ width: 'auto', flex: '0 0 auto' }) }}>
                  {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <textarea
                  rows={2} placeholder="Add a comment…" value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ ...inp({ flex: 1 }), resize: 'none' as const }}
                />
                <button onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', opacity: postingComment ? 0.6 : 1 }}>
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Right: metadata */}
          <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Status */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Status</label>
              <select value={form.column_id} onChange={e => setForm(f => ({ ...f, column_id: +e.target.value }))} style={{ ...inp({ width: '100%' }) }}>
                {columns.map(c => <option key={c.id} value={c.id}>{SPRINT_COLUMN_MAP[c.title] || c.title}</option>)}
              </select>
            </div>

            {/* Assignees */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Assignees</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ASSIGNEES.map(a => {
                  const checked = form.assignees.includes(a);
                  return (
                    <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setForm(f => ({
                          ...f,
                          assignees: checked ? f.assignees.filter(x => x !== a) : [...f.assignees, a],
                        }))}
                        style={{ accentColor: ASSIGNEE_COLORS[a] || 'var(--accent)', width: 14, height: 14 }}
                      />
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: ASSIGNEE_COLORS[a] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {ASSIGNEE_INITIALS[a] || a[0]}
                      </div>
                      <span style={{ fontSize: 12, color: checked ? 'var(--text)' : 'var(--text-dim)' }}>{a}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hours */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Hours</label>
              <input type="number" min={0} step={0.5} value={form.hours ?? 0} onChange={e => setForm(f => ({ ...f, hours: +e.target.value }))} style={{ ...inp({ width: '100%' }) }} />
            </div>

            {/* Sprint */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Sprint</label>
              <select value={form.sprint_id ?? ''} onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value ? +e.target.value : null }))} style={{ ...inp({ width: '100%' }) }}>
                <option value="">No Sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Epic */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Epic</label>
              <select value={form.epic_id ?? ''} onChange={e => setForm(f => ({ ...f, epic_id: e.target.value ? +e.target.value : null }))} style={{ ...inp({ width: '100%' }) }}>
                <option value="">No Epic</option>
                {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              {!showNewEpic ? (
                <button onClick={() => setShowNewEpic(true)} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 10, cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}>+ New Epic</button>
              ) : (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input placeholder="Epic title" value={newEpic.title} onChange={e => setNewEpic(n => ({ ...n, title: e.target.value }))} style={{ ...inp({ width: '100%' }) }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="color" value={newEpic.color} onChange={e => setNewEpic(n => ({ ...n, color: e.target.value }))} style={{ width: 28, height: 28, padding: 2, border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: 'pointer' }} />
                    <button onClick={createEpicAndAssign} style={{ flex: 1, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Create</button>
                    <button onClick={() => setShowNewEpic(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', padding: '0 8px' }}>✕</button>
                  </div>
                </div>
              )}
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={saving} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'var(--font-syne)', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Add Card ──────────────────────────────────────────────────────────

function QuickAddCard({ colId, sprintId, onAdded }: { colId: number; sprintId: number; onAdded: (card: Card) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: colId, title: title.trim(), sprint_id: sprintId, assignees: [] }),
    });
    const card = await res.json();
    onAdded(card);
    setTitle('');
    setOpen(false);
    setSaving(false);
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{ width: '100%', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', textAlign: 'left', marginTop: 4 }}
    >
      + Add task
    </button>
  );

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 10px', marginTop: 4 }}>
      <textarea
        autoFocus
        rows={2}
        placeholder="Task title…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') { setOpen(false); setTitle(''); } }}
        style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-geist-mono, monospace)', resize: 'none', lineHeight: 1.4 }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button onClick={submit} disabled={!title.trim() || saving} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '…' : 'Add'}
        </button>
        <button onClick={() => { setOpen(false); setTitle(''); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 10px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Draggable Card ─────────────────────────────────────────────────────────

function DraggableCard({ card, epics, onClick }: { card: Card; epics: Epic[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `card-${card.id}` });
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CardChip card={card} epics={epics} onClick={onClick} />
    </div>
  );
}

// ─── Card Chip (shared between draggable + overlay) ─────────────────────────

function CardChip({ card, epics, onClick }: { card: Card; epics: Epic[]; onClick?: () => void }) {
  const epic = epics.find(e => e.id === card.epic_id);
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        userSelect: 'none',
      }}
    >
      {epic && (
        <div style={{ fontSize: 10, color: epic.color, fontWeight: 700, marginBottom: 5, letterSpacing: '0.06em' }}>◆ {epic.title}</div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, marginBottom: (card.assignees?.length ?? 0) > 0 ? 8 : 0 }}>{card.title}</div>
      {(card.assignees?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          {card.assignees.map(a => (
            <div key={a} title={a} style={{ width: 20, height: 20, borderRadius: '50%', background: ASSIGNEE_COLORS[a] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {ASSIGNEE_INITIALS[a] || a[0]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({ col, cards, epics, onCardClick, sprintId, onCardAdded }: {
  col: Column;
  cards: Card[];
  epics: Epic[];
  onCardClick: (card: Card) => void;
  sprintId: number;
  onCardAdded: (card: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.id}` });
  const label = SPRINT_COLUMN_MAP[col.title] || col.title;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 200, maxWidth: 340, height: '100%' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)' }}>
          {cards.length}
        </span>
      </div>

      {/* Cards container - scrollable */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '4px 2px 12px',
          borderTop: `2px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 2,
          transition: 'border-color 0.15s',
          minHeight: 60,
        }}
      >
        {cards.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '16px 0', textAlign: 'center' }}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
        {cards.map(card => (
          <DraggableCard
            key={card.id}
            card={card}
            epics={epics}
            onClick={() => onCardClick(card)}
          />
        ))}
        <QuickAddCard colId={col.id} sprintId={sprintId} onAdded={onCardAdded} />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    const [spRes, colRes, cardRes, epRes] = await Promise.all([
      fetch('/api/sprints'), fetch('/api/columns'), fetch('/api/cards'), fetch('/api/epics'),
    ]);
    const [spData, colData, cardData, epData] = await Promise.all([
      spRes.json(), colRes.json(), cardRes.json(), epRes.json(),
    ]);
    setSprints(spData);
    // Only keep the 4 sprint columns
    const filtered = (colData as Column[]).filter(c => Object.keys(SPRINT_COLUMN_MAP).includes(c.title));
    setColumns(filtered);
    setCards(cardData);
    setEpics(epData);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSprint = sprints.find(s => s.status === 'active');
  const sprintCards = activeSprint ? cards.filter(c => Number(c.sprint_id) === Number(activeSprint.id)) : [];
  const doneColId = columns.find(c => c.title === 'Done')?.id ?? null;

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const cardId = parseInt(String(active.id).replace('card-', ''));
    const colId = parseInt(String(over.id).replace('col-', ''));
    if (isNaN(cardId) || isNaN(colId)) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.column_id === colId) return;

    // Optimistic update
    setCards(cs => cs.map(c => c.id === cardId ? { ...c, column_id: colId } : c));

    // Persist
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: colId }),
    });

    // Update selected card if open
    if (selectedCard?.id === cardId) {
      setSelectedCard(sc => sc ? { ...sc, column_id: colId } : sc);
    }
  }

  async function updateCard(updated: Partial<Card>) {
    if (!selectedCard) return;
    const merged = { ...selectedCard, ...updated };
    setCards(cs => cs.map(c => c.id === selectedCard.id ? merged : c));
    setSelectedCard(merged);
    await fetch(`/api/cards/${selectedCard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  }

  async function createSprint() {
    if (!newSprint.name.trim()) return;
    setSaving(true);
    await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSprint),
    });
    await load();
    setNewSprint({ name: '', start_date: '', end_date: '' });
    setShowNewSprint(false);
    setSaving(false);
  }

  async function setSprintActive(sprint: Sprint) {
    await fetch(`/api/sprints/${sprint.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    await load();
  }

  if (!columns.length) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-dim)' }}>Loading…</div>;
  }

  const draggedCard = activeDragId ? cards.find(c => `card-${c.id}` === activeDragId) : null;

  return (
    <>
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          columns={columns}
          sprints={sprints}
          epics={epics}
          onClose={() => setSelectedCard(null)}
          onSave={updateCard}
          onEpicCreated={epic => setEpics(es => [...es, epic])}
        />
      )}

      {/* Full-height Jira-style layout */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: 'var(--font-geist-mono, monospace)' }}>

        {/* Top bar */}
        <div style={{ flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 12, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Board
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          {activeSprint ? (
            <>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{activeSprint.name}</span>
              <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{formatDate(activeSprint.start_date)} – {formatDate(activeSprint.end_date)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                {doneColId ? sprintCards.filter(c => c.column_id === doneColId).length : 0}/{sprintCards.length} done
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No active sprint</span>
          )}
        </div>

        {/* Board area */}
        {activeSprint ? (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ flex: 1, display: 'flex', gap: 16, padding: '20px 24px', overflow: 'hidden', minHeight: 0 }}>
              {columns.map(col => {
                const colCards = sprintCards.filter(c => c.column_id === col.id);
                return (
                  <DroppableColumn
                    key={col.id}
                    col={col}
                    cards={colCards}
                    epics={epics}
                    onCardClick={setSelectedCard}
                    sprintId={activeSprint.id}
                    onCardAdded={card => setCards(cs => [...cs, card])}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {draggedCard ? <CardChip card={draggedCard} epics={epics} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>No active sprint</div>
              <div style={{ fontSize: 12 }}>Create or activate a sprint below</div>
            </div>
          </div>
        )}

        {/* Sprints list footer - collapsible */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '16px 24px', maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>All Sprints</span>
            <button onClick={() => setShowNewSprint(!showNewSprint)} style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase' }}>
              + New Sprint
            </button>
          </div>

          {showNewSprint && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name</label>
                <input style={{ ...inp({ width: '100%' }) }} placeholder="Sprint 2 - March 9" value={newSprint.name} onChange={e => setNewSprint(s => ({ ...s, name: e.target.value }))} />
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Start</label>
                <input type="date" style={{ ...inp({ width: '100%' }) }} value={newSprint.start_date} onChange={e => setNewSprint(s => ({ ...s, start_date: e.target.value }))} />
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>End</label>
                <input type="date" style={{ ...inp({ width: '100%' }) }} value={newSprint.end_date} onChange={e => setNewSprint(s => ({ ...s, end_date: e.target.value }))} />
              </div>
              <button onClick={createSprint} disabled={saving || !newSprint.name.trim()} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-syne)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sprints.map(sprint => {
              const sCards = cards.filter(c => c.sprint_id === sprint.id);
              const sDone = doneColId ? sCards.filter(c => c.column_id === doneColId).length : 0;
              const isActive = sprint.status === 'active';
              return (
                <div key={sprint.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isActive ? 'rgba(99,102,241,0.05)' : 'var(--surface)', border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 14px', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isActive && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em' }}>ACTIVE</span>}
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isActive ? 600 : 400 }}>{sprint.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
    </>
  );
}
