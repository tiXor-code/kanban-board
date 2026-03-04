"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface RoadmapTask {
  id: string;
  name: string;
  description: string;
  uxSpec: string;
  techDetails: string;
  estimatedHours: number;
  status: "planned" | "in_progress" | "done";
}

interface RoadmapEpic {
  id: string;
  name: string;
  description: string;
  phase: string;
  techStack: string[];
  estimatedWeeks: number;
  tasks: RoadmapTask[];
}

interface RoadmapPhase {
  id: string;
  name: string;
  order: number;
  epics: RoadmapEpic[];
}

interface Roadmap {
  id: string;
  businessName: string;
  status: "running" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
  tokens: number;
  cost: number;
  rounds: number;
  phases: RoadmapPhase[];
  gtmStrategy?: Record<string, any>;
  financialModel?: Record<string, any>;
  risks?: string[];
}

// Live process tracking
interface AgentState {
  id: string;
  name: string;
  status: "idle" | "generating" | "done" | "error";
  preview: string;
  tokenCount: number;
  durationMs?: number;
}

interface LiveProcessState {
  sessionId: string;
  businessName: string;
  currentRound: number;
  totalRounds: number;
  currentFocus: string;
  stage: string;
  agents: AgentState[];
  tokens: number;
  cost: number;
  log: string[];
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const COUNCIL_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3400"
    : "https://thecouncil-app.azurewebsites.net";

const PHASE_COLORS: Record<string, string> = {
  MVP: "#22d3ee",
  "V1": "#a78bfa",
  "V2": "#f472b6",
  Growth: "#34d399",
  Scale: "#fb923c",
};

const AGENT_META: Record<string, { name: string; color: string; icon: string }> = {
  gemini:    { name: "The Logician",    color: "#60a5fa", icon: "◈" },
  claude:    { name: "The Synthesizer", color: "#a78bfa", icon: "◉" },
  chatgpt:   { name: "The Strategist",  color: "#34d399", icon: "◆" },
  financier: { name: "The Financier",   color: "#fb923c", icon: "◎" },
  growth:    { name: "The Growth Hack", color: "#f472b6", icon: "◈" },
  architect: { name: "The Architect",   color: "#22d3ee", icon: "◇" },
  designer:  { name: "The Designer",    color: "#facc15", icon: "◐" },
};

const FOCUS_LABELS: Record<string, string> = {
  vision: "Vision & Problem",
  mvp: "MVP Definition",
  architecture: "Architecture",
  ux: "UX Strategy",
  gtm: "Go-to-Market",
  financial: "Financial Model",
  scaling: "Scaling Plan",
  refinement: "Refinement",
};

function phaseColor(name: string): string {
  return PHASE_COLORS[name] || PHASE_COLORS[Object.keys(PHASE_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase())) || ""] || "#8998b0";
}

