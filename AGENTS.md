# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app. Key areas: `src/routes/` (TanStack Router route modules), `src/app/` (app-level layout/state), `src/components/`, `src/hooks/`, `src/lib/`, `src/styles/`.
- `src/routeTree.gen.ts` is generated; avoid hand-editing it.
- `convex/` contains backend functions and schema (`convex/schema.ts`). Generated Convex types live in `convex/_generated/`.
- `public/` is for static assets served by Vite.
- `docs/` contains repository documentation.

## Build, Test, and Development Commands
Use `pnpm` (lockfile present).
- `pnpm dev`: runs Vite plus Convex dev concurrently (includes an initial `npx convex dev --once`).
- `pnpm dev:web`: Vite dev server only.
- `pnpm dev:convex`: Convex backend dev loop.
- `pnpm dev:ts`: TypeScript watch build (`tsc -b -w`).
- `pnpm build`: production build (`vite build`) and typecheck (`tsc --noEmit`).
- `pnpm lint`: typecheck + ESLint.
- `pnpm format`: Prettier format for the repo.
- `pnpm start`: runs the built server from `.output/server/index.mjs`.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier (`.prettierrc`): 4-space indentation, 100-char lines, single quotes, trailing commas, semicolons.
- ESLint config lives in `eslint.config.mjs`; keep lint clean before PRs.
- Follow existing file naming: components are generally kebab-case (e.g., `src/components/chart-area-interactive.tsx`). Use PascalCase for React components and camelCase for hooks/utilities.
- Do not edit generated folders/files (`convex/_generated/`, `src/routeTree.gen.ts`).

## Testing Guidelines
- No dedicated test runner is configured in this repo. Validation currently relies on typecheck + lint + build (`pnpm lint`, `pnpm build`).
- If you add tests, document the chosen framework and how to run them in your PR.

## Commit & Pull Request Guidelines
- Commit messages are short and imperative (e.g., “Add …”, “Remove …”, “Implement …”), sometimes with issue numbers like `(#1)`. Match this style.
- PRs should include: a brief summary, testing steps (commands run), and screenshots for UI changes. Link related issues when applicable.

## Security & Configuration Tips
- Store local secrets in `.env.local` (ignored by git). Avoid committing credentials.
- Vite/Convex configs live in `vite.config.ts` and `convex/convex.config.ts`; keep changes minimal and documented in PRs.
