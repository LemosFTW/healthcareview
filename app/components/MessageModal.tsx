"use client";

import { useState } from "react";
import type { ApiMessage } from "../lib/types";
import { formatTime, formatMsgType, getNormalizedSections } from "../lib/utils";
import { TreeView } from "./TreeView";

interface Props {
  msg: ApiMessage;
  reviewStatus: Record<string, "pending" | "approved">;
  activeTab: "Segments" | "Tree";
  submitting: boolean;
  onTabChange: (tab: "Segments" | "Tree") => void;
  onClose: () => void;
  onCommit: () => void;
}

export function MessageModal({ msg, reviewStatus, activeTab, submitting, onTabChange, onClose, onCommit }: Props) {
  const isApproved = (reviewStatus[msg.id] ?? msg.review_status) === "approved";
  const normalized = msg.normalized_payload ?? {};
  const warnings = normalized.warnings ?? [];
  const sections = getNormalizedSections(normalized);

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.name))
  );

  function toggleSection(name: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-zinc-900 text-white px-2 py-0.5 rounded">
              {formatMsgType(msg.message_type)}
            </span>
            <span className="text-xs text-zinc-500 font-mono font-semibold">{msg.id.slice(0, 8)}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Status bar */}
        <div className="shrink-0 px-6 py-3 border-b border-zinc-100">
          <p className="text-sm text-zinc-500">
            Received at {formatTime(msg.created_at)} · {sections.length} sections
          </p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 16 9" />
              </svg>
              <span className="text-sm font-medium text-zinc-700">Recebido</span>
            </div>
            <div className="flex-1 h-px bg-zinc-200 max-w-12" />
            {isApproved ? (
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
        <div className="shrink-0 flex gap-1 px-6 pt-3 border-b border-zinc-100">
          {(["Segments", "Tree"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
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

        {/* Body — scroll container sem flex, layout dentro */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
          {/* Conteúdo principal */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {activeTab === "Segments" ? (
              sections.map((sec) => {
                const isOpen = openSections.has(sec.name);
                return (
                  <div key={sec.name} className="border border-zinc-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(sec.name)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                    >
                      <span className="text-xs font-bold text-zinc-500">{sec.name}</span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && sec.fields.map(([key, value]) => (
                      <div key={key} className="flex items-start border-t border-zinc-100 px-4 py-2">
                        <span className="text-xs text-cyan-600 font-mono w-44 shrink-0">{key}</span>
                        <span className="text-xs text-zinc-700 font-mono break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              <TreeView normalized={normalized as Record<string, unknown>} />
            )}
          </div>

          {/* Warnings — aparece em ambas as abas */}
          {warnings.length > 0 && (
            <div style={{ width: 224, flexShrink: 0 }}>
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
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Fechar
          </button>
          {!isApproved && (
            <button
              onClick={onCommit}
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
  );
}
