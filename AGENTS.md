# Repository Guidelines

## Project Structure & Module Organization

Core library code lives in `src/`. `src/index.ts` exports the public plugin API, `src/runtime.ts` handles DOM mounting, and `src/renderer.ts` provides the higher-level Vue renderer component. Tests live in `tests/`, with shared helpers in `tests/helpers/`. The Vite demo app is in `example/` and includes sample Vue components under `example/components/`. Build output goes to `dist/`; treat it as generated and do not edit it by hand.

## Build, Test, and Development Commands

- `npm install` - install project dependencies and peer-aware dev tooling.
- `npm run build` - clean `dist/` and compile TypeScript declarations and ESM output.
- `npm run dev` - run `tsc --watch` for iterative library development.
- `npm test` - run the Vitest suite once in `jsdom`.
- `npm run test:watch` - keep Vitest running while you edit code or tests.
- `npm run example` - start the Vite demo app for manual verification of markdown rendering behavior.

`npm run prepack` and `npm run prepublishOnly` both enforce the expected release flow: tests first, then a clean build.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode expectations in mind. Match the existing style: 2-space indentation, semicolons, single quotes, trailing commas only when the surrounding file already uses them, and explicit `.js` import extensions in TS source. Prefer small focused helpers over large inline blocks. Use `PascalCase` for Vue components, `camelCase` for functions and variables, and `*.spec.ts` for tests.

## Testing Guidelines

Vitest is the test runner, with `@vue/test-utils` and `jsdom` for component behavior. Add or update tests whenever parser rules, runtime mounting, or exported package behavior changes. Keep test files close to the behavior they cover, following existing names such as `runtime.spec.ts` and `package-metadata.spec.ts`. Validate both happy paths and failure handling when touching parsing or DOM mounting logic.

## Commit & Pull Request Guidelines

Recent history follows short conventional-style subjects such as `docs: rewrite npm-facing readme`, `fix example runtime demos`, and `chore: prepare package metadata for npm publish`. Keep commits focused and use lowercase prefixes like `fix:`, `docs:`, `chore:`, or `test:`. For pull requests, include a concise summary, note any API or README changes, link related issues, and mention how you verified the change (`npm test`, `npm run build`, `npm run example` when relevant).
