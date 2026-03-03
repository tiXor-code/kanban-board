"use client";

export default function CouncilPage() {
  return (
    <iframe
      src="https://thecouncil-app.azurewebsites.net"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        zIndex: 0,
      }}
      title="The Council"
      allow="fullscreen"
    />
  );
}
