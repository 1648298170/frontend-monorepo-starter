# Monorepo Architecture

This repository is optimized for long-lived business applications.

## Principles

- Keep `apps/*` thin. Apps compose routes, layouts, pages, providers, and runtime configuration.
- Move reusable capabilities to `packages/*`.
- Every package exposes its public API from `src/index.ts`.
- Avoid deep imports from another package's internal files.
- Keep framework-agnostic logic under `packages/shared/*`.
- Keep framework-specific logic under `packages/vue/*` and `packages/react/*`.

## Package Groups

- `packages/shared/*`: utilities, request, config, auth, constants.
- `packages/vue/*`: Vue UI, composables, app shell.
- `packages/react/*`: React UI, hooks, app shell.
- `packages/tooling/*`: shared TypeScript, ESLint, Vite, and other engineering configuration.
