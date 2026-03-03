import { NextResponse } from "next/server";

const COUNCIL_BASE = "https://thecouncil-app.azurewebsites.net";

export async function GET() {
  try {
    const res = await fetch(`${COUNCIL_BASE}/api/sessions`, {
      next: { revalidate: 10 },
    });
    const sessions = await res.json();
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("council sessions proxy error", err);
    return NextResponse.json([]);
  }
}
