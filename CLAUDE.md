# Project Guide

## Build & Test Commands
- Build/lint: `pnpm run lint` (runs biome and oxlint)
- Format code: `pnpm run fmt` (biome)
- Test: `pnpm run test` (uses vitest)
- Run single test: `pnpm run test -- -t "test name pattern"`
- Dev server: `pnpm run dev` (uses wrangler)
- Deploy: `pnpm run deploy` (uses wrangler)
- Type check/generate: `pnpm run typegen`

## Code Style Guidelines
- **Formatting**: Uses Biome with tab indentation and double quotes
- **Imports**: Use ES module imports, organized with Biome
- **TypeScript**: Strict mode enabled, ES2022 target
- **Error handling**: Use try/catch with appropriate error typing
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Type safety**: Prefer explicit types over `any`; use satisfies for type validation
- **GitHub API**: Use @octokit/app for GitHub Apps integration
- **Testing**: Write unit and integration tests using vitest
- **Architecture**: Follow Cloudflare Workers patterns with fetch handlers
