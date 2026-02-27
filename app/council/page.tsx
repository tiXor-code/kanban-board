"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─────────────────────────── Types ─────────────────────────── */

type ModelId = "claude" | "gpt" | "gemini" | "system";
type Phase = "research" | "diverge" | "stress-test" | "synthesize";
type ModelStatus = "IDLE" | "THINKING" | "SPEAKING" | "VOTED";

interface CouncilEvent {
  timestamp: string;
  phase: Phase;
  model: ModelId;
  type: "speaking" | "thinking" | "phase_change" | "complete" | string;
  content?: string;
  confidence?: number | "HIGH" | "MEDIUM" | "LOW";
  recommendation?: string;
  dissent?: string;
}

interface ModelState {
  status: ModelStatus;
  speech: string;
  displayedSpeech: string;
  confidence: number | null;
  cost: number;
}

interface Verdict {
  recommendation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dissent?: string;
}

interface KpiStats {
  debatesCount: number;
  totalCost: string;
  avgConfidence: number;
  lastDecisionDate: string | null;
}

/* ─────────────────────────── Constants ─────────────────────── */

const PHASES: Phase[] = ["research", "diverge", "stress-test", "synthesize"];
const PHASE_LABELS: Record<Phase, string> = {
  research: "RESEARCH",
  diverge: "DIVERGE",
  "stress-test": "STRESS-TEST",
  synthesize: "SYNTHESIZE",
};

const MODEL_CONFIG = {
  gemini: {
    label: "GEMINI",
    fullLabel: "GEMINI 2.0",
    color: "#3b82f6",
    colorDim: "rgba(59,130,246,0.12)",
    initial: "G",
  },
  gpt: {
    label: "GPT",
    fullLabel: "GPT-4o",
    color: "#10b981",
    colorDim: "rgba(16,185,129,0.12)",
    initial: "O",
  },
  claude: {
    label: "CLAUDE",
    fullLabel: "CLAUDE OPUS",
    color: "#d4a843",
    colorDim: "rgba(212,168,67,0.12)",
    initial: "C",
  },
};

const INITIAL_MODEL_STATE: ModelState = {
  status: "IDLE",
  speech: "",
  displayedSpeech: "",
  confidence: null,
  cost: 0,
};

/* ─────────────────────────── Hooks ─────────────────────────── */

function useTypewriter(target: string, active: boolean, reducedMotion: boolean): string {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  const raf = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) { setDisplayed(target); return; }
    idx.current = 0;
    setDisplayed("");
    function tick() {
      idx.current += 2;
      setDisplayed(target.slice(0, idx.current));
      if (idx.current < target.length) raf.current = setTimeout(tick, 18);
    }
    raf.current = setTimeout(tick, 18);
    return () => { if (raf.current) clearTimeout(raf.current); };
  }, [target, active, reducedMotion]);

  return displayed;
}

/* ─────────────────────────── Sub-components ─────────────────── */

function StatusBadge({ status }: { status: ModelStatus }) {
  const styles: Record<ModelStatus, { bg: string; text: string; dot: string }> = {
    IDLE:     { bg: "#1a2030", text: "#4b5563",  dot: "#4b5563" },
    THINKING: { bg: "rgba(184,144,42,0.12)", text: "#b8902a", dot: "#b8902a" },
    SPEAKING: { bg: "rgba(212,168,67,0.18)",  text: "#d4a843", dot: "#d4a843" },
    VOTED:    { bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
  };
  const s = styles[status];
  const animate = status === "THINKING" || status === "SPEAKING";
  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: s.bg,
        color: s.text,
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 9,
        fontFamily: "var(--font-outfit)",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.dot,
          display: "inline-block",
          animation: animate ? "dot-pulse 1.4s ease-in-out infinite" : "none",
        }}
      />
      {status}
    </span>
  );
}

/* ── Hub-and-spoke node topology ── */

