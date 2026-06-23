export function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-zinc-800">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="font-semibold text-sm tracking-tight">HL7 Event Stream</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-700">
            v0.2.1 · MLLP :2575
          </span>
          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-700">
            v0.2.1 · REST :8080
          </span>
        </div>
      </div>
    </nav>
  );
}
