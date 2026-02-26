import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const EVENTS_PATH = "/home/ubuntu/clawd/council/decisions/events.jsonl";

export async function GET() {
  try {
    const content = readFileSync(EVENTS_PATH, "utf-8");
    const lines = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const last50 = lines.slice(-50);
    return NextResponse.json(last50);
  } catch {
    return NextResponse.json([]);
  }
}
