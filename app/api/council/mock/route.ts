import { NextResponse } from "next/server";

const QUESTION =
  "Should AI systems be required to disclose their reasoning process to end users in regulated industries?";

function ts(offsetSec: number) {
  return new Date(Date.now() - (120 - offsetSec) * 1000).toISOString();
}

const MOCK_EVENTS = [
  {
    timestamp: ts(0),
    phase: "research",
    model: "system",
    type: "phase_change",
    content: "Session initiated. Motion under debate: " + QUESTION,
  },
  {
    timestamp: ts(4),
    phase: "research",
    model: "claude",
    type: "thinking",
    content: "Analysing regulatory frameworks across EU, US and APAC...",
  },
  {
    timestamp: ts(5),
    phase: "research",
    model: "gpt",
    type: "thinking",
    content: "Cross-referencing GDPR Article 22, EU AI Act recitals...",
  },
  {
    timestamp: ts(6),
    phase: "research",
    model: "gemini",
    type: "thinking",
    content: "Reviewing academic literature on explainability requirements...",
  },
  {
    timestamp: ts(14),
    phase: "research",
    model: "claude",
    type: "speaking",
    content:
      "Research complete. Key finding: the EU AI Act mandates transparency for high-risk AI but stops short of requiring full reasoning disclosure. The gap between 'explainability' and 'full reasoning trace' is significant and contested.",
  },
  {
    timestamp: ts(20),
    phase: "research",
    model: "gpt",
    type: "speaking",
    content:
      "Supporting data: 73% of Fortune 500 financial firms already use some form of model explainability tooling. However only 12% expose reasoning chains to end users — suggesting a technical readiness gap rather than regulatory one.",
  },
  {
    timestamp: ts(26),
    phase: "research",
    model: "gemini",
    type: "speaking",
    content:
      "Healthcare context is instructive. FDA guidance on Software as a Medical Device does not require reasoning disclosure — it requires performance validation. This distinction may be the crux.",
  },
  {
    timestamp: ts(34),
    phase: "diverge",
    model: "system",
    type: "phase_change",
    content: "Phase transition: DIVERGE. Council members present independent positions.",
  },
  {
    timestamp: ts(38),
    phase: "diverge",
    model: "claude",
    type: "speaking",
    confidence: 78,
    content:
      "Position: Mandatory disclosure is premature. Reasoning chains are often technically opaque even to developers. Mandating disclosure of something that cannot be made genuinely comprehensible creates compliance theatre — not accountability. Better standard: auditable reasoning, accessible to regulators, not necessarily end users.",
  },
  {
    timestamp: ts(46),
    phase: "diverge",
    model: "gpt",
    type: "speaking",
    confidence: 82,
    content:
      "Position: Conditional disclosure is the answer. In high-stakes decisions — credit denial, medical diagnosis, parole — users have a legitimate right to understand why. The technical difficulty is not a valid exemption: it is an engineering problem to be solved. Regulation should drive that engineering.",
  },
  {
    timestamp: ts(54),
    phase: "diverge",
    model: "gemini",
    type: "speaking",
    confidence: 71,
    content:
      "Position: Industry-specific tiering. Finance and criminal justice demand disclosure at point of decision. Healthcare demands disclosure at point of appeal. General commercial AI requires only aggregate transparency reports. One rule does not fit all regulated domains.",
  },
  {
    timestamp: ts(62),
    phase: "stress-test",
    model: "system",
    type: "phase_change",
    content: "Phase transition: STRESS-TEST. Positions challenged.",
  },
  {
    timestamp: ts(66),
    phase: "stress-test",
    model: "gemini",
    type: "speaking",
    content:
      "Challenge to Claude: If reasoning is auditable to regulators but not users, who audits the auditors? Historical precedent with financial regulators suggests regulatory capture is a real risk.",
  },
  {
    timestamp: ts(73),
    phase: "stress-test",
    model: "claude",
    type: "speaking",
    content:
      "Acknowledged. Regulator independence mechanisms are necessary — but that is a governance problem, not a technical disclosure problem. Conflating the two weakens both solutions.",
  },
  {
    timestamp: ts(79),
    phase: "stress-test",
    model: "claude",
    type: "speaking",
    content:
      "Challenge to GPT: Mandating end-user-readable reasoning assumes users can act on that information. Studies show decision fatigue and automation bias mean users rarely override AI recommendations even when shown reasoning. The disclosure requirement may be symbolic without supporting cognitive infrastructure.",
  },
  {
    timestamp: ts(86),
    phase: "stress-test",
    model: "gpt",
    type: "speaking",
    content:
      "Partially conceded. Effective disclosure requires literacy support. The mandate should include plain-language summaries, not raw reasoning traces. But the right to access — even if rarely exercised — is foundational to autonomy.",
  },
  {
    timestamp: ts(94),
    phase: "synthesize",
    model: "system",
    type: "phase_change",
    content: "Phase transition: SYNTHESIZE. Final recommendation being composed.",
  },
  {
    timestamp: ts(108),
    phase: "synthesize",
    model: "system",
    type: "complete",
    recommendation:
      "Adopt a tiered mandatory disclosure framework. Tier 1 (criminal justice, credit, employment): real-time plain-language explanation of decisive factors at point of decision, with full reasoning log accessible on appeal. Tier 2 (healthcare, insurance): explanation available on request within 72 hours. Tier 3 (other regulated domains): annual aggregate transparency reports. All tiers require regulator-accessible full reasoning audit trails with independent oversight mechanisms. Implementation deadline: 36 months post-enactment.",
    confidence: "HIGH",
    dissent:
      "GPT-4o notes: The 36-month timeline is insufficiently ambitious given the pace of AI deployment in Tier 1 domains. Recommend 18 months with phased enforcement.",
  },
];

export async function GET() {
  return NextResponse.json(MOCK_EVENTS);
}
