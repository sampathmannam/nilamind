import { secureLocal } from "./secureLocal";
// PhoneBehaviourService — passive behaviour signals for NilaMind's Behaviour Intelligence
// (Part 12 of the plan). Metadata only: app-usage TIME and category, last-pickup time, and
// location VARIANCE (left home y/n + distance) — never message content, never websites,
// never raw GPS coordinates. Native signals only run on Android; web/iOS return nulls so the
// app still works in the browser and degrades gracefully.

import { Capacitor } from '@capacitor/core';
import { CapacitorUsageStatsManager } from '@capgo/capacitor-android-usagestatsmanager';
import { Geolocation } from '@capacitor/geolocation';

export type AppCategory = 'social' | 'entertainment' | 'communication' | 'productivity' | 'other';

export interface AppUsage {
  packageName: string;
  appName: string;
  minutes: number;
  category: AppCategory;
}

export interface BehaviourSnapshot {
  date: string;                 // YYYY-MM-DD — primary key, one per day
  capturedAt: number;           // epoch ms when this snapshot was taken
  source: 'android' | 'web-unavailable' | 'permission-missing';
  // ── Screen ──
  screenTimeMinutes: number | null;
  categoryMinutes: Record<AppCategory, number> | null;
  topApps: AppUsage[];
  lastPickupTime: string | null;   // "HH:MM" of last foreground app use (circadian signal)
  firstPickupTime: string | null;  // needs event-level data (not in aggregate API yet) → null
  unlockCount: number | null;      // not exposed by the aggregate API → null for now
  // ── Place (variance only; coordinates never stored) ──
  leftHome: boolean | null;
  maxDistanceKm: number | null;
  // ── Body / social / notifications — wired in later phases (Health Connect, call log, notif listener) ──
  steps: number | null;
  callsMade: number | null;
  nightNotifications: number | null;
}

// Known package → category. Extend freely; unknown packages fall back to a keyword match, then "other".
const CATEGORY_MAP: Record<string, AppCategory> = {
  'com.instagram.android': 'social', 'com.zhiliaoapp.musically': 'social', 'com.twitter.android': 'social',
  'com.x.android': 'social', 'com.reddit.frontpage': 'social', 'com.facebook.katana': 'social',
  'com.snapchat.android': 'social', 'com.pinterest': 'social', 'com.linkedin.android': 'social',
  'com.google.android.youtube': 'entertainment', 'com.netflix.mediaclient': 'entertainment',
  'com.spotify.music': 'entertainment', 'com.amazon.avod.thirdpartyclient': 'entertainment',
  'com.google.android.apps.youtube.music': 'entertainment', 'in.startv.hotstar': 'entertainment',
  'com.whatsapp': 'communication', 'com.google.android.apps.messaging': 'communication',
  'org.telegram.messenger': 'communication', 'com.google.android.gm': 'communication',
  'org.thoughtcrime.securesms': 'communication', 'com.microsoft.office.outlook': 'communication',
  'com.android.chrome': 'productivity', 'com.google.android.calendar': 'productivity',
  'com.google.android.keep': 'productivity', 'com.microsoft.office.word': 'productivity',
};

function categorize(pkg: string): AppCategory {
  if (CATEGORY_MAP[pkg]) return CATEGORY_MAP[pkg];
  const p = pkg.toLowerCase();
  if (/insta|twitter|reddit|facebook|snap|tiktok|musically|pinterest|linkedin|mastodon|threads/.test(p)) return 'social';
  if (/youtube|netflix|spotify|hotstar|primevideo|avod|disney|hulu|twitch|music/.test(p)) return 'entertainment';
  if (/whatsapp|telegram|messeng|messaging|signal|gmail|outlook|\.mail|discord|slack/.test(p)) return 'communication';
  if (/chrome|firefox|calendar|keep|docs|word|excel|notion|browser|office/.test(p)) return 'productivity';
  return 'other';
}

