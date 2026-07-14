import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  appendToSecureArray: <T>(key: string, item: T) => {
    const arr: T[] = store.has(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
}));

import {
  addCaregiverContact,
  removeCaregiverContact,
  listCaregiverContacts,
  getCaregiverContact,
  type CaregiverContact,
} from "./caregiverContacts";

beforeEach(() => store.clear());

const valid = (over: Partial<CaregiverContact> = {}): CaregiverContact => ({
  id: "c1",
  name: "Priya",
  phoneOrEmail: "priya@example.com",
  relationship: "Sister",
  addedAt: "2026-07-13T10:00:00",
  ...over,
});

describe("addCaregiverContact", () => {
  it("stores and returns the contact with a generated id", () => {
    const c = addCaregiverContact({ ...valid(), id: "" });
    expect(c.id).toMatch(/^cg_/);
    expect(c.name).toBe("Priya");
    const list = listCaregiverContacts();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(c.id);
  });

  it("rejects an empty name", () => {
    expect(() => addCaregiverContact({ ...valid(), name: "" })).toThrow("name is required");
  });

  it("rejects an empty phoneOrEmail", () => {
    expect(() => addCaregiverContact({ ...valid(), phoneOrEmail: "" })).toThrow("phoneOrEmail is required");
  });
});

describe("listCaregiverContacts", () => {
  it("returns an empty array when no contacts stored", () => {
    expect(listCaregiverContacts()).toEqual([]);
  });

  it("returns all stored contacts in insertion order", () => {
    const a = addCaregiverContact({ ...valid(), name: "A", id: "" });
    const b = addCaregiverContact({ ...valid(), name: "B", phoneOrEmail: "b@test.com", id: "" });
    const list = listCaregiverContacts();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("A");
    expect(list[1].name).toBe("B");
  });
});

describe("removeCaregiverContact", () => {
  it("removes a contact by id and returns the updated list", () => {
    const c = addCaregiverContact({ ...valid(), id: "" });
    const updated = removeCaregiverContact(c.id);
    expect(updated).toHaveLength(0);
    expect(listCaregiverContacts()).toHaveLength(0);
  });

  it("is a no-op for a missing id", () => {
    const c = addCaregiverContact({ ...valid(), id: "" });
    const updated = removeCaregiverContact("nonexistent");
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(c.id);
  });
});

describe("getCaregiverContact", () => {
  it("returns a contact by id", () => {
    const c = addCaregiverContact({ ...valid(), id: "" });
    const found = getCaregiverContact(c.id);
    expect(found?.name).toBe("Priya");
  });

  it("returns undefined for a missing id", () => {
    expect(getCaregiverContact("nonexistent")).toBeUndefined();
  });
});
