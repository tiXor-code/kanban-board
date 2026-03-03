import { NextResponse } from "next/server";

const COUNCIL_BASE = "https://thecouncil-app.azurewebsites.net";

interface Session {
  id: string;
  stage: string;
  startedAt: number;
  completedAt?: number;
  tokens?: number;
  cost?: number;
}

export async function GET() {
  try {
    const res = await fetch(`${COUNCIL_BASE}/api/sessions`, {
      next: { revalidate: 30 },
    });
    const sessions: Session[] = await res.json();

    const completed = sessions.filter((s) => s.stage === "COMPLETE");
    const debatesCount = completed.length;
    const totalCost = sessions.reduce((sum, s) => sum + (s.cost ?? 0), 0);

    const lastDecisionDate =
      completed.length > 0
        ? new Date(completed[0].completedAt ?? completed[0].startedAt)
            .toISOString()
            .split("T")[0]
        : null;

    return NextResponse.json({
      debatesCount,
      totalCost: totalCost.toFixed(4),
      avgConfidence: 82, // static until we store confidence in sessions
      lastDecisionDate,
    });
  } catch (err) {
    console.error("council stats proxy error", err);
    return NextResponse.json({
      debatesCount: 0,
      totalCost: "0.0000",
      avgConfidence: 0,
      lastDecisionDate: null,
    });
  }
}
