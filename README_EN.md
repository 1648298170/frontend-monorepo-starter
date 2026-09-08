# Frontend Monorepo Starter

English | [简体中文](./README.md)

This is a frontend monorepo template for business projects. Rather than simply
stuffing multiple projects into one repository, it keeps "application code,
shared capabilities, framework adapters, and engineering configuration"
clearly separated, so the project stays easy to maintain as you add new apps,
collaborate with more people, and accumulate shared capabilities.

If this is your first time working with this repository, start with
[`docs/guides/project-guide.md`](docs/guides/project-guide.md). Following the
real development order, the guide covers project positioning, environment
setup, app startup, directory layering, code generation, state management,
requests, styling, testing, and pre-commit checks.

## Design Goals

This template focuses on three things:

- Supporting both Vue and React business applications in the same repository.
- Distilling reusable capabilities into packages to avoid copy-pasting across
  apps.
- Using unified engineering standards to reduce maintenance costs, including
  TypeScript, ESLint, Prettier, testing, and build pipelines.

It leans toward a "business project template" rather than a component library
publishing template. The first version therefore focuses more on project
structure, package boundaries, developer experience, and long-term
extensibility.

## Tech Stack

- Package management: pnpm workspace
- Task orchestration: Turborepo
- Build tool: Vite 8, with Rolldown as the default production bundler
- Vue apps: Vue 3 + Vue Router + Pinia + TypeScript 6
- React apps: React + React Router + Zustand + TypeScript 6
- Code standards: ESLint + Prettier
- Testing: Vitest + Testing Library + Playwright

GitLab CI design docs are kept, but the first version does not create a
`.gitlab-ci.yml`.

## Vite 8 and Rolldown

This template uses Vite 8 as the build tool. In Vite 8, production builds are
based on Rolldown by default; traditional Rollup is no longer used as the
production bundler.

Both apps are currently configured through their own `vite.config.ts`:

```txt
apps/vue-web/vite.config.ts
apps/react-web/vite.config.ts
```

If you need to configure production bundling options later, prefer Vite 8's
`rolldownOptions` over the legacy `rollupOptions` from older Vite/Rollup
setups.

Example:

```ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks: {
          vendor: ["vue"],
        },
      },
    },
  },
});
```

If you need to adjust JSX transformation later, prefer Vite 8's `oxc`
configuration over the old `esbuild` configuration.

## Project Structure

