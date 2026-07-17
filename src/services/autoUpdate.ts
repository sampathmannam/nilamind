import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AppLauncher } from '@capacitor/app-launcher';

/**
 * PRIVACY / SECURITY: by default this module makes NO network calls.
 *
 * This service is OPT-IN and DISABLED BY DEFAULT. Users explicitly enable it from
 * Settings → Advanced. The preference persists in localStorage.
 *
 * The auto-update path performs an OUTBOUND request to GitHub on every app launch,
 * and when a newer release exists, downloads the APK and launches the Android
 * installer intent.
 *
 * FLAGGED 🟡 for human security review (AGENTS.md):
 * - No APK signature verification against the installed cert
 * - This is an egress path that contradicts the "nothing leaves the device" promise
 * - Use only with user consent and clear disclosure
 */

const PREF_KEY = "nilamind_auto_update_enabled";

let autoUpdateEnabled = loadUpdatePref();

function loadUpdatePref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "true";
  } catch {
    return false;
  }
}

function saveUpdatePref(v: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, String(v));
  } catch {
    // private browsing / quota full — degrade gracefully
  }
}

/** Opt in to the GitHub auto-update check + install. OFF by default (privacy). */
export function setAutoUpdateEnabled(v: boolean): void {
  autoUpdateEnabled = v;
  saveUpdatePref(v);
}

/** Read the current auto-update preference. */
export function isAutoUpdateEnabled(): boolean {
  return autoUpdateEnabled;
}

/** Simple semver compare – returns true if `latest` is newer than `current`. */
function isNewerVersion(current: string, latest: string): boolean {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const l = latest.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const ci = c[i] ?? 0;
    const li = l[i] ?? 0;
    if (li > ci) return true;
    if (li < ci) return false;
  }
  return false;
}

/**
 * Checks GitHub for a newer release of the app. If found, downloads the attached APK
 * and launches the Android installer intent. The function is fire‑and‑forget – any
 * error is logged but never blocks the UI.
 */
export async function checkForGitHubUpdate(): Promise<void> {
  if (!autoUpdateEnabled) return; // privacy: no egress / auto-install unless explicitly opted in
  try {
    const { version: installedVersion } = await App.getInfo();
    const owner = 'sampathmannam'; // <-- your GitHub username / org
    const repo = 'nilamind';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
    const release = await resp.json();
    const latestTag = release.tag_name;
    if (!isNewerVersion(installedVersion, latestTag)) return; // already up‑to‑date
    const apkAsset = (release.assets || []).find((a: any) => a.name?.endsWith('.apk'));
    if (!apkAsset) {
      console.warn('No APK asset in latest GitHub release');
      return;
    }
    const apkUrl = apkAsset.browser_download_url;
    const dlResp = await fetch(apkUrl);
    if (!dlResp.ok) throw new Error(`APK download ${dlResp.status}`);
    const blob = await dlResp.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // Chunked conversion: spreading a ~32MB APK into String.fromCharCode(...) blows the argument
    // limit (RangeError: Maximum call stack size exceeded), which made this whole opt-in feature
    // silently fail on every real APK. 32KiB chunks keep the call-stack usage flat.
    let binary = "";
    const CHUNK = 32768;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK) as unknown as number[]);
    }
    const base64 = btoa(binary);
    const fileName = `update_${latestTag}.apk`;
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data,
    });
    const uri = await Filesystem.getUri({
      directory: Directory.Data,
      path: fileName,
    });
    // Launch Android installer intent – the OS shows the standard install dialog.
    await AppLauncher.launchApp({ uri: uri.uri, mimeType: 'application/vnd.android.package-archive' });
  } catch (e) {
    console.error('[autoUpdate] error:', e);
    // Silently ignore – the app should continue to work.
  }
}
