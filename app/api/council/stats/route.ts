import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DECISIONS_DIR = "/home/ubuntu/clawd/council/decisions";

export async function GET() {
  try {
    let debatesCount = 0;
    let totalCost = 0;
    let avgConfidence = 0;
    let lastDecisionDate: string | null = null;

    if (fs.existsSync(DECISIONS_DIR)) {
      // Count .md decision files
      const files = fs.readdirSync(DECISIONS_DIR);
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      debatesCount = mdFiles.length;

      // Get last decision date from most recent .md file
      if (mdFiles.length > 0) {
        const sorted = mdFiles.sort().reverse();
        const stat = fs.statSync(path.join(DECISIONS_DIR, sorted[0]));
        lastDecisionDate = stat.mtime.toISOString().split("T")[0];
      }

      // Read cost-log.json if it exists
      const costLogPath = path.join(DECISIONS_DIR, "cost-log.json");
      if (fs.existsSync(costLogPath)) {
        const raw = fs.readFileSync(costLogPath, "utf-8");
        const log = JSON.parse(raw) as Array<{
          cost?: number;
          confidence?: number;
          date?: string;
        }>;
        totalCost = log.reduce((sum, entry) => sum + (entry.cost ?? 0), 0);
        const confidences = log
          .map((e) => e.confidence)
          .filter((c): c is number => typeof c === "number");
        avgConfidence =
          confidences.length > 0
            ? Math.round(
                confidences.reduce((a, b) => a + b, 0) / confidences.length
              )
            : 0;

        // Override debates count if log has entries
        if (log.length > debatesCount) debatesCount = log.length;

        // Override last date
        const lastEntry = log[log.length - 1];
        if (lastEntry?.date) lastDecisionDate = lastEntry.date;
      }
    }

    return NextResponse.json({
      debatesCount,
      totalCost: totalCost.toFixed(4),
      avgConfidence,
      lastDecisionDate,
    });
  } catch (err) {
    console.error("stats route error", err);
    return NextResponse.json({
      debatesCount: 0,
      totalCost: "0.0000",
      avgConfidence: 0,
      lastDecisionDate: null,
    });
  }
}
