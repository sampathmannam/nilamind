// exportAudit — on-device, tamper-evident log of every data export the user performs.
// Privacy-first: nothing leaves the device. Records what was exported, when, and to where
// (file download / local documents / clipboard) so the user has a transparent audit trail.

import { secureLocal, appendToSecureArray } from "./secureLocal";

const AUDIT_KEY = "nilamind_export_audit";
const MAX_ENTRIES = 100;

export type ExportKind = "backup" | "csv" | "pdf" | "json" | "fhir" | "clipboard";
export type ExportDestination = "device_download" | "device_documents" | "clipboard";

export interface ExportAuditEntry {
  timestamp: number;
  kind: ExportKind;
  scope: string; // human label of what was exported
  destination: ExportDestination;
}

/** Record an export event. Fire-and-forget via the atomic shared-array primitive. */
export function recordExportAudit(entry: Omit<ExportAuditEntry, "timestamp">): void {
  try {
    appendToSecureArray(AUDIT_KEY, { timestamp: Date.now(), ...entry }, MAX_ENTRIES);
  } catch {
    // never block an export because logging failed
  }
}

/** Read the export audit trail (newest last). */
export function getExportAudit(): ExportAuditEntry[] {
  try {
    const raw = secureLocal.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
