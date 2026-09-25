# rinlay

AI-native dev server — React, no bundling.

```
edit → compile → reload
```

## Quick start

```bash
pnpm create rinlay my-app
cd my-app && pnpm install && pnpm dev
```

## How it works

- JSX / React; `react` resolves to [rinlay-react](https://github.com/rinlay/react)
- `tsc -w` emits JS; the server serves files as-is
- CSS hot-swaps; JS / TS changes trigger a full reload
- `rinlay build` assembles static output from emit

## Repo

| Path | Role |
| --- | --- |
| `packages/rinlay` | CLI and dev server |
| `packages/create-rinlay` | scaffolding |
| [rinlay/react](https://github.com/rinlay/react) | JSX runtime |

```bash
pnpm install && pnpm dev   # playground
```
