// Tiny ID generator for new entries.
export function generateTinyId(): string {
  // Simple timestamp-based ID sufficient for entries that don't need high collision resistance
  return `id_${Date.now()}`;
}
