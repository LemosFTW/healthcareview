import type { UiLog } from "../lib/types";

interface Props {
  logs: UiLog[];
}

export function LogPanel({ logs }: Props) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <span className="text-sm font-medium text-zinc-700">Logs</span>
        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
          {logs.length}
        </span>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              <svg
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={log.type === "success" ? "#22c55e" : log.type === "error" ? "#ef4444" : "#06b6d4"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-400 font-mono">{log.timestamp}</span>
              <span className="text-xs text-zinc-700">{log.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
