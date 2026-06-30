# Contributing

Contributions are welcome — with a few **non-negotiables**, because this is a mental-health app.

## The non-negotiables

1. **Keep §9 intact.** Do not remove, disable, or weaken the [crisis-safety layer](Crisis-Safety.md). Don't ship a build without it.
2. **No telemetry, no data collection, no exfiltration.** *Help is the only metric — never gather data at any cost.* This is the line the project will not cross.
3. **Don't present it as medical advice** or a replacement for professional care.
4. **Keep crisis resources accurate** for the regions you target.
5. **Re-test the safety layer against any model you ship.**

A change that violates any of these won't be accepted, however good it is otherwise.

## Getting set up

See [Building from Source](Building-from-Source.md). In short: `npm install`, `npm run dev` for the web/logic, and the Android build via Android Studio's JDK.

## Before you open a PR

```bash
npm run lint     # tsc --noEmit — must pass
npm test         # Vitest — must stay green
```

- **Add tests** for new logic, especially anything touching safety, storage, or the model-download path.
- **Never weaken a §9 test.** If you think one is wrong, raise it explicitly rather than editing it away.
- Match the surrounding code's style and keep changes focused.

## Where things live

- Product logic: `src/services/` (grouped in [Architecture](Architecture.md) → *Module map*).
- Screens/components: `src/components/`.
- Safety: `src/safety.ts` + `src/services/crisis*.ts` + `nilaSafetyGate.ts`.
- The on-device brain seam: `src/services/localLlm.ts`, `llamaCppLlmAdapter.ts`, `gemmaPrompt.ts`, `nila.ts`.

## Especially valuable contributions

- **Safety**: better crisis recall (without losing precision), region-accurate resources, adversarial test cases.
- **Models**: from-source build of the inference engine (the one blocker for mainline f-droid.org), smaller/faster quality-preserving models, better prompt structures.
- **Accessibility & i18n**: the crisis copy and resources especially need to be correct in more languages and regions.
- **Honest evaluation**: the model's real limitations (e.g. repetitiveness) and how to measure improvement on the clinical axes that matter.

## Reporting issues

- **Security / safety issues** (a missed crisis class, a data-leak path) — report these with care and detail.
- **Bugs / features** — open a GitHub issue with steps to reproduce and your device/Android version.

## License

By contributing you agree your contribution is licensed under the project's [Apache-2.0](https://github.com/sampathmannam/nilamind/blob/main/LICENSE) license. See also [`NOTICE`](https://github.com/sampathmannam/nilamind/blob/main/NOTICE) and [`SAFETY.md`](https://github.com/sampathmannam/nilamind/blob/main/SAFETY.md).
