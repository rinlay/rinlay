# rinlay

An AI-native frontend runtime. A self-hosted React implementation plus a dev server that does not bundle. Output is HTML, CSS, and JavaScript.

A human gives instructions, an AI writes code, and rinlay runs the result quickly and predictably.

## What AI native means

When AI builds UI, it does not need fancy hot reload. It needs a **short, white-box, predictable** loop:

```
edit file → compile succeeds or fails → see the result or a clear error
```

rinlay is built for that:

- **Syntax is JSX / React.** The UI style models know best. Generated components do not need translation into another framework.
- **The runtime is a white box.** Self-hosted `rinlay-react`; the name `react` points to it. No Webpack or Vite middle layer. Console errors point at your source files.
- **No bundling in dev.** TypeScript goes through `tsc`; the server serves files as-is. An AI can read `packages/rinlay/src/dev.ts` and understand the full flow.
- **Feedback is deterministic.** CSS changes swap the stylesheet; JS / TS changes trigger a full page reload. Every reload starts from a clean state, so verification is unambiguous and leftover component state cannot mislead you.
- **Tiny surface area.** `index.html` + `src/*.tsx` + `tsconfig.json`. No config maze, no opaque dependency graph.

Hot reload is not an AI requirement. A full reload is, for an agent, a clean re-execution of the latest instruction.

## Two modes

**Island.** The host page leaves a slot, loads rinlay CSS and JS, and calls `createRoot` on that node. The rest of the legacy system stays out of this compile chain.

**Standalone app.** One `index.html` is the entry. Same runtime, same mount pattern.

## Repository

pnpm workspace.

| Path | Role |
| --- | --- |
| `packages/rinlay` | CLI, dev server, static build |
| `packages/create-rinlay` | Scaffolding via `pnpm create rinlay` |
| [rinlay/react](https://github.com/rinlay/react) | JSX runtime, published as `rinlay-react` |
| `playground/` | Todo sample for day-to-day development |
| `example/` | Minimal hello-world sample |

```
rinlay
├── packages/rinlay/          dev server and build
├── packages/create-rinlay/   scaffolding
├── playground/               todo sample
└── example/                  minimal sample
```

## Create a project

```bash
pnpm create rinlay my-app
cd my-app
pnpm install
pnpm dev
```

## Runtime

`rinlay-react` is a client-only React and React DOM implementation. `react`, `react-dom`, and `react-dom/client` all resolve to it.

Common APIs: `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useRef`, `useMemo`, `useCallback`, `useContext`, `useId`, `useImperativeHandle`, `useSyncExternalStore`, `useTransition`, `useDeferredValue`, `use`, `memo`, `forwardRef`, `lazy`, `Suspense`, `createContext`, `createPortal`, `flushSync`.

Source lives in [rinlay/react](https://github.com/rinlay/react) under `src/`. No synthetic events, class components, or concurrent rendering. `hydrateRoot` re-renders directly into the container.

## Dev server

Run `rinlay` or `rinlay dev`. Default: `127.0.0.1:5173`.

Requires `index.html` at the project root. The server:

1. Reads `rootDir` (default `src`) and `outDir` (default `.rinlay`) from `tsconfig.json`.
2. Starts `tsc -b -w` to watch and emit JavaScript plus source maps.
3. Serves project files over Node `http`. Requests for `.ts` / `.tsx` return the matching `.js` from `outDir`.
4. Injects an import map that points `react` at `rinlay-react` on unpkg.
5. Injects a hot-update client. CSS changes replace the matching `<link>`; everything else triggers a full reload.

Application code keeps using `import { useState } from 'react'` against the self-hosted runtime.

## Build

`rinlay build` does not run `tsc`. It assumes emit already exists in `outDir`, then assembles a deployable static site in that directory:

- Copy CSS from `rootDir` into `outDir` preserving relative paths
- Rewrite `index.html`: `/src/main.tsx` → `./main.js`, `/src/index.css` → `./index.css`
- Write the production import map

The output can be hosted on its own or embedded in any host page.

## Commands

From the repo root:

```bash
pnpm install
pnpm --filter rinlay build          # CLI runs from dist/
pnpm dev                            # playground (todo sample)
pnpm dev:example                    # example (minimal sample)
```

From a subdirectory:

```bash
cd playground && pnpm dev
cd example && pnpm dev
```

## Limits

No class components, synthetic events, or concurrent features. `lazy` / `Suspense` show a fallback until the promise resolves, then remount the content. All of this is readable directly in [rinlay/react](https://github.com/rinlay/react) under `src/`.
