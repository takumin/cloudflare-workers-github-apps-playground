# cloudflare-workers-github-apps-playground

Cloudflare Workers GitHub Apps Playground

## Setup

To install dependencies:

```bash
brew install aquaproj/aqua/aqua
aqua install
pnpm install
```

## Running

To run:

```bash
pnpm run dev
```

## What this worker does

This worker authenticates as a GitHub App (via `@octokit/app`), gets an installation
access token for a specific installation, and calls `GET /installation/repositories`.
It returns that installation's repository list as JSON.

Routing is handled by [Hono](https://hono.dev/): only `GET /` is served, and an optional
`Authorization: Bearer` check is applied via Hono's `bearerAuth` middleware when
`API_TOKEN` is configured (see below).

When `API_TOKEN` is unset, any request other than `GET /` returns a JSON `404`. When
`API_TOKEN` is set, the auth middleware runs before route matching, so an unauthenticated
request returns `401` (missing or wrong token) or `400` (a malformed, non-`Bearer`
`Authorization` header) regardless of path or method; a request that passes auth but
isn't `GET /` still returns the JSON `404`.

## Configuration

The worker reads the following secrets from `env` (see `src/index.ts`):

- `APP_ID` — the GitHub App's ID.
- `PRIVATE_KEY` — the GitHub App's private key (PEM format).
- `INSTALLATION_ID` — the ID of the installation whose repositories should be listed.

`wrangler.toml` also defines a plain (non-secret) variable under `[vars]`:

- `MODE` — currently set to `"development"`.

### Deployed secrets

For a deployed worker, set the secrets with `wrangler secret put`:

```bash
wrangler secret put APP_ID
wrangler secret put PRIVATE_KEY
wrangler secret put INSTALLATION_ID
```

### Local development

For `pnpm run dev` (which runs `wrangler dev`), wrangler reads secrets from a local
`.dev.vars` file instead. Copy `.dev.vars.example` to `.dev.vars` and fill in your own
values:

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` is gitignored and should never be committed.

# Reference

- [octokit/app.js: GitHub Apps toolset for Node.js](https://github.com/octokit/app.js/)
- [octokit/webhooks.js: GitHub webhook events toolset for Node.js](https://github.com/octokit/webhooks.js)
- [gr2m/cloudflare-worker-github-app-example: A Cloudflare Worker + GitHub App Example](https://github.com/gr2m/cloudflare-worker-github-app-example)
- [OctokitとGitHub AppsでGitHub APIを叩く - zzzmisa's blog](https://blog.zzzmisa.com/octokit-with-github-app/)