function epicProgress(epic: RoadmapEpic) {
  const total = epic.tasks.length;
  const done = epic.tasks.filter((t) => t.status === "done").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function epicStatusColor(epic: RoadmapEpic): string {
  const { pct } = epicProgress(epic);
  if (pct === 100) return "var(--success)";
  if (pct > 0) return "var(--accent)";
  return "var(--text-dim)";
}

// ═══════════════════════════════════════════
// Live Process Panel
// ═══════════════════════════════════════════

function LiveProcessPanel({ liveState }: { liveState: LiveProcessState }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [liveState.log]);

  const agentList = Object.entries(AGENT_META);
  const doneAgents = liveState.agents.filter(a => a.status === "done").length;
  const totalAgents = agentList.length;
  const agentPct = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0;

  return (
    <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "#a78bfa",
          boxShadow: "0 0 8px #a78bfa",
          animation: "livePulse 1.5s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa",
        }}>
          Live: Round {liveState.currentRound}/{liveState.totalRounds}
          {liveState.currentFocus && ` — ${FOCUS_LABELS[liveState.currentFocus] || liveState.currentFocus}`}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 12, color: "var(--text-dim)" }}>
          <span>{(liveState.tokens / 1000).toFixed(0)}k tokens</span>
          <span style={{ color: liveState.cost > 5 ? "#fb923c" : "var(--text-dim)" }}>
            ${liveState.cost.toFixed(2)}
          </span>
          <span>{liveState.stage && `Stage: ${liveState.stage}`}</span>
        </div>
      </div>

      {/* Round progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
          <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}>
            ROUND PROGRESS
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            {liveState.currentRound > 0 ? liveState.currentRound - 1 : 0}/{liveState.totalRounds} complete
          </span>
        </div>
        <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${liveState.totalRounds > 0 ? ((liveState.currentRound - 1) / liveState.totalRounds) * 100 : 0}%`,
            background: "linear-gradient(to right, #a78bfa, #60a5fa)",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
        {/* Round dots */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {Array.from({ length: liveState.totalRounds }, (_, i) => {
            const roundFocus = ["vision","mvp","architecture","ux","gtm","financial","scaling","refinement","refinement","refinement"][i];
            const isDone = i < liveState.currentRound - 1;
            const isCurrent = i === liveState.currentRound - 1;
            return (
              <div key={i} title={FOCUS_LABELS[roundFocus] || roundFocus} style={{
                flex: 1, height: 24, borderRadius: 3,
                background: isDone ? "#a78bfa" : isCurrent ? "#a78bfa33" : "var(--surface)",
                border: `1px solid ${isCurrent ? "#a78bfa" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: isDone ? "#000" : isCurrent ? "#a78bfa" : "var(--text-dim)",
                fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em",
                textTransform: "uppercase", transition: "all 0.3s ease",
                overflow: "hidden", cursor: "default",
              }}>
                {isDone ? "✓" : (roundFocus || "").slice(0,3).toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 10,
        marginBottom: 16,
      }}>
        {agentList.map(([id, meta]) => {
          const agentState = liveState.agents.find(a => a.id === id);
          const status = agentState?.status || "idle";
          const preview = agentState?.preview || "";
          const isCritique = liveState.stage?.startsWith("critique");

          const statusColor = {
            idle: "var(--border)",
            generating: meta.color,
            done: "var(--success)",
            error: "var(--danger)",
          }[status];

          return (
            <div key={id} style={{
              background: "var(--surface)",
              border: `1px solid ${status === "generating" ? meta.color + "60" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              transition: "all 0.2s ease",
              boxShadow: status === "generating" ? `0 0 12px ${meta.color}20` : "none",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Generating glow line */}
              {status === "generating" && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(to right, transparent, ${meta.color}, transparent)`,
                  animation: "shimmer 2s linear infinite",
                }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: meta.color }}>{meta.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: statusColor,
                  fontFamily: "var(--font-display)", letterSpacing: "0.05em",
                }}>
                  {meta.name}
                </span>
                <div style={{ marginLeft: "auto" }}>
                  {status === "generating" && (
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: meta.color, animation: "livePulse 0.8s ease-in-out infinite",
                    }} />
                  )}
                  {status === "done" && <span style={{ fontSize: 10, color: "var(--success)" }}>✓</span>}
                  {status === "error" && <span style={{ fontSize: 10, color: "var(--danger)" }}>✗</span>}
                </div>
              </div>
              {/* Preview text */}
              <div style={{
                fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5,
                height: 48, overflow: "hidden",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any,
                fontStyle: preview ? "normal" : "italic",
              }}>
                {preview || (status === "idle" ? "Waiting..." : status === "generating" ? "Thinking..." : isCritique ? "Critiquing..." : "")}
              </div>
              {agentState?.durationMs && status === "done" && (
                <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>
                  {(agentState.durationMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity log */}
      {liveState.log.length > 0 && (
        <div
          ref={logRef}
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            maxHeight: 120,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 10,
            color: "var(--text-dim)",
            lineHeight: 1.6,
          }}
        >
          {liveState.log.slice(-20).map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizDesc, setNewBizDesc] = useState("");

  // Live process states per session
  const [liveProcesses, setLiveProcesses] = useState<Record<string, LiveProcessState>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const fetchRoadmaps = useCallback(async () => {
    try {
      const res = await fetch(`${COUNCIL_URL}/api/roadmap/sessions`);
      if (!res.ok) throw new Error("Failed to fetch");
      const sessions = await res.json();

      const full: Roadmap[] = await Promise.all(
        sessions.map(async (s: any) => {
          if (s.status === "complete") {
            try {
              const detail = await fetch(`${COUNCIL_URL}/api/roadmap/sessions/${s.id}`);
              const data = await detail.json();
              return {
                id: s.id,
                businessName: s.businessName,
                status: s.status,
                startedAt: s.startedAt,
                completedAt: s.completedAt,
                tokens: s.tokens,
                cost: s.cost,
                rounds: s.rounds,
                phases: data.roadmap?.phases || [],
                gtmStrategy: data.roadmap?.gtmStrategy,
                financialModel: data.roadmap?.financialModel,
                risks: data.roadmap?.risks,
              };
            } catch {
              return { ...s, phases: [] };
            }
          }
          return { ...s, phases: [] };
        })
      );

      setRoadmaps(full);
      if (full.length > 0 && !selected) {
        // Prefer complete, then running
        const firstComplete = full.find(r => r.status === "complete");
        const firstRunning = full.find(r => r.status === "running");
        setSelected((firstComplete || firstRunning || full[0]).id);
      }
    } catch (e) {
      console.error("Failed to load roadmaps:", e);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  // WebSocket for live progress
  useEffect(() => {
    const wsUrl = COUNCIL_URL.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log("[WS] Connected to Council");
    ws.onerror = (e) => console.error("[WS] Error:", e);

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const sid: string = data.sessionId || "";
        const ts = new Date().toLocaleTimeString();

        if (data.type === "roadmap_start") {
          setLiveProcesses(prev => ({
            ...prev,
            [sid]: {
              sessionId: sid,
              businessName: data.businessName || "Untitled",
              currentRound: 0,
              totalRounds: 10,
              currentFocus: "",
              stage: "starting",
              agents: [],
              tokens: 0,
              cost: 0,
              log: [`[${ts}] Started: ${data.businessName}`],
            }
          }));
          setGenerating(true);
          setSelected(sid);
        }

        if (data.type === "roadmap_round_start") {
          setLiveProcesses(prev => {
            const existing = prev[sid] || { sessionId: sid, businessName: "...", agents: [], log: [], tokens: 0, cost: 0, stage: "", currentFocus: "", currentRound: 0, totalRounds: 10 };
            return {
              ...prev,
              [sid]: {
                ...existing,
                currentRound: data.round,
                currentFocus: data.focus,
                stage: "generate",
                // Reset agents for new round
                agents: Object.keys(AGENT_META).map(id => ({
                  id, name: AGENT_META[id].name,
                  status: "idle" as const, preview: "", tokenCount: 0,
                })),
                log: [...existing.log, `[${ts}] Round ${data.round}: ${FOCUS_LABELS[data.focus] || data.focus}`],
              }
            };
          });
        }

        if (data.type === "roadmap_agent_chunk") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            const agentId: string = data.agentId;
            const agents = existing.agents.map(a => {
              if (a.id !== agentId) return a;
              const newPreview = (a.preview + (data.content || "")).slice(-200);
              return { ...a, status: "generating" as const, preview: newPreview };
            });
            // If agent not in list yet, add it
            if (!agents.find(a => a.id === agentId)) {
              agents.push({
                id: agentId, name: AGENT_META[agentId]?.name || agentId,
                status: "generating", preview: (data.content || "").slice(-200), tokenCount: 0,
              });
            }
            return { ...prev, [sid]: { ...existing, agents } };
          });
        }

        if (data.type === "roadmap_stage") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            const stageName: string = data.stage || "";
            // When critique starts, mark all generating agents as done
            const agents = stageName.startsWith("critique")
              ? existing.agents.map(a => ({ ...a, status: a.status === "generating" ? "done" as const : a.status }))
              : existing.agents;
            return {
              ...prev,
              [sid]: {
                ...existing,
                stage: stageName,
                agents,
                log: [...existing.log, `[${ts}] Stage: ${stageName}`],
              }
            };
          });
        }

        if (data.type === "roadmap_progress") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            return {
              ...prev,
              [sid]: {
                ...existing,
                currentRound: data.round,
                totalRounds: data.totalRounds || existing.totalRounds,
                tokens: data.tokens,
                cost: data.cost,
                agents: existing.agents.map(a => ({ ...a, status: a.status === "generating" ? "done" as const : a.status })),
                log: [...existing.log, `[${ts}] Round ${data.round} done — ${(data.tokens/1000).toFixed(0)}k tokens — $${data.cost?.toFixed(2)}`],
              }
            };
          });

          // Refresh session list to show updated round count
          fetchRoadmaps();
        }

        if (data.type === "roadmap_warning") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            return {
              ...prev,
              [sid]: {
                ...existing,
                log: [...existing.log, `[${ts}] ⚠ ${data.message}`],
              }
            };
          });
        }

        if (data.type === "roadmap_session_complete" || data.type === "roadmap_complete") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            return {
              ...prev,
              [sid]: {
                ...existing,
                stage: "complete",
                log: [...existing.log, `[${ts}] ✓ Roadmap complete`],
              }
            };
          });
          setGenerating(false);
          setTimeout(() => fetchRoadmaps(), 1000);
        }

        if (data.type === "roadmap_error") {
          setLiveProcesses(prev => {
            const existing = prev[sid];
            if (!existing) return prev;
            return {
              ...prev,
              [sid]: {
                ...existing,
                stage: "error",
                log: [...existing.log, `[${ts}] ✗ ERROR: ${data.message}`],
              }
            };
          });
        }
      } catch {}
    };

    return () => ws.close();
  }, [fetchRoadmaps]);

  const startGeneration = async () => {
    if (!newBizDesc.trim()) return;
    setGenerating(true);
    setShowNewForm(false);

    try {
      const res = await fetch(`${COUNCIL_URL}/api/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: newBizName || "Untitled",
          description: newBizDesc,
          maxRounds: 10,
        }),
      });
      const data = await res.json();
      setSelected(data.sessionId);
      fetchRoadmaps();
    } catch (e) {
      setGenerating(false);
    }
  };

  const toggleTaskStatus = (epicId: string, taskId: string) => {
    setRoadmaps((prev) =>
      prev.map((rm) => {
        if (rm.id !== selected) return rm;
        return {
          ...rm,
          phases: rm.phases.map((p) => ({
            ...p,
            epics: p.epics.map((e) => {
              if (e.id !== epicId) return e;
              return {
                ...e,
                tasks: e.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: t.status === "done" ? "planned" as const : "done" as const }
                    : t
                ),
              };
            }),
          })),
        };
      })
    );
  };

  const current = roadmaps.find((r) => r.id === selected);
  const selectedLive = selected ? liveProcesses[selected] : null;
  const runningRoadmaps = roadmaps.filter(r => r.status === "running");
  const hasLiveData = selectedLive && selectedLive.currentRound > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 64, fontFamily: "var(--font-body)" }}>

      {/* ═══════════ TOP BAR ═══════════ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800,
            letterSpacing: "0.05em", textTransform: "uppercase", color: "#a78bfa",
          }}>
            ◈ Roadmap
          </h1>

          {/* Business selector */}
          <select
            value={selected || ""}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text)",
              padding: "6px 12px", fontSize: 13, fontFamily: "var(--font-body)",
              cursor: "pointer", minWidth: 200,
            }}
          >
            {roadmaps.length === 0 && <option value="">No roadmaps yet</option>}
            {roadmaps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.businessName}
                {r.status === "running" ? ` (round ${r.rounds}/10...)` : ""}
                {r.status === "error" ? " ✗" : ""}
              </option>
            ))}
          </select>

          {/* Running indicator */}
          {runningRoadmaps.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.3)", borderRadius: "var(--radius-sm)",
              fontSize: 11, color: "#a78bfa", fontFamily: "var(--font-display)",
              fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: "#a78bfa",
                animation: "livePulse 1s ease-in-out infinite",
              }} />
              {runningRoadmaps.length} running
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            style={{
              background: "#a78bfa", color: "#000", border: "none",
              borderRadius: "var(--radius-sm)", padding: "8px 16px",
              fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)",
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            + New Roadmap
          </button>
        </div>
      </div>

      {/* ═══════════ NEW FORM ═══════════ */}
      {showNewForm && (
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              value={newBizName}
              onChange={(e) => setNewBizName(e.target.value)}
              placeholder="Business name (e.g. JobMap)"
              style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", color: "var(--text)",
                padding: "10px 14px", fontSize: 14,
              }}
            />
            <textarea
              value={newBizDesc}
              onChange={(e) => setNewBizDesc(e.target.value)}
              placeholder="Describe the business idea in detail..."
              rows={5}
              style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", color: "var(--text)",
                padding: "10px 14px", fontSize: 14,
                resize: "vertical", fontFamily: "var(--font-body)",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={startGeneration}
                disabled={generating || !newBizDesc.trim()}
                style={{
                  background: generating ? "var(--surface2)" : "#a78bfa",
                  color: generating ? "var(--text-dim)" : "#000",
                  border: "none", borderRadius: "var(--radius-sm)",
                  padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: generating ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                {generating ? "Generating..." : "Generate via Council"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                style={{
                  background: "transparent", color: "var(--text-dim)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  padding: "10px 16px", fontSize: 13, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LOADING ═══════════ */}
      {loading && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-dim)" }}>
          Loading roadmaps...
        </div>
      )}

      {/* ═══════════ LIVE PROCESS PANEL ═══════════ */}
      {(current?.status === "running" || hasLiveData) && (
        <LiveProcessPanel
          liveState={selectedLive || {
            sessionId: selected || "",
            businessName: current?.businessName || "...",
            currentRound: current?.rounds || 0,
            totalRounds: 10,
            currentFocus: "",
            stage: current?.status === "running" ? "running" : "idle",
            agents: [],
            tokens: current?.tokens || 0,
            cost: current?.cost || 0,
            log: [`Session is processing... round ${current?.rounds || 0}/10`],
          }}
        />
      )}

      {/* ═══════════ NO ROADMAPS ═══════════ */}
      {!loading && roadmaps.filter(r => r.status === "complete").length === 0 && !showNewForm && current?.status !== "running" && !hasLiveData && (
        <div style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "var(--text-dim)", fontSize: 16, marginBottom: 16 }}>
            No roadmaps yet. Generate one using The Council.
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            style={{
              background: "#a78bfa", color: "#000", border: "none",
              borderRadius: "var(--radius-sm)", padding: "12px 24px",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            + Create First Roadmap
          </button>
        </div>
      )}

      {/* ═══════════ COMPLETE ROADMAP ═══════════ */}
      {current && current.status === "complete" && current.phases.length > 0 && (
        <>
          {/* Phase timeline */}
          <div style={{ overflowX: "auto", padding: "32px 32px 16px" }}>
            <div style={{ display: "flex", gap: 24, minWidth: "max-content", position: "relative" }}>
              <div style={{
                position: "absolute", top: 20, left: 0, right: 0, height: 2,
                background: "linear-gradient(to right, #a78bfa33, #a78bfa, #a78bfa33)", zIndex: 0,
              }} />

              {current.phases.map((phase, pi) => {
                const allTasks = phase.epics.flatMap((e) => e.tasks);
                const doneTasks = allTasks.filter((t) => t.status === "done").length;
                const totalTasks = allTasks.length;
                const phasePct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
                const color = phaseColor(phase.name);

                return (
                  <div key={phase.id} style={{ minWidth: 280, maxWidth: 360, flex: "0 0 auto", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: phasePct === 100 ? color : "var(--surface)",
                        border: `2px solid ${color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800,
                        color: phasePct === 100 ? "#000" : color,
                        fontFamily: "var(--font-display)", flexShrink: 0,
                      }}>
                        {phasePct === 100 ? "✓" : pi + 1}
                      </div>
                      <div>
                        <div style={{
                          fontSize: 14, fontWeight: 800, fontFamily: "var(--font-display)",
                          textTransform: "uppercase", letterSpacing: "0.08em", color,
                        }}>
                          {phase.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {doneTasks}/{totalTasks} tasks — {phasePct}%
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 3, background: "var(--surface2)", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${phasePct}%`, background: color, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {phase.epics.map((epic) => {
                        const prog = epicProgress(epic);
                        const isExpanded = expandedEpic === epic.id;

                        return (
                          <div key={epic.id}>
                            <button
                              onClick={() => setExpandedEpic(isExpanded ? null : epic.id)}
                              style={{
                                width: "100%", textAlign: "left",
                                background: isExpanded ? "var(--surface2)" : "var(--surface)",
                                border: `1px solid ${isExpanded ? color + "40" : "var(--border)"}`,
                                borderRadius: "var(--radius-sm)", padding: "12px 14px",
                                cursor: "pointer", transition: "all 0.2s ease",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: epicStatusColor(epic) }}>
                                  {prog.pct === 100 ? "✓ " : ""}{epic.name}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                                  {prog.done}/{prog.total}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                                {epic.description.slice(0, 80)}{epic.description.length > 80 ? "..." : ""}
                              </div>
                              <div style={{ height: 2, background: "var(--border)", borderRadius: 1, marginTop: 8, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${prog.pct}%`, background: epicStatusColor(epic), transition: "width 0.3s ease" }} />
                              </div>
                              {epic.techStack.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                                  {epic.techStack.slice(0, 4).map((tech, ti) => (
                                    <span key={ti} style={{
                                      fontSize: 9, padding: "2px 6px", borderRadius: 3,
                                      background: color + "15", color,
                                      fontWeight: 600, fontFamily: "var(--font-display)",
                                      textTransform: "uppercase", letterSpacing: "0.05em",
                                    }}>
                                      {tech}
                                    </span>
                                  ))}
                                  {epic.techStack.length > 4 && (
                                    <span style={{ fontSize: 9, color: "var(--text-dim)" }}>+{epic.techStack.length - 4}</span>
                                  )}
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>~{epic.estimatedWeeks}w</div>
                            </button>

                            {isExpanded && (
                              <div style={{
                                background: "var(--bg)", border: `1px solid ${color}25`,
                                borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                                padding: 16,
                              }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {epic.tasks.map((task) => (
                                    <div key={task.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                      <button
                                        onClick={() => toggleTaskStatus(epic.id, task.id)}
                                        style={{
                                          width: 18, height: 18, borderRadius: 3,
                                          border: `2px solid ${task.status === "done" ? "var(--success)" : "var(--border)"}`,
                                          background: task.status === "done" ? "var(--success)" : "transparent",
                                          cursor: "pointer", flexShrink: 0, marginTop: 2,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          fontSize: 10, color: "#000", fontWeight: 900,
                                        }}
                                      >
                                        {task.status === "done" ? "✓" : ""}
                                      </button>
                                      <div style={{ flex: 1 }}>
                                        <div style={{
                                          fontSize: 13, fontWeight: 600,
                                          color: task.status === "done" ? "var(--text-dim)" : "var(--text)",
                                          textDecoration: task.status === "done" ? "line-through" : "none",
                                        }}>
                                          {task.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                                          {task.description}
                                        </div>
                                        {task.uxSpec && (
                                          <div style={{
                                            fontSize: 10, color: "#a78bfa", marginTop: 4,
                                            padding: "4px 8px", background: "rgba(167,139,250,0.08)",
                                            borderRadius: 3, borderLeft: "2px solid #a78bfa",
                                          }}>
                                            <strong>UX:</strong> {task.uxSpec}
                                          </div>
                                        )}
                                        {task.techDetails && (
                                          <div style={{
                                            fontSize: 10, color: "var(--accent)", marginTop: 4,
                                            padding: "4px 8px", background: "var(--accent-dim)",
                                            borderRadius: 3, borderLeft: "2px solid var(--accent)",
                                          }}>
                                            <strong>Tech:</strong> {task.techDetails}
                                          </div>
                                        )}
                                        <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>~{task.estimatedHours}h</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom panels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, padding: "16px 32px 32px" }}>
            {current.gtmStrategy && Object.keys(current.gtmStrategy).length > 0 && (
              <InfoPanel title="GTM Strategy" color="#34d399" data={current.gtmStrategy} />
            )}
            {current.financialModel && Object.keys(current.financialModel).length > 0 && (
              <InfoPanel title="Financial Model" color="#fb923c" data={current.financialModel} />
            )}
            {current.risks && current.risks.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--danger)", marginBottom: 12 }}>
                  Risks
                </h3>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {current.risks.map((risk, i) => (
                    <li key={i} style={{ fontSize: 12, color: "var(--text-mid)", display: "flex", gap: 6 }}>
                      <span style={{ color: "var(--danger)", flexShrink: 0 }}>!</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div style={{
            padding: "12px 32px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 24, fontSize: 11, color: "var(--text-dim)",
            fontFamily: "var(--font-display)",
          }}>
            <span>Rounds: {current.rounds}</span>
            <span>Tokens: {(current.tokens / 1000).toFixed(0)}k</span>
            <span>Cost: ${current.cost?.toFixed(2)}</span>
            {current.completedAt && (
              <span>Generated: {new Date(current.completedAt).toLocaleDateString()}</span>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.8); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
}

function InfoPanel({ title, color, data }: { title: string; color: string; data: Record<string, any> }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
      <h3 style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color, marginBottom: 12 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(data).map(([key, val]) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              {key.replace(/([A-Z])/g, " $1").trim()}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-mid)" }}>
              {Array.isArray(val) ? val.join(", ") : String(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
