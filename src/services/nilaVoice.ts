// Backward-compatibility shim. Nila's voice now lives in responseBuilder.ts so it can be
// combined with user context (UX-7). All public symbols are re-exported here so existing
// importers (TodayScreen, proactiveCheckIn) keep working unchanged.
export * from "./responseBuilder";
