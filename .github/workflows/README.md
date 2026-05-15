# Workflows

## ci.yml

Runs on every push to `main` and every PR. Three jobs in parallel:

- **TypeScript SDK** — install, `tsc`, `node --test`.
- **Web (typecheck)** — `tsc --noEmit` against `packages/web`.
- **Python SDK** — `pip install -e ".[dev]"`, `pytest -q`.

## publish-npm.yml

Triggered when you push a tag matching `sdk-ts-v*` (e.g. `sdk-ts-v0.1.1`). Builds,
tests, and runs `npm publish --access public --provenance` using `secrets.NPM_TOKEN`.

To set up:

1. Generate an automation token at npmjs.com (Tokens → Generate New Token → Automation).
2. In GitHub repo settings → Secrets and variables → Actions → New secret, name `NPM_TOKEN`.
3. Bump version in `packages/sdk-ts/package.json`.
4. `git tag sdk-ts-v0.1.1 && git push --tags`.

`--provenance` writes a transparency log entry tying the package to this repo;
viewers see a verified badge on the npm page.

## publish-pypi.yml

Triggered on tags matching `sdk-python-v*`. Uses PyPI's **trusted publishing**
(OIDC) — no API token needed once set up.

To set up:

1. Create the project on PyPI (or test.pypi.org first).
2. In the project's settings → Publishing, add a Trusted Publisher:
   - Owner: `taku629`
   - Repo: `mcpay`
   - Workflow: `publish-pypi.yml`
   - Environment: (leave blank or create one)
3. Bump version in `packages/sdk-python/pyproject.toml`.
4. `git tag sdk-python-v0.1.1 && git push --tags`.

## Manual runs

Both publish workflows accept `workflow_dispatch` so you can re-run from the
Actions tab if a publish needs to be retried.
