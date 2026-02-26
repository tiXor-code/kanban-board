"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs() {
  const path = usePathname();
  const isBoard = path === "/" || path === "";
  const isCouncil = path.startsWith("/council");

  const tab = (
    href: string,
    label: string,
    active: boolean,
    icon: string
  ) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "6px",
        fontFamily: "var(--font-syne)",
        fontWeight: 700,
        fontSize: "11px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textDecoration: "none",
        color: active ? (isCouncil && active ? "#b8902a" : "var(--accent)") : "var(--text-dim)",
        background: active
          ? isCouncil
            ? "rgba(184,144,42,0.1)"
            : "var(--accent-dim)"
          : "transparent",
        border: `1px solid ${
          active
            ? isCouncil
              ? "rgba(184,144,42,0.25)"
              : "var(--accent-dim)"
            : "transparent"
        }`,
        transition: "color 0.2s ease, background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: "fixed",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        gap: "4px",
        background: isCouncil ? "rgba(10,13,20,0.9)" : "rgba(14,17,23,0.85)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isCouncil ? "#1f2937" : "var(--border)"}`,
        borderRadius: "10px",
        padding: "4px",
      }}
    >
      {tab("/", "Board", isBoard, "⬛")}
      {tab("/council", "The Council", isCouncil, "⬡")}
    </nav>
  );
}