// Satellite positions relative to center of the SVG canvas
const SATELLITE_POSITIONS = {
  claude: { cx: 150, cy: 90 },   // top-left
  gpt:    { cx: 350, cy: 90 },   // top-right
  gemini: { cx: 250, cy: 300 },  // bottom-center
};
const CENTER = { cx: 250, cy: 190 };
const CANVAS_W = 500;
const CANVAS_H = 380;

function NodeTopology({
  models,
  currentPhase,
  reducedMotion,
}: {
  models: Record<ModelId, ModelState>;
  currentPhase: Phase | null;
  reducedMotion: boolean;
}) {
  const modelIds: (keyof typeof MODEL_CONFIG)[] = ["claude", "gpt", "gemini"];

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* Connecting lines */}
        {modelIds.map((id) => {
          const pos = SATELLITE_POSITIONS[id];
          const isActive =
            models[id].status === "THINKING" || models[id].status === "SPEAKING";
          return (
            <g key={id}>
              <line
                x1={CENTER.cx} y1={CENTER.cy}
                x2={pos.cx}    y2={pos.cy}
                stroke="#1f2937"
                strokeWidth={1.5}
              />
              {isActive && !reducedMotion && (
                <line
                  x1={CENTER.cx} y1={CENTER.cy}
                  x2={pos.cx}    y2={pos.cy}
                  stroke="#b8902a"
                  strokeWidth={2}
                  strokeDasharray="6 8"
                  style={{ animation: "dash-flow 1.2s linear infinite" }}
                />
              )}
              {isActive && (
                <line
                  x1={CENTER.cx} y1={CENTER.cy}
                  x2={pos.cx}    y2={pos.cy}
                  stroke="#b8902a"
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}
            </g>
          );
        })}

        {/* Center node */}
        <g>
          {/* outer ring glow */}
          <circle
            cx={CENTER.cx} cy={CENTER.cy} r={68}
            fill="none"
            stroke="#b8902a"
            strokeWidth={1}
            opacity={0.15}
          />
          <circle
            cx={CENTER.cx} cy={CENTER.cy} r={60}
            fill="rgba(184,144,42,0.06)"
            stroke="#b8902a"
            strokeWidth={2}
          />
          <text
            x={CENTER.cx} y={CENTER.cy - 10}
            textAnchor="middle"
            fill="#b8902a"
            fontSize={11}
            fontFamily="var(--font-syne)"
            fontWeight={700}
            letterSpacing={3}
          >
            COUNCIL
          </text>
          <text
            x={CENTER.cx} y={CENTER.cy + 8}
            textAnchor="middle"
            fill="#6b7280"
            fontSize={9}
            fontFamily="var(--font-outfit)"
            letterSpacing={1}
          >
            {currentPhase ? PHASE_LABELS[currentPhase] : "STANDBY"}
          </text>
        </g>

        {/* Satellite nodes */}
        {modelIds.map((id) => {
          const pos = SATELLITE_POSITIONS[id];
          const cfg = MODEL_CONFIG[id];
          const state = models[id];
          const isThinking = state.status === "THINKING";
          const isSpeaking = state.status === "SPEAKING";
          const isVoted    = state.status === "VOTED";
          const isActive   = isThinking || isSpeaking;

          return (
            <g key={id}>
              {/* Outer glow ring when active */}
              {isActive && !reducedMotion && (
                <circle
                  cx={pos.cx} cy={pos.cy} r={52}
                  fill="none"
                  stroke={cfg.color}
                  strokeWidth={1}
                  opacity={0.2}
                  style={{ animation: "ring-pulse 2s ease-in-out infinite" }}
                />
              )}
              {/* Main node circle */}
              <circle
                cx={pos.cx} cy={pos.cy} r={44}
                fill={cfg.colorDim}
                stroke={cfg.color}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                  filter: isSpeaking ? `drop-shadow(0 0 12px ${cfg.color}60)` : "none",
                  transition: "stroke-width 0.3s, filter 0.3s",
                }}
              />
              {/* Initial letter */}
              <text
                x={pos.cx} y={pos.cy - 6}
                textAnchor="middle"
                fill={cfg.color}
                fontSize={22}
                fontFamily="var(--font-syne)"
                fontWeight={800}
              >
                {cfg.initial}
              </text>
              {/* Model label */}
              <text
                x={pos.cx} y={pos.cy + 10}
                textAnchor="middle"
                fill={cfg.color}
                fontSize={8}
                fontFamily="var(--font-outfit)"
                fontWeight={700}
                letterSpacing={2}
              >
                {cfg.label}
              </text>
              {/* Status below circle */}
              <text
                x={pos.cx} y={pos.cy + 58}
                textAnchor="middle"
                fill={
                  isVoted    ? "#10b981" :
                  isSpeaking ? "#d4a843" :
                  isThinking ? "#b8902a" :
                  "#374151"
                }
                fontSize={8}
                fontFamily="var(--font-outfit)"
                fontWeight={700}
                letterSpacing={1.5}
              >
                {state.status}
              </text>
              {/* Confidence when voted */}
              {isVoted && state.confidence !== null && (
                <text
                  x={pos.cx} y={pos.cy + 70}
                  textAnchor="middle"
                  fill="#b8902a"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {state.confidence}% conf
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PhaseBar({ current }: { current: Phase | null }) {
  return (
    <div role="list" aria-label="Debate phases" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {PHASES.map((phase, i) => {
        const active = current === phase;
        const past = current !== null && PHASES.indexOf(current) > PHASES.indexOf(phase);
        return (
          <div key={phase} role="listitem" style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div aria-hidden="true" style={{ width: 36, height: 1, background: past || active ? "#b8902a" : "#1f2937", transition: "background 0.6s" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div aria-hidden="true" style={{
                width: 9, height: 9, borderRadius: "50%",
                background: active ? "#b8902a" : past ? "#6b5a1f" : "#1f2937",
                border: active ? "2px solid #d4a843" : "2px solid transparent",
                boxShadow: active ? "0 0 10px #b8902a80" : "none",
                transition: "background 0.6s, box-shadow 0.6s",
              }} />
              <span style={{
                fontFamily: "var(--font-outfit)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: active ? "#b8902a" : past ? "#6b5a1f" : "#374151",
                transition: "color 0.6s",
                whiteSpace: "nowrap",
              }}>
                {PHASE_LABELS[phase]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveFeed({ events, useMock }: { events: CouncilEvent[]; useMock: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);

  return (
    <section
      aria-label="Live feed"
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        minHeight: 420,
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #1f2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--font-syne)", fontSize: 10, letterSpacing: "0.16em", color: "#b8902a", textTransform: "uppercase" }}>
          The Record
        </span>
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: useMock ? "#4b5563" : "#10b981",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: useMock ? "#4b5563" : "#10b981",
            display: "inline-block",
            animation: useMock ? "none" : "dot-pulse 1.4s ease-in-out infinite",
          }} />
          {useMock ? "DEMO" : "LIVE"}
        </span>
      </div>

      {/* Feed */}
      <div
        ref={ref}
        aria-live="polite"
        aria-label="Debate transcript"
        aria-atomic="false"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          scrollbarWidth: "thin",
          scrollbarColor: "#1f2937 transparent",
        }}
      >
        {events.length === 0 ? (
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#374151", textAlign: "center", paddingTop: 32 }}>
            — No session active —
          </div>
        ) : (
          events.map((ev, i) => {
            const modelCfg = ev.model && ev.model !== "system"
              ? MODEL_CONFIG[ev.model as keyof typeof MODEL_CONFIG]
              : null;
            const time = new Date(ev.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const text = (ev.content ?? ev.recommendation ?? "").slice(0, 160);
            const truncated = (ev.content ?? ev.recommendation ?? "").length > 160;
            return (
              <article
                key={i}
                style={{
                  padding: "8px 10px",
                  background: "#0d1117",
                  borderRadius: 6,
                  borderLeft: `2px solid ${modelCfg?.color ?? "#1f2937"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: "#374151", fontVariantNumeric: "tabular-nums" }}>
                    {time}
                  </span>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9, fontWeight: 700, color: modelCfg?.color ?? "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {ev.model}
                  </span>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: 8, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {ev.type}
                  </span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, lineHeight: 1.6, color: "#6b7280" }}>
                  {text}{truncated ? "…" : ""}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function KpiStrip({ stats }: { stats: KpiStats | null }) {
  const cards = [
    {
      label: "Debates Run",
      value: stats ? String(stats.debatesCount) : "—",
      sub: "total sessions",
    },
    {
      label: "Total Cost",
      value: stats ? `$${stats.totalCost}` : "—",
      sub: "all-time spend",
    },
    {
      label: "Avg Confidence",
      value: stats?.avgConfidence ? `${stats.avgConfidence}%` : "—",
      sub: "across decisions",
    },
    {
      label: "Last Decision",
      value: stats?.lastDecisionDate ?? "—",
      sub: "most recent",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        borderTop: "1px solid #1f2937",
        background: "#1f2937",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: "#111827",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 9, letterSpacing: "0.14em", color: "#4b5563", textTransform: "uppercase" }}>
            {card.label}
          </div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 20, fontWeight: 800, color: "#b8902a", fontVariantNumeric: "tabular-nums" }}>
            {card.value}
          </div>
          <div style={{ fontFamily: "var(--font-outfit)", fontSize: 9, color: "#374151" }}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

function VerdictPanel({ verdict, reducedMotion }: { verdict: Verdict | null; reducedMotion: boolean }) {
  const [show, setShow] = useState(false);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (!verdict) return;
    setShow(false); setStamped(false);
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setStamped(true), reducedMotion ? 100 : 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [verdict, reducedMotion]);

  if (!verdict) return null;

  const confidenceColor =
    verdict.confidence === "HIGH" ? "#10b981" :
    verdict.confidence === "MEDIUM" ? "#b8902a" : "#f43f5e";

  return (
    <section
      aria-live="assertive"
      aria-label="Council final verdict"
      role="region"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#0a0d14",
        borderTop: "2px solid #b8902a",
        boxShadow: "0 -8px 40px rgba(184,144,42,0.25)",
        padding: "20px 32px",
        transform: show ? "translateY(0)" : "translateY(100%)",
        transition: reducedMotion ? "none" : "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div
          aria-hidden="true"
          style={{
            flexShrink: 0, width: 72, height: 72, borderRadius: "50%",
            border: "3px solid #b8902a",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
            opacity: stamped ? 1 : 0,
            transform: stamped ? "scale(1) rotate(-8deg)" : "scale(2) rotate(-8deg)",
            transition: reducedMotion ? "none" : "opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 7, letterSpacing: "0.1em", color: "#b8902a", textTransform: "uppercase", textAlign: "center", lineHeight: 1.3 }}>
            COUNCIL<br />DECISION
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 11, letterSpacing: "0.16em", color: "#b8902a", textTransform: "uppercase" }}>
              Final Recommendation
            </span>
            <span style={{
              background: confidenceColor + "20",
              color: confidenceColor,
              border: `1px solid ${confidenceColor}40`,
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}>
              {verdict.confidence} CONFIDENCE
            </span>
          </div>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: "1.7", color: "#e5e7eb", marginBottom: verdict.dissent ? 10 : 0 }}>
            {verdict.recommendation}
          </p>
          {verdict.dissent && (
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", borderLeft: "2px solid #374151", paddingLeft: 10 }}>
              DISSENT: {verdict.dissent}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Main Page ──────────────────────── */

export default function CouncilPage() {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [models, setModels] = useState<Record<ModelId, ModelState>>({
    claude: { ...INITIAL_MODEL_STATE },
    gpt: { ...INITIAL_MODEL_STATE },
    gemini: { ...INITIAL_MODEL_STATE },
    system: { ...INITIAL_MODEL_STATE },
  });
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<KpiStats | null>(null);

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const processedIds = useRef(new Set<string>());

  const processEvents = useCallback(
    (newEvents: CouncilEvent[]) => {
      const fresh = newEvents.filter((ev) => {
        const id = `${ev.timestamp}-${ev.model}-${ev.type}`;
        if (processedIds.current.has(id)) return false;
        processedIds.current.add(id);
        return true;
      });

      if (fresh.length === 0) return;

      setEvents((prev) => [...prev, ...fresh].slice(-50));

      fresh.forEach((ev) => {
        if (ev.type === "phase_change") {
          setCurrentPhase(ev.phase);
          if (ev.content?.startsWith("Session initiated")) {
            const match = ev.content.match(/Motion under debate: (.+)$/);
            if (match) setCurrentQuestion(match[1]);
            setSessionStart(new Date(ev.timestamp));
            setVerdict(null);
          }
        }

        if (ev.type === "complete" && ev.recommendation) {
          setVerdict({
            recommendation: ev.recommendation,
            confidence: (ev.confidence as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
            dissent: ev.dissent,
          });
        }

        const modelId = ev.model as ModelId;
        if (modelId === "system") return;

        if (ev.type === "thinking") {
          setModels((prev) => ({
            ...prev,
            [modelId]: { ...prev[modelId], status: "THINKING", speech: ev.content ?? "" },
          }));
        } else if (ev.type === "speaking") {
          setModels((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              status: "SPEAKING",
              speech: ev.content ?? "",
              displayedSpeech: "",
              confidence: typeof ev.confidence === "number" ? ev.confidence : null,
            },
          }));
          setTimeout(() => {
            setModels((prev) => ({
              ...prev,
              [modelId]: {
                ...prev[modelId],
                status: typeof ev.confidence === "number" ? "VOTED" : "IDLE",
              },
            }));
          }, reducedMotion ? 100 : (ev.content?.length ?? 100) * 18 + 2000);
        }
      });
    },
    [reducedMotion]
  );

  // Poll events
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const url = useMock ? "/api/council/mock" : "/api/council/events";
      try {
        const res = await fetch(url);
        const data: CouncilEvent[] = await res.json();
        if (!cancelled) processEvents(data);
      } catch { /* silently ignore */ }
    }
    poll();
    const interval = setInterval(poll, useMock ? 10000 : 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [useMock, processEvents]);

  // Fetch KPI stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/council/stats");
        const data = await res.json();
        setStats(data);
      } catch { /* ignore */ }
    }
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!sessionStart) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  useEffect(() => { setMounted(true); }, []);

  const formatElapsed = () =>
    `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const handleToggle = () => {
    setUseMock((v) => !v);
    processedIds.current.clear();
    setEvents([]);
    setModels({
      claude: { ...INITIAL_MODEL_STATE },
      gpt: { ...INITIAL_MODEL_STATE },
      gemini: { ...INITIAL_MODEL_STATE },
      system: { ...INITIAL_MODEL_STATE },
    });
    setCurrentPhase(null);
    setCurrentQuestion("");
    setVerdict(null);
    setSessionStart(null);
    setElapsed(0);
  };

  return (
    <>
      <a href="#chamber-main" style={{ position: "absolute", top: -9999, left: -9999, zIndex: 9999 }}
        onFocus={(e) => { e.currentTarget.style.top = "8px"; e.currentTarget.style.left = "8px"; }}
        onBlur={(e) => { e.currentTarget.style.top = "-9999px"; e.currentTarget.style.left = "-9999px"; }}
      >
        Skip to content
      </a>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes ring-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.05; transform: scale(1.1); }
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -28; }
        }
        @keyframes node-reveal {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }

        :focus-visible {
          outline: 2px solid #b8902a;
          outline-offset: 3px;
          border-radius: 4px;
        }
      `}</style>

      <div
        id="chamber-main"
        style={{
          minHeight: "100vh",
          background: "#0a0d14",
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 50% 30%, rgba(184,144,42,0.05) 0%, transparent 70%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")
          `,
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          paddingBottom: verdict ? 160 : 0,
          transition: verdict ? "padding-bottom 0.5s ease" : "none",
        }}
      >
        {/* Vignette */}
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)", zIndex: 1 }} />

        {/* ── Header ── */}
        <header style={{
          position: "relative",
          zIndex: 10,
          marginTop: 56,
          borderBottom: "1px solid #1f2937",
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 800, fontSize: 13, letterSpacing: "0.22em", color: "#b8902a", textTransform: "uppercase" }}>
            The Council
          </h1>

          {/* Session timer (center) */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
            {sessionStart ? (
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "#6b7280", fontVariantNumeric: "tabular-nums", letterSpacing: "0.08em" }} aria-label={`Session elapsed: ${elapsed} seconds`}>
                {formatElapsed()}
              </span>
            ) : (
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#374151" }}>--:--</span>
            )}
          </div>

          {/* Live/Demo toggle */}
          <button
            onClick={handleToggle}
            style={{
              fontFamily: "var(--font-outfit)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: useMock ? "#4b5563" : "#10b981",
              background: useMock ? "transparent" : "rgba(16,185,129,0.08)",
              border: `1px solid ${useMock ? "#1f2937" : "#10b98140"}`,
              borderRadius: 4,
              padding: "4px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: useMock ? "#4b5563" : "#10b981",
              display: "inline-block",
              animation: useMock ? "none" : "dot-pulse 1.4s ease-in-out infinite",
            }} />
            {useMock ? "Demo" : "Live"}
          </button>
        </header>

        {/* ── Main body ── */}
        <main style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 20,
          padding: "20px 28px",
          alignItems: "start",
        }}>
          {/* Left: Node topology + Podium */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Agent Network panel */}
            <section
              aria-label="Agent network topology"
              style={{
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: 10, letterSpacing: "0.16em", color: "#b8902a", textTransform: "uppercase" }}>
                  Agent Network
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: 9, color: "#374151", letterSpacing: "0.08em" }}>
                  hub-and-spoke topology
                </span>
              </div>
              <div style={{
                padding: "16px 24px",
                opacity: mounted ? 1 : 0,
                transition: reducedMotion ? "none" : "opacity 0.5s ease",
              }}>
                <NodeTopology models={models} currentPhase={currentPhase} reducedMotion={reducedMotion} />
              </div>
            </section>

            {/* Podium — Motion under debate */}
            <section
              aria-label="Podium — current motion and phase"
              style={{
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ fontFamily: "var(--font-syne)", fontSize: 9, letterSpacing: "0.2em", color: "#b8902a", textTransform: "uppercase" }}>
                Motion Under Debate
              </div>
              <p style={{
                fontFamily: "Georgia, 'Playfair Display', serif",
                fontSize: 17,
                fontStyle: currentQuestion ? "italic" : "normal",
                lineHeight: "1.65",
                color: currentQuestion ? "#e5e7eb" : "#374151",
                minHeight: 48,
                margin: 0,
              }}>
                {currentQuestion || "No active session. Switch to Demo mode or start a debate."}
              </p>
              <div aria-hidden="true" style={{ height: 1, background: "#1f2937" }} />
              <PhaseBar current={currentPhase} />
            </section>
          </div>

          {/* Right: Live Feed */}
          <LiveFeed events={events} useMock={useMock} />
        </main>

        {/* ── KPI strip ── */}
        <KpiStrip stats={stats} />
      </div>

      <VerdictPanel verdict={verdict} reducedMotion={reducedMotion} />
    </>
  );
}