function prettyName(pkg: string): string {
  const last = pkg.split('.').pop() || pkg;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function emptyCategories(): Record<AppCategory, number> {
  return { social: 0, entertainment: 0, communication: 0, productivity: 0, other: 0 };
}

/** Native behaviour signals are Android-only. */
export function isPhoneDataAvailable(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function isUsageAccessGranted(): Promise<boolean> {
  if (!isPhoneDataAvailable()) return false;
  try {
    const r = await CapacitorUsageStatsManager.isUsageStatsPermissionGranted();
    return !!r.granted;
  } catch {
    return false;
  }
}

export async function openUsageAccessSettings(): Promise<void> {
  if (!isPhoneDataAvailable()) return;
  try {
    await CapacitorUsageStatsManager.openUsageStatsSettings();
  } catch {
    /* settings intent unavailable — no-op */
  }
}

// ── Location variance: home baseline set once; only variance is stored, never coordinates ──
const HOME_KEY = 'nilamind_home_coords';

export function setHomeLocation(lat: number, lon: number): void {
  secureLocal.setItem(HOME_KEY, JSON.stringify({ lat, lon }));
}
export function getHomeLocation(): { lat: number; lon: number } | null {
  try {
    const v = secureLocal.getItem(HOME_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
export function hasHomeLocation(): boolean {
  return getHomeLocation() !== null;
}

/** Ask for location once and store the current spot as "home" (just the point — no tracking, no history). */
export async function markCurrentLocationAsHome(): Promise<boolean> {
  if (!isPhoneDataAvailable()) return false;
  try {
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
    setHomeLocation(pos.coords.latitude, pos.coords.longitude);
    return true;
  } catch {
    return false;
  }
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function collectLocationVariance(): Promise<{ leftHome: boolean | null; maxDistanceKm: number | null }> {
  if (!isPhoneDataAvailable()) return { leftHome: null, maxDistanceKm: null };
  const home = getHomeLocation();
  if (!home) return { leftHome: null, maxDistanceKm: null };
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
    const km = haversineKm(home, { lat: pos.coords.latitude, lon: pos.coords.longitude });
    return { leftHome: km > 0.2, maxDistanceKm: Math.round(km * 10) / 10 }; // coords discarded here
  } catch {
    return { leftHome: null, maxDistanceKm: null };
  }
}

/**
 * Build today's behaviour snapshot from whatever signals are available + permitted.
 * Always returns a snapshot object (with nulls) so callers never have to special-case the platform.
 */
export async function getTodaySnapshot(): Promise<BehaviourSnapshot> {
  const base: BehaviourSnapshot = {
    date: todayKey(),
    capturedAt: Date.now(),
    source: 'web-unavailable',
    screenTimeMinutes: null,
    categoryMinutes: null,
    topApps: [],
    lastPickupTime: null,
    firstPickupTime: null,
    unlockCount: null,
    leftHome: null,
    maxDistanceKm: null,
    steps: null,
    callsMade: null,
    nightNotifications: null,
  };

  if (!isPhoneDataAvailable()) return base; // web / iOS
  if (!(await isUsageAccessGranted())) return { ...base, source: 'permission-missing' };

  try {
    const stats = await CapacitorUsageStatsManager.queryAndAggregateUsageStats({
      beginTime: startOfTodayMs(),
      endTime: Date.now(),
    });

    const categoryMinutes = emptyCategories();
    const apps: AppUsage[] = [];
    let lastUsed = 0;

    for (const [pkg, u] of Object.entries(stats)) {
      const minutes = Math.round((u.totalTimeInForeground || 0) / 60000);
      if (minutes <= 0) continue;
      const category = categorize(pkg);
      categoryMinutes[category] += minutes;
      apps.push({ packageName: pkg, appName: prettyName(pkg), minutes, category });
      if (u.lastTimeUsed > lastUsed) lastUsed = u.lastTimeUsed;
    }
    apps.sort((a, b) => b.minutes - a.minutes);

    const loc = await collectLocationVariance();

    return {
      ...base,
      source: 'android',
      screenTimeMinutes: apps.reduce((sum, a) => sum + a.minutes, 0),
      categoryMinutes,
      topApps: apps.slice(0, 8),
      lastPickupTime: lastUsed ? hhmm(lastUsed) : null,
      leftHome: loc.leftHome,
      maxDistanceKm: loc.maxDistanceKm,
    };
  } catch {
    return { ...base, source: 'android' }; // query failed → empty-but-on-android snapshot
  }
}
