import type { ApiMessage } from "../lib/types";
import { formatTime, formatMsgType } from "../lib/utils";

interface Props {
  messages: ApiMessage[];
  reviewStatus: Record<string, "pending" | "approved">;
  onOpen: (msg: ApiMessage) => void;
}

export function MessageList({ messages, reviewStatus, onOpen }: Props) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2 text-zinc-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            <polyline points="2 14 8 14 10 18 14 18 16 14 22 14" />
          </svg>
          <span className="text-sm font-medium">Received Messages</span>
        </div>
        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
          {messages.length}
        </span>
      </div>

      <ul className="flex-1 px-4 divide-y divide-zinc-100 overflow-auto">
        {messages.map((msg) => {
          const status = reviewStatus[msg.id] ?? msg.review_status ?? "pending";
          return (
            <li key={msg.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold font-mono bg-zinc-900 text-white px-2.5 py-0.5 rounded-md">
                    {formatMsgType(msg.message_type)}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">{msg.id.slice(0, 8)}</span>
                  {status === "approved" && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                      approved
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-zinc-400">
                  received at {formatTime(msg.created_at)}
                </span>
              </div>
              <button
                onClick={() => onOpen(msg)}
                className="flex items-center gap-1.5 text-xs text-zinc-600 border border-zinc-200 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Open
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
