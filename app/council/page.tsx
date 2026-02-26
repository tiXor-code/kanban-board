"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

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
}

interface Verdict {
  recommendation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dissent?: string;
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
    label: "GEMINI 2.0",
    color: "#3b82f6",
    colorDim: "rgba(59,130,246,0.15)",
    initials: "G",
  },
  gpt: {
    label: "GPT-4o",
    color: "#10b981",
    colorDim: "rgba(16,185,129,0.15)",
    initials: "O",
  },
  claude: {
    label: "CLAUDE OPUS",
    color: "#d4a843",
    colorDim: "rgba(212,168,67,0.15)",
    initials: "C",
  },
};

const INITIAL_MODEL_STATE: ModelState = {
  status: "IDLE",
  speech: "",
  displayedSpeech: "",
  confidence: null,
};

/* ─────────────────────────── Hooks ─────────────────────────── */

function useTypewriter(
  target: string,
  active: boolean,
  reducedMotion: boolean
): string {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  const raf = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      setDisplayed(target);
      return;
    }
    idx.current = 0;
    setDisplayed("");
    function tick() {
      idx.current += 2;
      setDisplayed(target.slice(0, idx.current));
      if (idx.current < target.length) {
        raf.current = setTimeout(tick, 18);
      }
    }
    raf.current = setTimeout(tick, 18);
    return () => {
      if (raf.current) clearTimeout(raf.current);
    };
  }, [target, active, reducedMotion]);

  return displayed;
}

/* ─────────────────────────── Sub-components ─────────────────── */

function StatusBadge({ status }: { status: ModelStatus }) {
  const styles: Record<ModelStatus, { bg: string; text: string; shape: string }> = {
    IDLE: { bg: "#1f2937", text: "#6b7280", shape: "●" },
    THINKING: { bg: "rgba(184,144,42,0.15)", text: "#b8902a", shape: "◈" },
    SPEAKING: { bg: "rgba(212,168,67,0.2)", text: "#d4a843", shape: "◉" },
    VOTED: { bg: "rgba(16,185,129,0.15)", text: "#10b981", shape: "✓" },
  };
  const s = styles[status];
  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: s.bg,
        color: s.text,
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "10px",
        fontFamily: "var(--font-outfit)",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      <span aria-hidden="true">{s.shape}</span>
      {status}
    </span>
  );
}

