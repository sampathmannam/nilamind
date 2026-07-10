// offlineQueue — persists failed writes and retries when online.
// Exposes an online/offline indicator for UI.

import { secureLocal } from "./secureLocal";

const QUEUE_KEY = "nilamind_offline_queue";
const MAX_QUEUE_SIZE = 200;

export interface QueuedWrite {
  key: string;
  value: string;
  timestamp: number;
  retries: number;
}

let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const listeners = new Set<(online: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    notifyListeners();
    processQueue();
  });
  window.addEventListener("offline", () => {
    isOnline = false;
    notifyListeners();
  });
}

function notifyListeners(): void {
  for (const cb of listeners) {
    try { cb(isOnline); } catch { /* ignore */ }
  }
}

/** Subscribe to online/offline changes. Returns unsubscribe. */
export function onOnlineChange(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Current online status (cached, updated by browser events). */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/** Load queued writes from secureLocal. */
function loadQueue(): QueuedWrite[] {
  const raw = secureLocal.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save queue to secureLocal. */
function saveQueue(queue: QueuedWrite[]): void {
  // Trim to max size
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }
  secureLocal.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a failed write for later retry. */
export function enqueueWrite(key: string, value: string): void {
  const queue = loadQueue();
  queue.push({ key, value, timestamp: Date.now(), retries: 0 });
  saveQueue(queue);
}

/** Process the queue — retry all pending writes. */
export async function processQueue(): Promise<void> {
  if (!isOnline) return;
  const queue = loadQueue();
  if (queue.length === 0) return;

  const remaining: QueuedWrite[] = [];
  for (const item of queue) {
    try {
      // Try to write directly to secureLocal (will encrypt and persist)
      secureLocal.setItem(item.key, item.value);
    } catch {
      // Still failing — keep for next retry
      item.retries++;
      remaining.push(item);
    }
  }
  saveQueue(remaining);
}

/** Get current queue length (for UI badge). */
export function getQueueLength(): number {
  return loadQueue().length;
}

/** Clear the queue (e.g., after user confirms data loss). */
export function clearQueue(): void {
  secureLocal.removeItem(QUEUE_KEY);
}

/** Get all queued items (for UI). */
export function getQueue(): QueuedWrite[] {
  return loadQueue();
}

/** Manually retry a specific queued item. */
export async function retryItem(key: string): Promise<boolean> {
  const queue = loadQueue();
  const idx = queue.findIndex((i) => i.key === key);
  if (idx === -1) return false;
  const item = queue[idx];
  try {
    secureLocal.setItem(item.key, item.value);
    queue.splice(idx, 1);
    saveQueue(queue);
    return true;
  } catch {
    item.retries++;
    saveQueue(queue);
    return false;
  }
}

/** Remove a specific item from queue (give up). */
export function discardItem(key: string): void {
  const queue = loadQueue().filter((i) => i.key !== key);
  saveQueue(queue);
}