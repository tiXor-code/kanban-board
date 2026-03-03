"use client";

import { useEffect, useState, useCallback } from "react";

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

// ═══════════════════════════════════════════
// Council URL
// ═══════════════════════════════════════════

const COUNCIL_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3400"
    : "https://thecouncil-app.azurewebsites.net";

// ═══════════════════════════════════════════
// Phase colors
// ═══════════════════════════════════════════

const PHASE_COLORS: Record<string, string> = {
  MVP: "#22d3ee",
  "V1": "#a78bfa",
  "V2": "#f472b6",
  Growth: "#34d399",
  Scale: "#fb923c",
};

function phaseColor(name: string): string {
  return PHASE_COLORS[name] || PHASE_COLORS[Object.keys(PHASE_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase())) || ""] || "#8998b0";
}

// ═══════════════════════════════════════════
// Status helpers
// ═══════════════════════════════════════════

function epicProgress(epic: RoadmapEpic): { done: number; total: number; pct: number } {
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
// Main Component
// ═══════════════════════════════════════════

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizDesc, setNewBizDesc] = useState("");

  // Load roadmaps from Council API
  const fetchRoadmaps = useCallback(async () => {
    try {
      const res = await fetch(`${COUNCIL_URL}/api/roadmap/sessions`);
      if (!res.ok) throw new Error("Failed to fetch");
      const sessions = await res.json();

      // For complete sessions, fetch full data with roadmap
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
      if (full.length > 0 && !selected) setSelected(full[0].id);
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
    const ws = new WebSocket(COUNCIL_URL.replace("http", "ws"));
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "roadmap_progress") {
          setGenProgress(`Round ${data.round}/${data.totalRounds} - $${data.cost?.toFixed(2) || "0.00"}`);
        }
        if (data.type === "roadmap_round_start") {
          setGenProgress(`Round ${data.round}: ${data.focus}`);
        }
        if (data.type === "roadmap_session_complete" || data.type === "roadmap_complete") {
          setGenerating(false);
          setGenProgress("");
          fetchRoadmaps();
        }
      } catch {}
    };
    return () => ws.close();
  }, [fetchRoadmaps]);

  const startGeneration = async () => {
    if (!newBizDesc.trim()) return;
    setGenerating(true);
    setGenProgress("Starting research...");
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
    } catch (e) {
      setGenerating(false);
      setGenProgress("Error starting generation");
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
    // TODO: persist to Turso
  };

  const current = roadmaps.find((r) => r.id === selected);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        paddingTop: 64,
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ═══════════ TOP BAR ═══════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#a78bfa",
            }}
          >
            ◈ Roadmap
          </h1>

          {/* Business selector dropdown */}
          <select
            value={selected || ""}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              padding: "6px 12px",
              fontSize: 13,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              minWidth: 200,
            }}
          >
            {roadmaps.length === 0 && <option value="">No roadmaps yet</option>}
            {roadmaps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.businessName} {r.status === "running" ? "(generating...)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {generating && (
            <span
              style={{
                fontSize: 12,
                color: "#a78bfa",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                animation: "pulse 2s infinite",
              }}
            >
              {genProgress}
            </span>
          )}
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            style={{
              background: "#a78bfa",
              color: "#000",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + New Roadmap
          </button>
        </div>
      </div>

      {/* ═══════════ NEW FORM ═══════════ */}
      {showNewForm && (
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              value={newBizName}
              onChange={(e) => setNewBizName(e.target.value)}
              placeholder="Business name (e.g. JobMap)"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                padding: "10px 14px",
                fontSize: 14,
              }}
            />
            <textarea
              value={newBizDesc}
              onChange={(e) => setNewBizDesc(e.target.value)}
              placeholder="Describe the business idea in detail. Include target audience, problem being solved, current status, revenue goals, tech stack preferences..."
              rows={5}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text)",
                padding: "10px 14px",
                fontSize: 14,
                resize: "vertical",
                fontFamily: "var(--font-body)",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={startGeneration}
                disabled={generating || !newBizDesc.trim()}
                style={{
                  background: generating ? "var(--surface2)" : "#a78bfa",
                  color: generating ? "var(--text-dim)" : "#000",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: generating ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {generating ? "Generating..." : "Generate Roadmap via Council"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                style={{
                  background: "transparent",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LOADING / EMPTY ═══════════ */}
      {loading && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-dim)" }}>
          Loading roadmaps...
        </div>
      )}

      {!loading && !current && !showNewForm && (
        <div style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "var(--text-dim)", fontSize: 16, marginBottom: 16 }}>
            No roadmaps yet. Generate one using The Council.
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            style={{
              background: "#a78bfa",
              color: "#000",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            + Create First Roadmap
          </button>
        </div>
      )}

      {/* ═══════════ GENERATING STATE ═══════════ */}
      {current?.status === "running" && (
        <div style={{ textAlign: "center", padding: 80 }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid var(--border)",
              borderTop: "3px solid #a78bfa",
              borderRadius: "50%",
              margin: "0 auto 24px",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#a78bfa", fontSize: 16, fontWeight: 600 }}>
            The Council is deliberating...
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 8 }}>
            {genProgress || "7 AI experts analyzing your business from every angle"}
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 4 }}>
            This takes 5-15 minutes depending on round count
          </p>
        </div>
      )}

      {/* ═══════════ ROADMAP VISUALIZATION ═══════════ */}
      {current && current.status === "complete" && current.phases.length > 0 && (
        <>
          {/* Phase timeline - horizontal scroll */}
          <div
            style={{
              overflowX: "auto",
              padding: "32px 32px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                minWidth: "max-content",
                position: "relative",
              }}
            >
              {/* Connecting line */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "linear-gradient(to right, #a78bfa33, #a78bfa, #a78bfa33)",
                  zIndex: 0,
                }}
              />

              {current.phases.map((phase, pi) => {
                const allTasks = phase.epics.flatMap((e) => e.tasks);
                const doneTasks = allTasks.filter((t) => t.status === "done").length;
                const totalTasks = allTasks.length;
                const phasePct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
                const color = phaseColor(phase.name);

                return (
                  <div
                    key={phase.id}
                    style={{
                      minWidth: 280,
                      maxWidth: 360,
                      flex: "0 0 auto",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {/* Phase header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: phasePct === 100 ? color : "var(--surface)",
                          border: `2px solid ${color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: phasePct === 100 ? "#000" : color,
                          fontFamily: "var(--font-display)",
                          flexShrink: 0,
                        }}
                      >
                        {phasePct === 100 ? "✓" : pi + 1}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            fontFamily: "var(--font-display)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color,
                          }}
                        >
                          {phase.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {doneTasks}/{totalTasks} tasks - {phasePct}%
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 3,
                        background: "var(--surface2)",
                        borderRadius: 2,
                        marginBottom: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${phasePct}%`,
                          background: color,
                          borderRadius: 2,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>

                    {/* Epics */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {phase.epics.map((epic) => {
                        const prog = epicProgress(epic);
                        const isExpanded = expandedEpic === epic.id;

                        return (
                          <div key={epic.id}>
                            {/* Epic card */}
                            <button
                              onClick={() => setExpandedEpic(isExpanded ? null : epic.id)}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                background: isExpanded ? "var(--surface2)" : "var(--surface)",
                                border: `1px solid ${isExpanded ? color + "40" : "var(--border)"}`,
                                borderRadius: "var(--radius-sm)",
                                padding: "12px 14px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: epicStatusColor(epic),
                                  }}
                                >
                                  {prog.pct === 100 ? "✓ " : ""}{epic.name}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                                  {prog.done}/{prog.total}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                                {epic.description.slice(0, 80)}{epic.description.length > 80 ? "..." : ""}
                              </div>
                              {/* Mini progress */}
                              <div
                                style={{
                                  height: 2,
                                  background: "var(--border)",
                                  borderRadius: 1,
                                  marginTop: 8,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${prog.pct}%`,
                                    background: epicStatusColor(epic),
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                              {/* Tech stack tags */}
                              {epic.techStack.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                                  {epic.techStack.slice(0, 4).map((tech, ti) => (
                                    <span
                                      key={ti}
                                      style={{
                                        fontSize: 9,
                                        padding: "2px 6px",
                                        borderRadius: 3,
                                        background: color + "15",
                                        color: color,
                                        fontWeight: 600,
                                        fontFamily: "var(--font-display)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                  {epic.techStack.length > 4 && (
                                    <span style={{ fontSize: 9, color: "var(--text-dim)" }}>+{epic.techStack.length - 4}</span>
                                  )}
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
                                ~{epic.estimatedWeeks}w
                              </div>
                            </button>

                            {/* Expanded: Task list */}
                            {isExpanded && (
                              <div
                                style={{
                                  background: "var(--bg)",
                                  border: `1px solid ${color}25`,
                                  borderTop: "none",
                                  borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                                  padding: 16,
                                }}
                              >
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {epic.tasks.map((task) => (
                                    <div
                                      key={task.id}
                                      style={{
                                        display: "flex",
                                        gap: 10,
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      {/* Checkbox */}
                                      <button
                                        onClick={() => toggleTaskStatus(epic.id, task.id)}
                                        style={{
                                          width: 18,
                                          height: 18,
                                          borderRadius: 3,
                                          border: `2px solid ${task.status === "done" ? "var(--success)" : "var(--border)"}`,
                                          background: task.status === "done" ? "var(--success)" : "transparent",
                                          cursor: "pointer",
                                          flexShrink: 0,
                                          marginTop: 2,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: 10,
                                          color: "#000",
                                          fontWeight: 900,
                                        }}
                                      >
                                        {task.status === "done" ? "✓" : ""}
                                      </button>
                                      <div style={{ flex: 1 }}>
                                        <div
                                          style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: task.status === "done" ? "var(--text-dim)" : "var(--text)",
                                            textDecoration: task.status === "done" ? "line-through" : "none",
                                          }}
                                        >
                                          {task.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                                          {task.description}
                                        </div>
                                        {task.uxSpec && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "#a78bfa",
                                              marginTop: 4,
                                              padding: "4px 8px",
                                              background: "rgba(167,139,250,0.08)",
                                              borderRadius: 3,
                                              borderLeft: "2px solid #a78bfa",
                                            }}
                                          >
                                            <strong>UX:</strong> {task.uxSpec}
                                          </div>
                                        )}
                                        {task.techDetails && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              color: "var(--accent)",
                                              marginTop: 4,
                                              padding: "4px 8px",
                                              background: "var(--accent-dim)",
                                              borderRadius: 3,
                                              borderLeft: "2px solid var(--accent)",
                                            }}
                                          >
                                            <strong>Tech:</strong> {task.techDetails}
                                          </div>
                                        )}
                                        <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>
                                          ~{task.estimatedHours}h
                                        </div>
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

          {/* ═══════════ BOTTOM PANELS: GTM + Financial + Risks ═══════════ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              padding: "16px 32px 32px",
            }}
          >
            {current.gtmStrategy && Object.keys(current.gtmStrategy).length > 0 && (
              <InfoPanel title="GTM Strategy" color="#34d399" data={current.gtmStrategy} />
            )}
            {current.financialModel && Object.keys(current.financialModel).length > 0 && (
              <InfoPanel title="Financial Model" color="#fb923c" data={current.financialModel} />
            )}
            {current.risks && current.risks.length > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--danger)",
                    marginBottom: 12,
                  }}
                >
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
          <div
            style={{
              padding: "12px 32px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 24,
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "var(--font-display)",
            }}
          >
            <span>Rounds: {current.rounds}</span>
            <span>Tokens: {(current.tokens / 1000).toFixed(0)}k</span>
            <span>Cost: ${current.cost?.toFixed(2)}</span>
            {current.completedAt && (
              <span>
                Generated: {new Date(current.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </>
      )}

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// Info Panel sub-component
// ═══════════════════════════════════════════

function InfoPanel({ title, color, data }: { title: string; color: string; data: Record<string, any> }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 20,
      }}
    >
      <h3
        style={{
          fontSize: 12,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color,
          marginBottom: 12,
        }}
      >
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