function ModelSeat({
  id,
  state,
  reducedMotion,
  style,
}: {
  id: keyof typeof MODEL_CONFIG;
  state: ModelState;
  reducedMotion: boolean;
  style?: React.CSSProperties;
}) {
  const cfg = MODEL_CONFIG[id];
  const isThinking = state.status === "THINKING";
  const isSpeaking = state.status === "SPEAKING";

  const displayedText = useTypewriter(
    state.speech,
    isSpeaking,
    reducedMotion
  );

  return (
    <article
      aria-label={`${cfg.label} seat — ${state.status}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "200px",
        ...style,
      }}
    >
      {/* Emblem */}
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: `2px solid ${cfg.color}`,
            background: cfg.colorDim,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            fontFamily: "var(--font-syne)",
            fontWeight: 800,
            color: cfg.color,
            animation: isThinking && !reducedMotion ? "pulse-breathe 2s ease-in-out infinite" : "none",
            boxShadow: isSpeaking
              ? `0 0 24px ${cfg.color}60, 0 0 48px ${cfg.color}20`
              : "none",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {cfg.initials}
        </div>
        {/* Thinking ring */}
        {isThinking && !reducedMotion && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-4px",
              borderRadius: "50%",
              border: `1px solid ${cfg.color}40`,
              animation: "ring-expand 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Model name */}
      <div
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 700,
          fontSize: "11px",
          letterSpacing: "0.16em",
          color: cfg.color,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {cfg.label}
      </div>

      <StatusBadge status={state.status} />

      {/* Confidence (voted) */}
      {state.status === "VOTED" && state.confidence !== null && (
        <div
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "12px",
            color: "#b8902a",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {state.confidence}% confidence
        </div>
      )}

      {/* Speech bubble */}
      <div
        style={{
          minHeight: "64px",
          maxHeight: "120px",
          overflow: "hidden",
          fontSize: "12px",
          lineHeight: "1.6",
          color: "#9ca3af",
          fontFamily: "monospace",
          textAlign: "center",
          padding: "0 4px",
          transition: "opacity 0.3s ease",
          opacity: isSpeaking ? 1 : 0,
        }}
        aria-live="polite"
        aria-label={`${cfg.label} speaking`}
      >
        {isSpeaking ? (reducedMotion ? state.speech : displayedText) : ""}
      </div>
    </article>
  );
}

function PhaseBar({ current }: { current: Phase | null }) {
  return (
    <div
      role="list"
      aria-label="Debate phases"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        justifyContent: "center",
      }}
    >
      {PHASES.map((phase, i) => {
        const active = current === phase;
        const past =
          current !== null &&
          PHASES.indexOf(current) > PHASES.indexOf(phase);
        return (
          <div
            key={phase}
            role="listitem"
            style={{ display: "flex", alignItems: "center" }}
          >
            {i > 0 && (
              <div
                aria-hidden="true"
                style={{
                  width: "40px",
                  height: "1px",
                  background: past || active ? "#b8902a" : "#1f2937",
                  transition: "background 0.6s ease",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: active
                    ? "#b8902a"
                    : past
                    ? "#6b5a1f"
                    : "#1f2937",
                  border: active ? "2px solid #d4a843" : "2px solid transparent",
                  boxShadow: active ? "0 0 10px #b8902a80" : "none",
                  transition: "background 0.6s ease, box-shadow 0.6s ease",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "#b8902a" : past ? "#6b5a1f" : "#374151",
                  transition: "color 0.6s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordPanel({ events }: { events: CouncilEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [events]);

  return (
    <section
      aria-label="Parliamentary record"
      style={{
        width: "300px",
        flexShrink: 0,
        background: "#0d1117",
        border: "1px solid #1f2937",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1f2937",
          fontFamily: "var(--font-syne)",
          fontSize: "10px",
          letterSpacing: "0.16em",
          color: "#b8902a",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        The Record
      </div>
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
          gap: "10px",
          scrollbarWidth: "thin",
          scrollbarColor: "#1f2937 transparent",
        }}
      >
        {events.length === 0 ? (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#374151",
              textAlign: "center",
              paddingTop: "24px",
            }}
          >
            — No session active —
          </div>
        ) : (
          events.map((ev, i) => {
            const modelCfg =
              ev.model && ev.model !== "system"
                ? MODEL_CONFIG[ev.model as keyof typeof MODEL_CONFIG]
                : null;
            const time = new Date(ev.timestamp).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <article
                key={i}
                style={{
                  fontFamily: "monospace",
                  fontSize: "10px",
                  lineHeight: "1.6",
                  color: "#4b5563",
                  borderLeft: `2px solid ${modelCfg?.color ?? "#1f2937"}`,
                  paddingLeft: "8px",
                }}
              >
                <div
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: "#374151",
                    marginBottom: "2px",
                  }}
                >
                  [{time}]{" "}
                  <span style={{ color: modelCfg?.color ?? "#6b7280" }}>
                    {ev.model.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: "#6b7280" }}>
                  {(ev.content ?? ev.recommendation ?? "").slice(0, 140)}
                  {(ev.content ?? ev.recommendation ?? "").length > 140
                    ? "…"
                    : ""}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function VerdictPanel({
  verdict,
  reducedMotion,
}: {
  verdict: Verdict | null;
  reducedMotion: boolean;
}) {
  const [show, setShow] = useState(false);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (!verdict) return;
    setShow(false);
    setStamped(false);
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setStamped(true), reducedMotion ? 100 : 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [verdict, reducedMotion]);

  if (!verdict) return null;

  const confidenceColor =
    verdict.confidence === "HIGH"
      ? "#10b981"
      : verdict.confidence === "MEDIUM"
      ? "#b8902a"
      : "#f43f5e";

  return (
    <section
      aria-live="assertive"
      aria-label="Council final verdict"
      role="region"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#0a0d14",
        borderTop: "2px solid #b8902a",
        boxShadow: "0 -8px 40px rgba(184,144,42,0.25)",
        padding: "20px 32px",
        transform: show ? "translateY(0)" : "translateY(100%)",
        transition: reducedMotion ? "none" : "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
        }}
      >
        {/* Stamp */}
        <div
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            border: "3px solid #b8902a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            opacity: stamped ? 1 : 0,
            transform: stamped ? "scale(1) rotate(-8deg)" : "scale(2) rotate(-8deg)",
            transition: reducedMotion
              ? "none"
              : "opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: "7px",
              letterSpacing: "0.1em",
              color: "#b8902a",
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            COUNCIL<br />DECISION
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-syne)",
                fontSize: "11px",
                letterSpacing: "0.16em",
                color: "#b8902a",
                textTransform: "uppercase",
              }}
            >
              Final Recommendation
            </span>
            <span
              style={{
                background: confidenceColor + "20",
                color: confidenceColor,
                border: `1px solid ${confidenceColor}40`,
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "10px",
                fontFamily: "var(--font-outfit)",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              {verdict.confidence} CONFIDENCE
            </span>
          </div>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "14px",
              lineHeight: "1.7",
              color: "#e5e7eb",
              marginBottom: verdict.dissent ? "10px" : 0,
            }}
          >
            {verdict.recommendation}
          </p>
          {verdict.dissent && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#6b7280",
                borderLeft: "2px solid #374151",
                paddingLeft: "10px",
              }}
            >
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
            [modelId]: {
              ...prev[modelId],
              status: "THINKING",
              speech: ev.content ?? "",
            },
          }));
        } else if (ev.type === "speaking") {
          setModels((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              status: "SPEAKING",
              speech: ev.content ?? "",
              displayedSpeech: "",
              confidence:
                typeof ev.confidence === "number" ? ev.confidence : null,
            },
          }));
          // After speaking, transition to VOTED if has confidence, else IDLE
          setTimeout(
            () => {
              setModels((prev) => ({
                ...prev,
                [modelId]: {
                  ...prev[modelId],
                  status:
                    typeof ev.confidence === "number" ? "VOTED" : "IDLE",
                },
              }));
            },
            reducedMotion ? 100 : (ev.content?.length ?? 100) * 18 + 2000
          );
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
      } catch {
        // silently ignore
      }
    }

    poll();
    const interval = setInterval(poll, useMock ? 10000 : 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [useMock, processEvents]);

  // Elapsed timer
  useEffect(() => {
    if (!sessionStart) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  const seatPositions = [
    { id: "gemini" as const, top: "0px", left: "50%", transform: "translateX(-50%)" },
    { id: "gpt" as const, top: "110px", left: "60px", transform: "none" },
    { id: "claude" as const, top: "110px", right: "60px", left: "auto", transform: "none" },
  ];

  return (
    <>
      {/* Skip to content */}
      <a
        href="#chamber-main"
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          zIndex: 9999,
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.top = "8px";
          (e.currentTarget as HTMLAnchorElement).style.left = "8px";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.top = "-9999px";
          (e.currentTarget as HTMLAnchorElement).style.left = "-9999px";
        }}
      >
        Skip to content
      </a>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes pulse-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.96); }
        }
        @keyframes ring-expand {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes seat-reveal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

        .council-seat {
          animation: seat-reveal 0.6s ease both;
        }
        .council-seat:nth-child(1) { animation-delay: 0.1s; }
        .council-seat:nth-child(2) { animation-delay: 0.25s; }
        .council-seat:nth-child(3) { animation-delay: 0.4s; }

        :focus-visible {
          outline: 2px solid #b8902a;
          outline-offset: 3px;
          border-radius: 4px;
        }

        .record-panel::-webkit-scrollbar {
          width: 4px;
        }
        .record-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        .record-panel::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 2px;
        }
      `}</style>

      <div
        id="chamber-main"
        style={{
          minHeight: "100vh",
          background: "#0a0d14",
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 50% 45%, rgba(184,144,42,0.06) 0%, transparent 70%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")
          `,
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          paddingBottom: verdict ? "180px" : "0",
          transition: verdict ? "padding-bottom 0.5s ease" : "none",
        }}
      >
        {/* Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)",
            zIndex: 1,
          }}
        />

        {/* Header */}
        <header
          style={{
            position: "relative",
            zIndex: 10,
            borderBottom: "1px solid #1f2937",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h1
              style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.2em",
                color: "#b8902a",
                textTransform: "uppercase",
              }}
            >
              The Council
            </h1>
            <div
              aria-hidden="true"
              style={{ width: "1px", height: "20px", background: "#1f2937" }}
            />
            <PhaseBar current={currentPhase} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {sessionStart && (
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  color: "#4b5563",
                  fontVariantNumeric: "tabular-nums",
                }}
                aria-label={`Session elapsed: ${elapsed} seconds`}
              >
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </span>
            )}

            <button
              onClick={() => {
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
              }}
              style={{
                fontFamily: "var(--font-outfit)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: useMock ? "#b8902a" : "#4b5563",
                background: useMock ? "rgba(184,144,42,0.1)" : "transparent",
                border: `1px solid ${useMock ? "#b8902a40" : "#1f2937"}`,
                borderRadius: "4px",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              {useMock ? "◉ Demo" : "○ Live"}
            </button>
          </div>
        </header>

        {/* Body */}
        <main
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            gap: "24px",
            padding: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* Chamber + Podium */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Semicircular seating arc */}
            <section
              aria-label="Council chamber seating"
              style={{
                position: "relative",
                height: "320px",
                opacity: mounted ? 1 : 0,
                transition: reducedMotion ? "none" : "opacity 0.4s ease",
              }}
            >
              {/* Arc visual hint */}
              <svg
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "440px",
                  height: "220px",
                  overflow: "visible",
                  pointerEvents: "none",
                }}
                viewBox="0 0 440 220"
              >
                <path
                  d="M 40 210 A 200 200 0 0 1 400 210"
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
              </svg>

              {/* Seats */}
              {seatPositions.map(({ id, ...pos }, i) => (
                <div
                  key={id}
                  className="council-seat"
                  style={{
                    position: "absolute",
                    animationDelay: `${i * 0.15}s`,
                    ...pos,
                  }}
                >
                  <ModelSeat
                    id={id}
                    state={models[id]}
                    reducedMotion={reducedMotion}
                  />
                </div>
              ))}

              {/* Center label */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-syne)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  color: "#374151",
                  textTransform: "uppercase",
                }}
              >
                ⬡ Deliberation Chamber
              </div>
            </section>

            {/* Gold divider */}
            <div
              aria-hidden="true"
              style={{
                height: "1px",
                background:
                  "linear-gradient(to right, transparent, #b8902a40, #b8902a80, #b8902a40, transparent)",
              }}
            />

            {/* Podium */}
            <section
              aria-label="Podium — current motion and phase"
              style={{
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "8px",
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  color: "#b8902a",
                  textTransform: "uppercase",
                }}
              >
                Motion Under Debate
              </div>

              <p
                style={{
                  fontFamily: "Georgia, 'Playfair Display', serif",
                  fontSize: "18px",
                  fontStyle: currentQuestion ? "italic" : "normal",
                  lineHeight: "1.6",
                  color: currentQuestion ? "#e5e7eb" : "#374151",
                  minHeight: "56px",
                }}
              >
                {currentQuestion || "No active session. Switch to Demo mode or start a debate."}
              </p>

              <div
                aria-hidden="true"
                style={{
                  height: "1px",
                  background: "#1f2937",
                }}
              />

              <PhaseBar current={currentPhase} />
            </section>
          </div>

          {/* Record panel */}
          <RecordPanel events={events} />
        </main>
      </div>

      {/* Final Verdict */}
      <VerdictPanel verdict={verdict} reducedMotion={reducedMotion} />
    </>
  );
}
