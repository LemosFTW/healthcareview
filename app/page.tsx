"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiMessage, ApiLog, UiLog } from "./lib/types";
import { formatTime, logTypeFromStatus, logMessageFromLog, formatMsgType } from "./lib/utils";
import { Navbar } from "./components/Navbar";
import { MessageList } from "./components/MessageList";
import { LogPanel } from "./components/LogPanel";
import { MessageModal } from "./components/MessageModal";

const API_BASE = "http://localhost:8000";
const POLL_INTERVAL = 5000;

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
      setMessages(data.items ?? []);
    } catch (e) { console.error("[messages] fetch error:", e); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/logs?page=1&page_size=50`);
      if (!res.ok) { console.error("[logs] status", res.status); return; }
      const data = await res.json();
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
      if (newLogs.length > 0) setUiLogs((prev) => [...prev, ...newLogs]);
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
    const interval = setInterval(() => { fetchMessages(); fetchLogs(); }, POLL_INTERVAL);
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

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <Navbar />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_380px] flex-1 auto-rows-fr">
        <MessageList
          messages={messages}
          reviewStatus={reviewStatus}
          onOpen={(msg) => { setSelectedMsg(msg); setActiveTab("Segments"); }}
        />
        <LogPanel logs={uiLogs} />
      </div>
      {selectedMsg && (
        <MessageModal
          msg={selectedMsg}
          reviewStatus={reviewStatus}
          activeTab={activeTab}
          submitting={submitting}
          onTabChange={setActiveTab}
          onClose={() => setSelectedMsg(null)}
          onCommit={handleCommit}
        />
      )}
    </div>
  );
}
