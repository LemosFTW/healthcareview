"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8000";
const POLL_INTERVAL = 5000;

interface ApiMessage {
  id: string;
  protocol: string;
  message_type: string;
  status: string;
  review_status?: string;
  raw_payload: string;
  decoded_payload: Record<string, unknown>;
  normalized_payload: { patient?: unknown; warnings?: string[] };
  warnings: unknown[];
  errors: unknown[];
  created_at: string;
}

interface ApiLog {
  id: string;
  protocol: string;
  status: string;
  errors: unknown[];
  created_at: string;
  updated_at: string;
}

interface UiLog {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

function formatMsgType(raw: string) {
  return raw.replace("_", "^");
}

function getSegments(decoded: Record<string, unknown>) {
  const order = (decoded._segment_order as string[]) ?? Object.keys(decoded).filter((k) => k !== "_segment_order");
  return order
    .map((segName) => {
      const seg = decoded[segName] as Record<string, unknown> | undefined;
      if (!seg) return null;
      const rawFields = (seg._raw_fields as unknown[]) ?? [];
      const namedFields = Object.entries(seg).filter(([k]) => k !== "_raw_fields");
      return { name: segName, fieldCount: rawFields.length, fields: namedFields };
    })
    .filter(Boolean) as { name: string; fieldCount: number; fields: [string, unknown][] }[];
}

function logTypeFromStatus(status: string): UiLog["type"] {
  if (status === "stored") return "success";
  if (status === "error") return "error";
  return "info";
}

function logMessageFromLog(log: ApiLog): string {
  if (log.status === "stored") return `Pipeline ${log.protocol.toUpperCase()} concluída com sucesso`;
  if (log.status === "error") return `Erro na pipeline ${log.protocol.toUpperCase()}`;
  return `Pipeline ${log.protocol.toUpperCase()} — ${log.status}`;
}

export default function Home() {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [uiLogs, setUiLogs] = useState<UiLog[]>([]);
  const [reviewStatus, setReviewStatus] = useState<Record<string, "pending" | "approved">>({});
  const [selectedMsg, setSelectedMsg] = useState<ApiMessage | null>(null);
  const [activeTab, setActiveTab] = useState<"Segments" | "Tree">("Segments");
  const [submitting, setSubmitting] = useState(false);
  const seenLogIds = useRef<Set<string>>(new Set());
  const startupLogged = useRef(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages?page=1&page_size=50&review_status=pending`);
      if (!res.ok) { console.error("[messages] status", res.status); return; }
      const data = await res.json();
      console.log("[messages] raw response:", data);
      console.log("[messages] items:", data.items);
      setMessages(data.items ?? []);
    } catch (e) { console.error("[messages] fetch error:", e); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/logs?page=1&page_size=50`);
      if (!res.ok) { console.error("[logs] status", res.status); return; }
      const data = await res.json();
      console.log("[logs] raw response:", data);
      const newLogs: UiLog[] = (data.items as ApiLog[])
        .filter((l) => !seenLogIds.current.has(l.id))
        .map((l) => {
          seenLogIds.current.add(l.id);
          return {
            id: l.id,
            timestamp: formatTime(l.created_at),
            message: logMessageFromLog(l),
            type: logTypeFromStatus(l.status),
          };
        });
      if (newLogs.length > 0) {
        setUiLogs((prev) => [...prev, ...newLogs]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!startupLogged.current) {
      startupLogged.current = true;
      const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setUiLogs([
        { id: "startup-1", timestamp: t, message: "MLLP listener started on :2575", type: "info" },
        { id: "startup-2", timestamp: t, message: "Awaiting incoming HL7 messages...", type: "info" },
      ]);
    }

    fetchMessages();
    fetchLogs();

    const interval = setInterval(() => {
      fetchMessages();
      fetchLogs();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchMessages, fetchLogs]);

  async function handleCommit() {
    if (!selectedMsg) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/messages/${selectedMsg.id}/commit`, { method: "POST" });
      if (res.ok) {
        setReviewStatus((prev) => ({ ...prev, [selectedMsg.id]: "approved" }));
        setMessages((prev) =>
          prev.map((m) => (m.id === selectedMsg.id ? { ...m, review_status: "approved" } : m))
        );
        const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
        setUiLogs((prev) => [
          ...prev,
          {
            id: `commit-${selectedMsg.id}`,
            timestamp: t,
            message: `Mensagem ${formatMsgType(selectedMsg.message_type)} aprovada`,
            type: "success",
          },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const warnings: string[] =
    (selectedMsg?.normalized_payload?.warnings ?? []).length > 0
      ? (selectedMsg!.normalized_payload.warnings as string[])
      : [];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-zinc-900 px-6 py-3 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="font-semibold text-sm tracking-tight">HL7 Event Stream</span>
        </div>
        <span className="text-zinc-400 text-xs font-mono">v2.5 · MLLP :2575</span>
      </nav>

      {/* Panels */}
      <div className="flex flex-1 gap-4 p-4">
        {/* Left: Received Messages */}
        <div className="flex-1 bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2 text-zinc-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 13 16 13 14 21 10 3 8 11 2 11" />
              </svg>
              <span className="text-sm font-medium">Received Messages</span>
            </div>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
              {messages.length}
            </span>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            {messages.map((msg) => {
              const status = reviewStatus[msg.id] ?? msg.review_status ?? "pending";
              return (
                <div key={msg.id} className="flex items-center justify-between px-4 py-3 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-zinc-900 text-white px-2 py-0.5 rounded">
                        {formatMsgType(msg.message_type)}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">{msg.id.slice(0, 8)}</span>
                      {status === "approved" && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                          approved
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">received at {formatTime(msg.created_at)}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedMsg(msg); setActiveTab("Segments"); }}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Open
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Logs */}
        <div className="w-72 bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <span className="text-sm font-medium text-zinc-700">Logs</span>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
              {uiLogs.length}
            </span>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
            {uiLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke={log.type === "success" ? "#22c55e" : log.type === "error" ? "#ef4444" : "#06b6d4"}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </div>

      {/* Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-zinc-900 text-white px-2 py-0.5 rounded">
                  {formatMsgType(selectedMsg.message_type)}
                </span>
                <span className="text-xs text-zinc-500 font-mono font-semibold">
                  {selectedMsg.id.slice(0, 8)}
                </span>
              </div>
              <button onClick={() => setSelectedMsg(null)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Subtitle + status */}
            <div className="px-6 py-3 border-b border-zinc-100">
              <p className="text-sm text-zinc-500">
                Received at {formatTime(selectedMsg.created_at)} · {getSegments(selectedMsg.decoded_payload ?? {}).length} segments
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 16 9" />
                  </svg>
                  <span className="text-sm font-medium text-zinc-700">Recebido</span>
                </div>
                <div className="flex-1 h-px bg-zinc-200 max-w-12" />
                {(reviewStatus[selectedMsg.id] ?? selectedMsg.review_status) === "approved" ? (
                  <div className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 16 9" />
                    </svg>
                    <span className="text-sm font-medium text-zinc-700">Persistido no BD</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-300" />
                    <span className="text-sm text-zinc-400">Persistido no BD</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b border-zinc-100">
              {(["Segments", "Tree"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-zinc-900 border-b-2 border-zinc-900"
                      : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex flex-1 gap-4 p-4 overflow-auto min-h-0">
              {/* Segments / Tree */}
              <div className="flex-1 flex flex-col gap-3 overflow-auto">
                {activeTab === "Segments" ? (
                  getSegments(selectedMsg.decoded_payload ?? {}).map((seg) => (
                    <div key={seg.name} className="border border-zinc-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50">
                        <span className="text-xs font-bold text-zinc-500">{seg.name}</span>
                        <span className="text-xs text-zinc-400">{seg.fieldCount} fields</span>
                      </div>
                      {seg.fields.map(([key, value]) => (
                        <div key={key} className="flex items-start border-t border-zinc-100 px-4 py-2">
                          <span className="text-xs text-cyan-600 font-mono w-40 shrink-0">{key}</span>
                          <span className="text-xs text-zinc-700 font-mono break-all">{String(value ?? "—")}</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <pre className="text-xs font-mono text-zinc-700 bg-zinc-50 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedMsg.decoded_payload, null, 2)}
                  </pre>
                )}
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="w-56 shrink-0">
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700">Warnings ({warnings.length})</span>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {warnings.map((w, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-amber-800">
                          <span className="shrink-0">–</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setSelectedMsg(null)}
                className="text-sm px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Fechar
              </button>
              {(reviewStatus[selectedMsg.id] ?? selectedMsg.review_status) !== "approved" && (
                <button
                  onClick={handleCommit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors font-medium disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 2 11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {submitting ? "Enviando..." : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
