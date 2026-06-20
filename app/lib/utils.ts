import type { ApiLog, UiLog } from "./types";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

export function formatMsgType(raw: string) {
  return raw.replace("_", "^");
}

export type SegmentEntry = { name: string; fieldCount: number; fields: [string, unknown][] };

export function getSegments(decoded: Record<string, unknown>): SegmentEntry[] {
  const order =
    (decoded._segment_order as string[]) ??
    Object.keys(decoded).filter((k) => k !== "_segment_order");

  const result: SegmentEntry[] = [];

  for (const segName of order) {
    const segValue = decoded[segName];
    if (segValue == null) continue;

    if (Array.isArray(segValue)) {
      // Repeating segment (OBR, OBX, NTE, etc.) — each occurrence is its own card
      (segValue as Record<string, unknown>[]).forEach((seg, idx) => {
        const rawFields = (seg._raw_fields as unknown[]) ?? [];
        const namedFields = Object.entries(seg).filter(([k]) => k !== "_raw_fields") as [string, unknown][];
        result.push({
          name: segValue.length > 1 ? `${segName} #${idx + 1}` : segName,
          fieldCount: rawFields.length,
          fields: namedFields,
        });
      });
    } else {
      const seg = segValue as Record<string, unknown>;
      const rawFields = (seg._raw_fields as unknown[]) ?? [];
      const namedFields = Object.entries(seg).filter(([k]) => k !== "_raw_fields") as [string, unknown][];
      result.push({ name: segName, fieldCount: rawFields.length, fields: namedFields });
    }
  }

  return result;
}

export function renderFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export type NormalizedSection = { name: string; fields: [string, string][] };

export function getNormalizedSections(
  payload: NonNullable<import("./types").ApiMessage["normalized_payload"]>
): NormalizedSection[] {
  const sections: NormalizedSection[] = [];

  if (payload.patient) {
    sections.push({
      name: "Patient",
      fields: Object.entries(payload.patient).map(([k, v]) => [k, renderFieldValue(v)]),
    });
  }

  if (payload.identifiers) {
    sections.push({
      name: "Identifiers",
      fields: Object.entries(payload.identifiers).map(([k, v]) => [k, renderFieldValue(v)]),
    });
  }

  const meta: [string, string][] = [];
  if (payload.message_type) meta.push(["message_type", payload.message_type]);
  if (payload.datetime) meta.push(["datetime", payload.datetime]);
  if (meta.length) sections.push({ name: "Message", fields: meta });

  if (payload.clinical_observations?.length) {
    payload.clinical_observations.forEach((obs, idx) => {
      sections.push({
        name: payload.clinical_observations!.length > 1 ? `Observation #${idx + 1}` : "Observation",
        fields: Object.entries(obs).map(([k, v]) => [k, renderFieldValue(v)]),
      });
    });
  }

  return sections;
}

export function logTypeFromStatus(status: string): UiLog["type"] {
  if (status === "stored") return "success";
  if (status === "error") return "error";
  return "info";
}

export function logMessageFromLog(log: ApiLog): string {
  if (log.status === "stored") return `Pipeline ${log.protocol.toUpperCase()} concluída com sucesso`;
  if (log.status === "error") return `Erro na pipeline ${log.protocol.toUpperCase()}`;
  return `Pipeline ${log.protocol.toUpperCase()} — ${log.status}`;
}
