# ivandaw-core: rules for agents

This repo holds the code shared by the IvanDAW host and every plugin.

- Design: `docs/tech-design.md`, section "ivandaw-core API", plus "Fades and clicks" for `envelope.ts`.
- Plugin API: `docs/plugin-api.md`. `src/api.ts` is its Types section, copied unchanged.
- Both docs are copies of Claude Docs. Change them only when Ivan asks.

The DAW lives in zhirnovcodes/ivan-daw (package `ivandaw`). It installs this repo from a git tag: `github:zhirnovcodes/ivan-daw-core#vX.Y.Z`.

## Files

| File | Holds |
| --- | --- |
| `src/api.ts` | Plugin API v2 types (contract C1) |
| `src/transport.ts` | `Anchor`, `beatAt`, `timeAt`, `lookaheadWindow`, `beatsIn`, `createTicker` (contract C2) |
| `src/midi.ts` | `noteOn`, `noteOff`, `allNotesOff`, `parse`, `noteToHz`, `NOTE` |
| `src/envelope.ts` | `Envelope` and `Smoother`, ported from Beatality's `Curve` and `Interpolator`; the C++ originals are in `docs/reference/beatality/` |

## Commands (P1 creates them)

- `pnpm i`
- `pnpm check` runs typecheck, Biome and Vitest. Run it before every push.

Use Node >= 22: cloud sessions run Node 22, the PC runs Node 24. Use pnpm 10 through corepack.

## Rules

- No runtime dependencies. Write small pure functions; the only exception is the Worker-based ticker.
- `envelope.ts` runs on the audio thread, so it never allocates per sample.
- Every exported function gets Vitest tests.
- A git-tag install must work with no publish step. P1 picks a `prepare` build script or committed `dist/`.
- Every change that ivan-daw needs gets a semver tag. While on 0.x, a breaking type change bumps the minor version.
- Cloud sessions cannot push tags. A session on Ivan's PC pushes the tag itself; otherwise Ivan creates it.
- Changing `src/api.ts` or `src/transport.ts` changes a contract. Do it only when the task says so.

## Commits (v1.1 onwards)

- The current plan lives in ivan-daw: `docs/v1.1-plan.md`. Core's v1.1 task is T1.
- Commit straight to `main`, message starting with the task id, for example `T1: NOTE.C1`.
- Push only after `pnpm check` passes and `dist/` is rebuilt.
- No pull requests or labels in this repo.
