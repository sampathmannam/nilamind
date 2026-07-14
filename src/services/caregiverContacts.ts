// P19.1 — Caregiver contact management. Stored encrypted on-device.
// On-device only; nothing leaves the phone without explicit user action.

import { secureLocal } from "./secureLocal";

const KEY = "nilamind_caregiver_contacts";

export interface CaregiverContact {
  id: string;
  name: string;
  phoneOrEmail: string;
  relationship: string;
  addedAt: string;
}

function load(): CaregiverContact[] {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: CaregiverContact[]): void {
  secureLocal.setItem(KEY, JSON.stringify(list));
}

export function addCaregiverContact(input: Omit<CaregiverContact, "id"> & { id?: string }): CaregiverContact {
  if (!input.name || !input.name.trim()) throw new Error("name is required");
  if (!input.phoneOrEmail || !input.phoneOrEmail.trim()) throw new Error("phoneOrEmail is required");

  const id = input.id || `cg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const contact: CaregiverContact = {
    id,
    name: input.name.trim(),
    phoneOrEmail: input.phoneOrEmail.trim(),
    relationship: (input.relationship || "").trim(),
    addedAt: input.addedAt || new Date().toISOString(),
  };

  const list = load();
  list.push(contact);
  save(list);
  return contact;
}

export function removeCaregiverContact(id: string): CaregiverContact[] {
  const list = load().filter((c) => c.id !== id);
  save(list);
  return list;
}

export function listCaregiverContacts(): CaregiverContact[] {
  return load();
}

export function getCaregiverContact(id: string): CaregiverContact | undefined {
  return load().find((c) => c.id === id);
}
