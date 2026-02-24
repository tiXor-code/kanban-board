'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  due_date: string | null;
  position: number;
  created_at: number;
  updated_at: number;
  hours: number;
  assignee: string | null;
  priority: string | null;
  sprint_id: number | null;
}

interface Column {
  id: number;
  title: string;
  color: string;
  position: number;
  cards: Card[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LABELS = [
  { name: 'JobMap',    color: '#f97316', bg: 'rgba(249,115,22,0.2)' },
  { name: 'Ministeru', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
  { name: 'Infra',    color: '#06b6d4', bg: 'rgba(6,182,212,0.2)' },
  { name: 'Bug',      color: '#f43f5e', bg: 'rgba(244,63,94,0.2)' },
  { name: 'Feature',  color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  { name: 'Urgent',   color: '#fb923c', bg: 'rgba(251,146,60,0.2)' },
  { name: 'Design',   color: '#ec4899', bg: 'rgba(236,72,153,0.2)' },
  { name: 'Backend',  color: '#34d399', bg: 'rgba(52,211,153,0.2)' },
  { name: 'Frontend', color: '#60a5fa', bg: 'rgba(96,165,250,0.2)' },
  { name: 'DevOps',   color: '#c084fc', bg: 'rgba(192,132,252,0.2)' },
  { name: 'Research', color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' },
];

const PRIORITY_CONFIG: Record<string, { letter: string; color: string; bg: string; label: string }> = {
  Must:   { letter: 'M', color: '#f43f5e', bg: 'rgba(244,63,94,0.25)',   label: 'Must Have' },
  Should: { letter: 'S', color: '#fb923c', bg: 'rgba(251,146,60,0.25)',  label: 'Should Have' },
  Could:  { letter: 'C', color: '#60a5fa', bg: 'rgba(96,165,250,0.25)',  label: 'Could Have' },
  Wont:   { letter: 'W', color: '#94a3b8', bg: 'rgba(148,163,184,0.25)', label: "Won't Have" },
};

const ASSIGNEE_COLORS: Record<string, { color: string; bg: string; initials: string }> = {
  Teodor: { color: '#fb923c', bg: 'rgba(251,146,60,0.2)',  initials: 'T' },
  Eduard: { color: '#60a5fa', bg: 'rgba(96,165,250,0.2)',  initials: 'E' },
  John:   { color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', initials: 'J' },
};

const COL_COLORS = ['#6b7280','#f43f5e','#fb923c','#34d399','#22d3ee','#c084fc','#ec4899','#60a5fa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLabelDef(name: string) {
  return LABELS.find(l => l.name === name) || { color: '#6b7280', bg: 'rgba(107,114,128,0.2)' };
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function SortableCard({
  card, sprints, onClick,
}: {
  card: Card;
  sprints: Sprint[];
  onClick: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card${isDragging ? ' is-dragging' : ''}`}
      onClick={() => onClick(card)}
      aria-label={`Card: ${card.title}`}
      {...attributes}
      {...listeners}
    >
      <CardContent card={card} sprints={sprints} />
    </article>
  );
}

function CardContent({ card, sprints }: { card: Card; sprints: Sprint[] }) {
  const pcfg = card.priority ? PRIORITY_CONFIG[card.priority] : null;
  const sprint = card.sprint_id ? sprints.find(s => s.id === card.sprint_id) : null;
  const assigneeCfg = card.assignee ? ASSIGNEE_COLORS[card.assignee] : null;
  const overdue = isOverdue(card.due_date);

  return (
    <>
      <div className="card-top">
        {pcfg && (
          <span
            className="priority-badge"
            style={{ background: pcfg.bg, color: pcfg.color }}
            title={pcfg.label}
          >
            {pcfg.letter}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-id">#{card.id}</div>
          <div className="card-title">{card.title}</div>
        </div>
        {assigneeCfg && (
          <div
            className="card-badge-assignee"
            style={{ background: assigneeCfg.bg, color: assigneeCfg.color }}
            title={card.assignee!}
            aria-label={`Assigned to ${card.assignee}`}
          >
            {assigneeCfg.initials}
          </div>
        )}
      </div>

      {card.description && (
        <p className="card-desc">{card.description}</p>
      )}

      <div className="card-meta">
        {(card.labels || []).map(l => {
          const def = getLabelDef(l);
          return (
            <span key={l} className="card-label" style={{ background: def.bg, color: def.color }}>
              {l}
            </span>
          );
        })}
        {sprint && (
          <span className="card-sprint-badge">▸ {sprint.name}</span>
        )}
        {card.hours > 0 && (
          <span className="card-hours">{card.hours}h</span>
        )}
        {card.due_date && (
          <span className={`card-due${overdue ? ' overdue' : ''}`}>
            {card.due_date}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Column component ─────────────────────────────────────────────────────────

function BoardColumn({
  col,
  filteredCards,
  sprints,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onOpenCard,
}: {
  col: Column;
  filteredCards: Card[];
  sprints: Sprint[];
  onAddCard: (colId: number) => void;
  onEditColumn: (col: Column) => void;
  onDeleteColumn: (colId: number) => void;
  onOpenCard: (card: Card) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const cardIds = filteredCards.map(c => `card-${c.id}`);
  const { setNodeRef: setColDropRef } = useDroppable({ id: `col-${col.id}` });

  return (
    <section
      className="column"
      aria-label={`Column: ${col.title}`}
    >
      <div className="column-header">
        <div className="column-title-wrap">
          <div className="column-dot" style={{ background: col.color }} />
          <h2 className="column-title">{col.title}</h2>
          <span className="column-count">{filteredCards.length}</span>
        </div>
        <div className="column-actions">
          <div className="dropdown-wrapper" ref={menuRef}>
            <button
              className="btn-icon"
              aria-label={`Column options for ${col.title}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(p => !p)}
            >
              ···
            </button>
            {menuOpen && (
              <div className="dropdown-menu" role="menu">
                <button
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onEditColumn(col); }}
                >
                  ✏️ Edit column
                </button>
                <button
                  className="dropdown-item danger"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDeleteColumn(col.id); }}
                >
                  🗑️ Delete column
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div ref={setColDropRef} className="column-cards" aria-label="Cards">
          {filteredCards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              sprints={sprints}
              onClick={onOpenCard}
            />
          ))}
        </div>
      </SortableContext>

      <div className="column-footer">
        <button
          className="add-card-btn"
          aria-label={`Add card to ${col.title}`}
          onClick={() => onAddCard(col.id)}
        >
          + Add card
        </button>
      </div>
    </section>
  );
}

// ─── Card Modal ───────────────────────────────────────────────────────────────

interface CardFormState {
  title: string;
  description: string;
  labels: string[];
  assignee: string;
  priority: string;
  due_date: string;
  hours: string;
  sprint_id: string;
}

function CardModal({
  mode,
  card,
  colId,
  sprints,
  onSave,
  onDelete,
  onClose,
}: {
  mode: 'create' | 'edit';
  card: Card | null;
  colId: number;
  sprints: Sprint[];
  onSave: (data: CardFormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CardFormState>({
    title: card?.title || '',
    description: card?.description || '',
    labels: card?.labels || [],
    assignee: card?.assignee || '',
    priority: card?.priority || '',
    due_date: card?.due_date || '',
    hours: card?.hours ? String(card.hours) : '',
    sprint_id: card?.sprint_id ? String(card.sprint_id) : '',
  });
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleLabel(name: string) {
    setForm(f => ({
      ...f,
      labels: f.labels.includes(name)
        ? f.labels.filter(l => l !== name)
        : [...f.labels, name],
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm('Delete this card?')) return;
    setSaving(true);
    try { await onDelete(); } finally { setSaving(false); }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Create card' : 'Edit card'}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <h2 className="modal-title">
          <span className="modal-title-accent">{mode === 'create' ? '＋' : '✎'}</span>
          {mode === 'create' ? 'New Card' : 'Edit Card'}
        </h2>

        <div className="form-group">
          <label htmlFor="card-title">Title</label>
          <input
            ref={titleRef}
            id="card-title"
            className="form-input"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div className="form-group">
          <label htmlFor="card-desc">Description</label>
          <textarea
            id="card-desc"
            className="form-textarea"
            placeholder="Add details…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>Labels</label>
          <div className="label-picker">
            {LABELS.map(l => (
              <button
                key={l.name}
                type="button"
                className={`label-opt${form.labels.includes(l.name) ? ' active' : ''}`}
                style={{ background: l.bg, color: l.color }}
                onClick={() => toggleLabel(l.name)}
                aria-pressed={form.labels.includes(l.name)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="card-assignee">Assignee</label>
            <select
              id="card-assignee"
              className="form-select"
              value={form.assignee}
              onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
            >
              <option value="">Unassigned</option>
              <option value="Teodor">Teodor</option>
              <option value="Eduard">Eduard</option>
              <option value="John">John</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="card-priority">Priority</label>
            <select
              id="card-priority"
              className="form-select"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="">None</option>
              <option value="Must">Must Have</option>
              <option value="Should">Should Have</option>
              <option value="Could">Could Have</option>
              <option value="Wont">Won&apos;t Have</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="card-due">Due Date</label>
            <input
              id="card-due"
              type="date"
              className="form-input"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="card-hours">Hours</label>
            <input
              id="card-hours"
              type="number"
              className="form-input"
              placeholder="0"
              min="0"
              step="0.5"
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
            />
          </div>
        </div>

        {sprints.length > 0 && (
          <div className="form-group">
            <label htmlFor="card-sprint">Sprint</label>
            <select
              id="card-sprint"
              className="form-select"
              value={form.sprint_id}
              onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value }))}
            >
              <option value="">No sprint</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          {mode === 'edit' && onDelete && (
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────

function CardDetailModal({
  card,
  column,
  sprints,
  onEdit,
  onDelete,
  onClose,
}: {
  card: Card;
  column: Column | undefined;
  sprints: Sprint[];
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const pcfg = card.priority ? PRIORITY_CONFIG[card.priority] : null;
  const sprint = card.sprint_id ? sprints.find(s => s.id === card.sprint_id) : null;
  const assigneeCfg = card.assignee ? ASSIGNEE_COLORS[card.assignee] : null;
  const overdue = isOverdue(card.due_date);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleDelete() {
    if (!confirm('Delete this card?')) return;
    await onDelete();
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Card: ${card.title}`}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal detail-modal">
        <div className="detail-header">
          <div>
            <div className="detail-card-id">#{card.id}</div>
            <h2 className="detail-title">{card.title}</h2>
          </div>
          <button className="btn-icon" aria-label="Close" onClick={onClose} style={{ fontSize: '20px', flexShrink: 0 }}>×</button>
        </div>

        <div className="detail-meta-row">
          {pcfg && (
            <span className="card-label" style={{ background: pcfg.bg, color: pcfg.color }}>
              {pcfg.label}
            </span>
          )}
          {(card.labels || []).map(l => {
            const def = getLabelDef(l);
            return (
              <span key={l} className="card-label" style={{ background: def.bg, color: def.color }}>{l}</span>
            );
          })}
          {assigneeCfg && (
            <span className="card-label" style={{ background: assigneeCfg.bg, color: assigneeCfg.color }}>
              {card.assignee}
            </span>
          )}
          {sprint && (
            <span className="card-sprint-badge">▸ {sprint.name}</span>
          )}
        </div>

        <div className="detail-section-label">Description</div>
        <div className={`detail-description${!card.description ? ' empty' : ''}`}>
          {card.description || 'No description provided.'}
        </div>

        <div className="detail-grid">
          <div className="detail-info-box">
            <div className="detail-info-label">Column</div>
            <div className="detail-info-value">
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: column?.color, marginRight: 6, verticalAlign: 'middle' }} />
              {column?.title || '—'}
            </div>
          </div>
          <div className="detail-info-box">
            <div className="detail-info-label">Priority</div>
            <div className="detail-info-value" style={{ color: pcfg?.color || 'inherit' }}>
              {pcfg?.label || 'None'}
            </div>
          </div>
          <div className="detail-info-box">
            <div className="detail-info-label">Due Date</div>
            <div className="detail-info-value" style={{ color: overdue ? 'var(--danger)' : 'inherit' }}>
              {card.due_date || 'None'}
            </div>
          </div>
          <div className="detail-info-box">
            <div className="detail-info-label">Hours Logged</div>
            <div className="detail-info-value" style={{ color: card.hours > 0 ? 'var(--accent)' : 'inherit' }}>
              {card.hours > 0 ? `${card.hours}h` : 'None'}
            </div>
          </div>
          <div className="detail-info-box">
            <div className="detail-info-label">Created</div>
            <div className="detail-info-value">
              {card.created_at ? new Date(card.created_at * 1000).toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="detail-info-box">
            <div className="detail-info-label">Assignee</div>
            <div className="detail-info-value" style={{ color: assigneeCfg?.color || 'inherit' }}>
              {card.assignee || 'Unassigned'}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          <button className="btn btn-primary" onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Column Modal ─────────────────────────────────────────────────────────────

function ColumnModal({
  col,
  onSave,
  onClose,
}: {
  col: Column | null;
  onSave: (title: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(col?.title || '');
  const [color, setColor] = useState(col?.color || '#22d3ee');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try { await onSave(title.trim(), color); } finally { setSaving(false); }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={col ? 'Edit column' : 'Create column'}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-sm">
        <h2 className="modal-title">
          <span className="modal-title-accent">⊞</span>
          {col ? 'Edit Column' : 'New Column'}
        </h2>
        <div className="form-group">
          <label htmlFor="col-title">Title</label>
          <input
            ref={inputRef}
            id="col-title"
            className="form-input"
            placeholder="Column name…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>
        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            {COL_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-opt${color === c ? ' active' : ''}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sprint Modal ─────────────────────────────────────────────────────────────

function SprintModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim()); } finally { setSaving(false); }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Create sprint"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-sm">
        <h2 className="modal-title"><span className="modal-title-accent">⚡</span> New Sprint</h2>
        <div className="form-group">
          <label htmlFor="sprint-name">Sprint name</label>
          <input
            ref={inputRef}
            id="sprint-name"
            className="form-input"
            placeholder="e.g. Sprint 1, Week of Feb 24…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

type AssigneeFilter = 'all' | 'Teodor' | 'Eduard' | 'Unassigned';
type PriorityFilter = 'all' | 'Must' | 'Should' | 'Could' | 'Wont';

export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [sprintFilter, setSprintFilter] = useState('all');

  // Modals
  const [cardModal, setCardModal] = useState<{ mode: 'create' | 'edit'; card: Card | null; colId: number } | null>(null);
  const [detailModal, setDetailModal] = useState<Card | null>(null);
  const [columnModal, setColumnModal] = useState<{ col: Column | null } | null>(null);
  const [sprintModal, setSprintModal] = useState(false);

  // DnD
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBoard = useCallback(async () => {
    try {
      const [boardData, sprintsData] = await Promise.all([
        fetch('/api/board').then(r => r.json()),
        fetch('/api/sprints').then(r => r.json()),
      ]);
      setColumns(Array.isArray(boardData) ? boardData : []);
      setSprints(Array.isArray(sprintsData) ? sprintsData : []);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  function filterCards(cards: Card[]): Card[] {
    let filtered = cards;

    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'Unassigned') {
        filtered = filtered.filter(c => !c.assignee);
      } else {
        filtered = filtered.filter(c => c.assignee === assigneeFilter);
      }
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }

    if (labelFilter !== 'all') {
      filtered = filtered.filter(c => (c.labels || []).includes(labelFilter));
    }

    if (sprintFilter !== 'all') {
      filtered = filtered.filter(c => String(c.sprint_id) === sprintFilter);
    }

    return filtered;
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  function findCard(cardId: number): { card: Card; column: Column } | null {
    for (const col of columns) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) return { card, column: col };
    }
    return null;
  }

  function findColumnByCardId(cardId: number): Column | null {
    return columns.find(col => col.cards.some(c => c.id === cardId)) || null;
  }

  function parseCardId(dndId: string | number): number | null {
    if (typeof dndId === 'number') return null;
    if (dndId.startsWith('card-')) return parseInt(dndId.slice(5));
    return null;
  }

  function parseColId(dndId: string | number): number | null {
    if (typeof dndId === 'number') return null;
    if (dndId.startsWith('col-')) return parseInt(dndId.slice(4));
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    const cardId = parseCardId(event.active.id);
    if (cardId) setActiveCardId(cardId);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = parseCardId(active.id);
    if (!activeCardId) return;

    const overCardId = parseCardId(over.id);
    const overColId = parseColId(over.id);

    const sourceCol = findColumnByCardId(activeCardId);
    if (!sourceCol) return;

    let targetColId: number | null = null;

    if (overCardId) {
      const targetCol = findColumnByCardId(overCardId);
      targetColId = targetCol?.id ?? null;
    } else if (overColId) {
      targetColId = overColId;
    }

    if (!targetColId || targetColId === sourceCol.id) return;

    // Move card to target column optimistically
    setColumns(prev => {
      const newCols = prev.map(col => {
        if (col.id === sourceCol.id) {
          return { ...col, cards: col.cards.filter(c => c.id !== activeCardId) };
        }
        if (col.id === targetColId) {
          const activeCard = sourceCol.cards.find(c => c.id === activeCardId);
          if (!activeCard) return col;
          return { ...col, cards: [...col.cards, { ...activeCard, column_id: targetColId }] };
        }
        return col;
      });
      return newCols;
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over) return;

    const activeCardId = parseCardId(active.id);
    if (!activeCardId) return;

    const overCardId = parseCardId(over.id);
    const overColId = parseColId(over.id);

    // Find current column of the active card (after optimistic update)
    const sourceCol = columns.find(col => col.cards.some(c => c.id === activeCardId));
    if (!sourceCol) return;

    let targetColId = sourceCol.id;
    let targetPosition = sourceCol.cards.findIndex(c => c.id === activeCardId);

    if (overCardId && overCardId !== activeCardId) {
      const overCol = columns.find(col => col.cards.some(c => c.id === overCardId));
      if (overCol) {
        targetColId = overCol.id;
        const overIdx = overCol.cards.findIndex(c => c.id === overCardId);
        if (overCol.id === sourceCol.id) {
          // Same column reorder
          const activeIdx = overCol.cards.findIndex(c => c.id === activeCardId);
          const newCards = arrayMove(overCol.cards, activeIdx, overIdx);
          setColumns(prev => prev.map(col =>
            col.id === sourceCol.id ? { ...col, cards: newCards } : col
          ));
          targetPosition = overIdx;
        } else {
          targetPosition = overIdx;
        }
      }
    } else if (overColId) {
      targetColId = overColId;
      const targetCol = columns.find(c => c.id === targetColId);
      targetPosition = targetCol?.cards.length ?? 0;
    }

    // Persist to API
    try {
      await fetch('/api/cards/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: activeCardId, column_id: targetColId, position: targetPosition }),
      });
    } catch (err) {
      console.error('Move failed:', err);
      loadBoard(); // Reload on error
    }
  }

  // ── Card CRUD ─────────────────────────────────────────────────────────────

  async function saveCard(form: CardFormState) {
    if (!cardModal) return;
    const payload = {
      column_id: cardModal.colId,
      title: form.title.trim(),
      description: form.description.trim(),
      labels: form.labels,
      assignee: form.assignee || null,
      priority: form.priority || null,
      due_date: form.due_date || null,
      hours: parseFloat(form.hours) || 0,
      sprint_id: form.sprint_id ? parseInt(form.sprint_id) : null,
    };

    const url = cardModal.mode === 'edit' && cardModal.card
      ? `/api/cards/${cardModal.card.id}`
      : '/api/cards';
    const method = cardModal.mode === 'edit' ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save card');
    setCardModal(null);
    await loadBoard();
  }

  async function deleteCard(cardId: number) {
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
    setCardModal(null);
    setDetailModal(null);
    await loadBoard();
  }

  // ── Column CRUD ───────────────────────────────────────────────────────────

  async function saveColumn(title: string, color: string) {
    if (!columnModal) return;
    const url = columnModal.col ? `/api/columns/${columnModal.col.id}` : '/api/columns';
    const method = columnModal.col ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, color }),
    });
    setColumnModal(null);
    await loadBoard();
  }

  async function deleteColumn(colId: number) {
    if (!confirm('Delete this column and all its cards?')) return;
    await fetch(`/api/columns/${colId}`, { method: 'DELETE' });
    await loadBoard();
  }

  // ── Sprint CRUD ───────────────────────────────────────────────────────────

  async function createSprint(name: string) {
    await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSprintModal(false);
    await loadBoard();
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const allLabelsInUse = Array.from(new Set(
    columns.flatMap(col => col.cards.flatMap(c => c.labels || []))
  )).sort();

  const activeCard = activeCardId ? findCard(activeCardId)?.card : null;
  const activeColumn = detailModal
    ? columns.find(c => c.id === detailModal.column_id)
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-layout">
        <main>
          <div className="loading-state" aria-live="polite">
            <div className="loading-spinner" role="status" aria-label="Loading board" />
            <span>Loading board…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header>
        <div className="header-top">
          <a href="/" className="logo" aria-label="Kanban Board home">
            <span className="logo-mark"><span>K</span>anban</span>
            <span className="logo-sub" aria-hidden="true">tixor</span>
          </a>

          <nav className="header-controls" aria-label="Board actions">
            <button
              className="btn btn-ghost"
              onClick={() => setSprintModal(true)}
              aria-label="Create new sprint"
            >
              ⚡ Sprint
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setColumnModal({ col: null })}
              aria-label="Add new column"
            >
              ⊞ Column
            </button>
            <button
              className="btn btn-primary"
              onClick={() => columns[0] && setCardModal({ mode: 'create', card: null, colId: columns[0].id })}
              aria-label="Add new card"
              disabled={columns.length === 0}
            >
              + Card
            </button>
          </nav>
        </div>

        <div className="filter-bar" role="toolbar" aria-label="Board filters">
          <div className="filter-section">
            <span className="filter-label" id="assignee-filter-label">Assignee</span>
            {(['all', 'Teodor', 'Eduard', 'Unassigned'] as AssigneeFilter[]).map(a => (
              <button
                key={a}
                className={`filter-chip${assigneeFilter === a ? ' active' : ''}`}
                onClick={() => setAssigneeFilter(a)}
                aria-pressed={assigneeFilter === a}
                aria-describedby="assignee-filter-label"
              >
                {a === 'all' ? 'All' : a}
              </button>
            ))}
          </div>

          <div className="filter-section">
            <span className="filter-label" id="priority-filter-label">Priority</span>
            {(['all', 'Must', 'Should', 'Could', 'Wont'] as PriorityFilter[]).map(p => (
              <button
                key={p}
                className={`filter-chip${priorityFilter === p ? ' active' : ''}`}
                onClick={() => setPriorityFilter(p)}
                aria-pressed={priorityFilter === p}
              >
                {p === 'all' ? 'All' : p === 'Wont' ? "Won't" : p}
              </button>
            ))}
          </div>

          {allLabelsInUse.length > 0 && (
            <div className="filter-section">
              <span className="filter-label">Label</span>
              <button
                className={`filter-chip${labelFilter === 'all' ? ' active' : ''}`}
                onClick={() => setLabelFilter('all')}
                aria-pressed={labelFilter === 'all'}
              >
                All
              </button>
              {allLabelsInUse.slice(0, 6).map(l => {
                const def = getLabelDef(l);
                return (
                  <button
                    key={l}
                    className={`filter-chip${labelFilter === l ? ' active' : ''}`}
                    onClick={() => setLabelFilter(l)}
                    aria-pressed={labelFilter === l}
                    style={labelFilter === l ? { borderColor: def.color, color: def.color, background: def.bg } : {}}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          )}

          {sprints.length > 0 && (
            <div className="filter-section">
              <span className="filter-label">Sprint</span>
              <select
                className="filter-select"
                value={sprintFilter}
                onChange={e => setSprintFilter(e.target.value)}
                aria-label="Filter by sprint"
              >
                <option value="all">All sprints</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main aria-label="Kanban board">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="board-scroll">
            {columns.map(col => {
              const filteredCards = filterCards(col.cards);
              return (
                <BoardColumn
                  key={col.id}
                  col={col}
                  filteredCards={filteredCards}
                  sprints={sprints}
                  onAddCard={colId => setCardModal({ mode: 'create', card: null, colId })}
                  onEditColumn={col => setColumnModal({ col })}
                  onDeleteColumn={deleteColumn}
                  onOpenCard={card => setDetailModal(card)}
                />
              );
            })}

            <button
              className="add-column-btn"
              onClick={() => setColumnModal({ col: null })}
              aria-label="Add new column"
            >
              <span className="add-column-icon">⊞</span>
              Add Column
            </button>
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="card drag-overlay" aria-hidden="true">
                <CardContent card={activeCard} sprints={sprints} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Card create/edit modal */}
      {cardModal && (
        <CardModal
          mode={cardModal.mode}
          card={cardModal.card}
          colId={cardModal.colId}
          sprints={sprints}
          onSave={saveCard}
          onDelete={cardModal.card ? () => deleteCard(cardModal.card!.id) : undefined}
          onClose={() => setCardModal(null)}
        />
      )}

      {/* Card detail modal */}
      {detailModal && (
        <CardDetailModal
          card={detailModal}
          column={activeColumn}
          sprints={sprints}
          onEdit={() => {
            const col = columns.find(c => c.id === detailModal.column_id);
            if (col) {
              setDetailModal(null);
              setCardModal({ mode: 'edit', card: detailModal, colId: col.id });
            }
          }}
          onDelete={() => deleteCard(detailModal.id)}
          onClose={() => setDetailModal(null)}
        />
      )}

      {/* Column modal */}
      {columnModal !== null && (
        <ColumnModal
          col={columnModal.col}
          onSave={saveColumn}
          onClose={() => setColumnModal(null)}
        />
      )}

      {/* Sprint modal */}
      {sprintModal && (
        <SprintModal
          onSave={createSprint}
          onClose={() => setSprintModal(false)}
        />
      )}
    </div>
  );
}
