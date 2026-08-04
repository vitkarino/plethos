# Plethos agent guide

Read `PROJECT_PRODUCTION_PLAN.md` before changing architecture or public
contracts. Preserve unrelated working-tree changes and never commit credentials,
datasets, model artifacts, build output, or local environment files.

## Repository navigation

- Client work belongs under `client/`.
- Server and ML API work belongs under `server/` until the production plan moves
  shared ML code into `ml/`.
- Firmware and simulator work belongs under `embedded/`.
- Versioned wire examples belong under `contracts/`.
- Reproducible container tooling belongs under `infra/`.

Keep commits atomic and use imperative Conventional Commit messages. Tests and
documentation must accompany public behavior changes. Do not flash physical
hardware, change production data, force-push, or run destructive Git commands
without explicit owner approval.
