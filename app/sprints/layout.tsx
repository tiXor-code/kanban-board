export default function SprintsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 0, background: 'var(--bg)' }}>
      {children}
    </div>
  );
}
