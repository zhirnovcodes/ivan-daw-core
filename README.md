# ivandaw-core

This package holds the code shared by the IvanDAW host and its plugins:
- the Web Plugin API v2 types;
- the timing math (beat ↔ AudioContext time, lookahead, ticker);
- MIDI helpers;
- the Envelope and Smoother used for click-free fades.

It has no runtime dependencies. IvanDAW installs it from a git tag:

```
pnpm add github:zhirnovcodes/ivan-daw-core#v0.1.0
```

- Design: [docs/tech-design.md](docs/tech-design.md), section "ivandaw-core API"
- Plugin API: [docs/plugin-api.md](docs/plugin-api.md)

## Development

```
pnpm i
pnpm check    # typecheck, Biome, Vitest, and a check that dist/ is up to date
pnpm build    # rebuild dist/
```

`dist/` is committed so the git-tag install needs no publish or `prepare` step.
After changing `src/`, run `pnpm build` and commit `dist/` with it; `pnpm check` fails if they differ.
