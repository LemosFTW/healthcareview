"use client";

import { useState } from "react";

function Arrow({ open }: { open: boolean }) {
  return (
    <span style={{ color: "#71717b", fontSize: 10, width: 12, flexShrink: 0, display: "inline-block", userSelect: "none" }}>
      {open ? "∨" : ">"}
    </span>
  );
}

function LeafRow({ label, value, depth }: { label: string; value: string; depth: number }) {
  return (
    <div style={{ paddingLeft: depth * 16 + 8, display: "flex", alignItems: "baseline", gap: 4, padding: `1px 8px 1px ${depth * 16 + 8}px` }}>
      <span style={{ width: 12, flexShrink: 0, display: "inline-block" }} />
      <span style={{ color: "#0891b2", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#a1a1aa", margin: "0 2px", flexShrink: 0 }}>:</span>
      <span style={{ color: "#27272a" }}>{value}</span>
    </div>
  );
}

function TreeNode({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(true);

  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    const display = value === null || value === undefined || value === "" ? "—" : String(value);
    return <LeafRow label={label} value={display} depth={depth} />;
  }

  const children: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [`[${i}]`, v])
    : Object.entries(value as Record<string, unknown>);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          paddingLeft: depth * 16 + 8,
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", textAlign: "left",
          padding: `3px 8px 3px ${depth * 16 + 8}px`,
          background: "none", border: "none", cursor: "pointer",
        }}
        className="hover:bg-zinc-100 transition-colors rounded"
      >
        <Arrow open={open} />
        <span style={{ color: "#18181b", fontWeight: 600 }}>{label}</span>
        {!open && (
          <span style={{ color: "#a1a1aa", fontWeight: 400 }}>
            {isArray ? `[${(value as unknown[]).length}]` : "{…}"}
          </span>
        )}
      </button>
      {open && children.map(([k, v]) => (
        <TreeNode key={k} label={k} value={v} depth={depth + 1} />
      ))}
    </>
  );
}

interface Props {
  normalized: Record<string, unknown>;
}

export function TreeView({ normalized }: Props) {
  const entries = Object.entries(normalized).filter(([k]) => k !== "warnings");

  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, background: "#fff", borderRadius: 8, border: "1px solid #e4e4e7", padding: "8px 0" }}>
      {entries.map(([key, value]) => (
        <TreeNode key={key} label={key} value={value} depth={0} />
      ))}
    </div>
  );
}
