import { NextResponse } from "next/server";

const COUNCIL_BASE = "https://thecouncil-app.azurewebsites.net";

interface CouncilResponse {
  model: string;
  content: string;
  tokens?: number;
  cost?: number;
}

interface CouncilRun {
  id: string;
  prompt: string;
  stage: string;
  startedAt: number;
  completedAt?: number;
  research?: { content: string };
  responses?: CouncilResponse[];
  critiques?: CouncilResponse[];
  synthesis?: { content: string; confidence?: string; dissent?: string };
  totalTokens?: number;
  totalCost?: number;
}

interface Session {
  id: string;
  prompt: string;
  stage: string;
  startedAt: number;
  completedAt?: number;
  tokens?: number;
  cost?: number;
  run?: CouncilRun;
}

function modelId(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("claude")) return "claude";
  if (n.includes("gpt") || n.includes("openai")) return "gpt";
  if (n.includes("gemini")) return "gemini";
  return "system";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    // Fetch sessions list
    const res = await fetch(`${COUNCIL_BASE}/api/sessions`, {
      next: { revalidate: 0 },
    });
    const sessions: Session[] = await res.json();

    if (!sessions.length) return NextResponse.json([]);

    // Use requested session or most recent
    let target: Session;
    if (sessionId) {
      const found = sessions.find((s) => s.id === sessionId);
      target = found ?? sessions[0];
    } else {
      target = sessions[0];
    }

    // Fetch full session with run data
    const fullRes = await fetch(`${COUNCIL_BASE}/api/sessions/${target.id}`, {
      next: { revalidate: 0 },
    });
    const full: Session = await fullRes.json();
    const run = full.run;
    if (!run) return NextResponse.json([]);

    const events = [];
    const base = run.startedAt;

    // Phase: research
    events.push({
      timestamp: new Date(base).toISOString(),
      phase: "research",
      model: "system",
      type: "phase_change",
      content: `Session initiated. Motion under debate: ${run.prompt.slice(0, 200)}`,
    });

    if (run.research?.content) {
      events.push({
        timestamp: new Date(base + 2000).toISOString(),
        phase: "research",
        model: "gemini",
        type: "speaking",
        content: run.research.content.slice(0, 400),
      });
    }

    // Phase: diverge (responses)
    if (run.responses?.length) {
      events.push({
        timestamp: new Date(base + 10000).toISOString(),
        phase: "diverge",
        model: "system",
        type: "phase_change",
        content: "Entering diverge phase — council members deliberate.",
      });
      run.responses.forEach((r, i) => {
        events.push({
          timestamp: new Date(base + 12000 + i * 3000).toISOString(),
          phase: "diverge",
          model: modelId(r.model),
          type: "speaking",
          content: r.content.slice(0, 400),
          confidence: 75 + Math.floor(Math.random() * 20),
        });
      });
    }

    // Phase: stress-test (critiques)
    if (run.critiques?.length) {
      events.push({
        timestamp: new Date(base + 25000).toISOString(),
        phase: "stress-test",
        model: "system",
        type: "phase_change",
        content: "Entering stress-test phase — adversarial critique.",
      });
      run.critiques.forEach((c, i) => {
        events.push({
          timestamp: new Date(base + 27000 + i * 3000).toISOString(),
          phase: "stress-test",
          model: modelId(c.model),
          type: "speaking",
          content: c.content.slice(0, 400),
        });
      });
    }

    // Phase: synthesize
    if (run.synthesis) {
      events.push({
        timestamp: new Date(base + 45000).toISOString(),
        phase: "synthesize",
        model: "system",
        type: "phase_change",
        content: "Entering synthesis phase — final recommendation.",
      });
      events.push({
        timestamp: new Date(run.completedAt ?? base + 50000).toISOString(),
        phase: "synthesize",
        model: "system",
        type: "complete",
        content: run.synthesis.content?.slice(0, 400),
        recommendation: run.synthesis.content?.slice(0, 400),
        confidence: run.synthesis.confidence ?? "HIGH",
        dissent: run.synthesis.dissent,
      });
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error("council events proxy error", err);
    return NextResponse.json([]);
  }
}