```txt
frontend-monorepo-starter/
  apps/
    vue-web/                 # Vue business app template
    react-web/               # React business app template

  packages/
    shared/
      auth/                  # Framework-agnostic authorization rules
      utils/                 # Framework-agnostic utility functions
      request/               # Framework-agnostic request layer
      config/                # Framework-agnostic runtime config
      observability/         # Framework-agnostic error reporting contract

    vue/
      auth/                  # Vue auth Provider, Composable, and Guard
      ui/                    # Vue-specific base UI components

    react/
      auth/                  # React auth Provider, Hook, and Guard
      ui/                    # React-specific base UI components

    tooling/
      eslint-config/         # Shared ESLint config
      tsconfig/              # Shared TypeScript config

  docs/
    architecture/            # Architecture notes
    conventions/             # Team conventions
    guides/                  # Onboarding guides for new members
    ci/                      # Reserved CI design
    design/                  # Design specs (extracted from Lanhu)

  templates/
    apps/
      react/                  # Standard React business app generation template
      vue/                    # Standard Vue business app generation template

  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Architecture Principles

### 1. Keep apps thin

`apps/*` are concrete business applications, such as `apps/vue-web` and
`apps/react-web`.

The app layer is mainly responsible for:

- App entry points
- Route registration
- Page composition
- State management integration
- App-level styles
- Business pages

The app layer should not accumulate large amounts of generic logic. If a piece
of code might be reused by another app in the future, prefer putting it in
`packages/*`.

### 2. shared holds framework-agnostic capabilities

Code in `packages/shared/*` should not depend on Vue or React.

Currently includes:

- `@repo/auth`: framework-agnostic authorization rules
- `@repo/utils`: pure utility functions for dates, numbers, formatting, etc.
- `@repo/request`: fetch request client and error types
- `@repo/config`: runtime config parsing

These packages are stable, generic, and easy to test. They are the foundation
best suited for long-term reuse across the monorepo.

### 3. vue and react keep framework adapters separate

Vue and React differ in component models, state models, and ecosystem
conventions, so framework-specific capabilities should not be mixed together.

Currently includes:

- `@repo/vue-auth`
- `@repo/vue-ui`
- `@repo/react-auth`
- `@repo/react-ui`

The benefit: both stacks can share the underlying business capabilities, while
UI and framework code can evolve independently without constraining each
other.

### 4. tooling unifies engineering standards

`packages/tooling/*` holds team-level engineering configuration.

Currently includes:

- `@repo/tsconfig`
- `@repo/eslint-config`

All apps and packages reuse these configs, so each project does not maintain
its own standards. Later, adjusting TypeScript strict rules or ESLint rules
only requires changing the tooling packages.

## Package Boundary Conventions

Every package should expose its public API through `src/index.ts`.

Recommended:

```ts
import { formatDate } from "@repo/utils";
```

Avoid:

```ts
import { formatDate } from "@repo/utils/src/date";
```

This keeps package internals free to change without affecting callers. When
maintaining a monorepo long-term, this convention matters a lot.

## Where New Capabilities Should Go

If it is pure functions and framework-agnostic:

```txt
packages/shared/utils
```

If it is requests, error handling, auth headers, or API clients:

```txt
packages/shared/request
```

If it is environment variables, runtime config, or app config:

```txt
packages/shared/config
```

Environment files themselves belong to specific apps:

```txt
apps/react-web/.env.*
apps/vue-web/.env.*
```

Apps provide the environment values, while `packages/shared/config` only
provides framework-agnostic parsing, defaults, and validation. Business
environments are `local`, `test`, `uat`, and `production`; the local
environment uses Vite's standard `development` mode. See
[`docs/conventions/environment-variables.md`](docs/conventions/environment-variables.md)
for details.

For Vite dev proxy, Sass injection, static assets, and Rolldown chunking
conventions, see
[`docs/conventions/vite.md`](docs/conventions/vite.md).

For React Router, Vue Router, Zustand, and Pinia layering and extension
standards, see
[`docs/conventions/state-and-routing.md`](docs/conventions/state-and-routing.md).

For naming conventions of source code, styles, and workspace packages plus
planned follow-up phases, see
[`docs/conventions/naming.md`](docs/conventions/naming.md).

For comment requirements covering module responsibilities, key flows, special
boundaries, and test code, see
[`docs/conventions/code-comments.md`](docs/conventions/code-comments.md).

For unit tests, React/Vue component tests, and coverage standards, see
[`docs/conventions/testing.md`](docs/conventions/testing.md).

For the request client, error reporting, and exception boundary designs for
both frameworks, see
[`docs/conventions/reliability.md`](docs/conventions/reliability.md).

For framework-agnostic authorization rules and the usage boundaries of
React/Vue Providers and Guards, see
[`docs/conventions/authorization.md`](docs/conventions/authorization.md).

For generation commands for components, features, pages, stores, hooks, and
composables, see
[`docs/conventions/code-generation.md`](docs/conventions/code-generation.md).

For governance of unused files, exports, dependencies, and catalog entries,
see
[`docs/conventions/dependency-health.md`](docs/conventions/dependency-health.md).

If it is a Vue component or composable:

```txt
packages/vue/*
```

If it is a React component or hook:

```txt
packages/react/*
```

If it is a concrete page, a concrete business flow, or belongs to a single
app:

```txt
apps/vue-web
apps/react-web
```

## Common Commands

Development environment requirements:

- Node.js: `>=22.12.0`
- pnpm: `10.18.3`
- npm: `>=10.9.0 <11`, kept only as part of the Node.js toolchain, not for
  installing dependencies

The repository only allows pnpm for installing dependencies. See
[`docs/conventions/runtime-versions.md`](docs/conventions/runtime-versions.md)
for version constraints, initialization, and upgrade workflows.

Check local toolchain versions:

```bash
pnpm check:runtime
```

Install dependencies:

```bash
pnpm install
```

Start all apps:

```bash
pnpm dev
```

Start only the Vue app:

```bash
pnpm dev:vue
```

Start only the React app:

```bash
pnpm dev:react
```

Lint:

```bash
pnpm lint
```

Dependency health check:

```bash
pnpm lint:unused
```

Type check:

```bash
pnpm typecheck
```

Tests:

```bash
pnpm test
```

Install Playwright Chromium for the first time and run E2E for both apps:

```bash
pnpm test:e2e:install
pnpm test:e2e
```

Build:

```bash
pnpm build
```

The root command builds both business apps, with outputs at:

```txt
apps/react-web/dist/
apps/vue-web/dist/
```

The monorepo root does not generate an extra unified `dist/`. Turbo has
declared the apps' `dist/**` as build outputs, and artifacts are restored
automatically on cache hits.

One-command release (build → package → upload → atomic switch on the server,
with rollback support):

```bash
cp deploy.config.example.json deploy.config.json   # Fill in real server info on first use
pnpm ship vue-web test                             # Release vue-web to the test environment
pnpm ship react-web production --dry-run           # Dry run, nothing is executed
pnpm ship vue-web production --rollback            # Interactive rollback
```

For release environments, branch mapping, pipeline flow, and security
conventions, see
[`docs/conventions/deployment.md`](docs/conventions/deployment.md);
for server provisioning and fallback channel operations, see
[`deploy-shell/README.md`](deploy-shell/README.md).

Format:

```bash
pnpm format
```

Use the code generator:

```bash
pnpm g --help
pnpm g app --name admin-web --framework react
pnpm g component --app react-web --scope app --name app-header
```

`pnpm generate` is equivalent to `pnpm g`. The generator creates tests by
default, refuses to overwrite existing files, and supports `--dry-run` to
preview the full change plan.

## Reserved but Not Implemented

The following capabilities are reserved in structure or docs but not
implemented in the first version:

- GitLab CI
- Storybook
- changesets publishing workflow

One-command release (`pnpm ship` and the `deploy-shell/` fallback channel) is
available.

The GitLab CI design notes are at:

```txt
docs/ci/gitlab-ci.md
```

The phased integration plan after phase one is at:

```txt
docs/roadmap/foundation-roadmap.md
```

## Future Extension Suggestions

When adding business apps, prefer:

```txt
apps/admin
apps/mobile-web
apps/internal-tool
```

When adding shared capabilities, first decide whether they are
framework-agnostic. If so, put them in `packages/shared/*`; if
framework-specific, put them in `packages/vue/*` or `packages/react/*`.

When a shared package grows complex, each package should add:

- README
- Unit tests
- Clear public API
- Usage examples

The core idea of this template: apps handle assembly, packages accumulate
capabilities, and tooling unifies standards.
