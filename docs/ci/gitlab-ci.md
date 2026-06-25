# GitLab CI

GitLab CI is reserved for a later implementation.

The intended pipeline stages are:

- install
- quality
- test
- build

The first implementation should run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Do not add `.gitlab-ci.yml` until the target GitLab runner image, cache strategy, and deployment environments are confirmed.
