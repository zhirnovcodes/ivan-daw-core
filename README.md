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

The tooling arrives with task P1.
