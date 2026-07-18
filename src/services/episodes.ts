// episodes — canonical reader for the per-episode distress log (EpisodeRecord: trigger/skills/intensity).
//
// The store (`nilamind_episodes`) is written by EpisodeSupportScreen via appendToSecureArray; there was
// no owning service, so several consumers (personalRag, sendToNila, weeklySynthesis, YourDataScreen) each
// hand-rolled the same JSON.parse/Array.isArray read. This gives them ONE corrupt-safe reader, layered
// (like checkin.loadCheckins) over secureData.loadSecureArray so it survives the secureLocal test mocks.

import { loadSecureArray } from "./secureData";
import type { EpisodeRecord } from "../types";

const STORAGE_KEY = "nilamind_episodes";

/** All saved distress episodes. Never throws; returns [] on a missing/unparseable/non-array store. */
export function loadEpisodes(): EpisodeRecord[] {
  return loadSecureArray<EpisodeRecord>(STORAGE_KEY);
}
