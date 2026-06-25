# GitLab CI

GitLab CI is reserved for a later implementation.

The intended pipeline stages are:

- install
- quality
- test
- e2e
- build

The first implementation should run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm build
```

The E2E job should publish:

- `reports/playwright/*/junit.xml` as GitLab JUnit reports.
- `reports/playwright/**` as failure artifacts.

Do not add `.gitlab-ci.yml` until the target GitLab runner image, cache strategy, and deployment environments are confirmed.
