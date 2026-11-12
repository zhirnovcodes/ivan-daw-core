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
- `pnpm check` runs typecheck, Biome and Vitest. Run it before every PR.

Use Node >= 22: cloud sessions run Node 22, the PC runs Node 24. Use pnpm 10 through corepack.

## Rules

- No runtime dependencies. Write small pure functions; the only exception is the Worker-based ticker.
- `envelope.ts` runs on the audio thread, so it never allocates per sample.
- Every exported function gets Vitest tests.
- A git-tag install must work with no publish step. P1 picks a `prepare` build script or committed `dist/`.
- Every change that ivan-daw needs gets a semver tag. While on 0.x, a breaking type change bumps the minor version.
- Cloud sessions cannot push tags. Ivan creates the tag after merging.
- Changing `src/api.ts` or `src/transport.ts` changes a contract. Do it only when the task says so.

## Branches and pull requests

- One branch per task: `task/<part>-<slug>`, for example `task/P1-core-tooling`. Never commit to `main`.
- Open the PR only after `pnpm check` passes.
- Cloud sessions block `gh pr` and `gh issue`. Use REST through `gh api`:
  ```
  gh api repos/zhirnovcodes/ivan-daw-core/pulls -f title='P1 core tooling' \
    -f head=task/P1-core-tooling -f base=main -F body=@pr-body.md
  gh api repos/zhirnovcodes/ivan-daw-core/issues/<number>/labels -f 'labels[]=checks-only'
  ```
  If these fail, say so in the session; Ivan will tap Create PR.
- Labels: `checks-only` (the usual one for this repo), `ready-to-test`, `blocked`.
