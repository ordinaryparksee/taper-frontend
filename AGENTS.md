Project: Taper Frontend (Nuxt 4 + Nuxt UI)

Scope
- This document captures project-specific guidance for building, configuring, testing, and contributing to this repository. It assumes proficiency with Nuxt, TypeScript, and modern frontend tooling.

Build and Configuration
- Package manager: The repository declares packageManager: pnpm@10.21.0. However, CI and local shells may not always have pnpm available. Commands below show both pnpm and npm equivalents where relevant.
- Core scripts (package.json):
  - dev: nuxt dev
  - build: nuxt build
  - preview: nuxt preview
  - postinstall: nuxt prepare (handles Nuxt preparation steps)
  - lint: eslint .
  - typecheck: nuxt typecheck
- Nuxt configuration (nuxt.config.ts):
  - Modules: @nuxt/eslint, @nuxt/ui, @vueuse/nuxt, nuxt-auth-utils.
  - CSS entry: ~/assets/css/main.css. Ensure this file exists when modifying styles.
  - routeRules: '/api/**' has CORS enabled; useful for local API interactions or proxying.
  - compatibilityDate is set to 2024-07-11 for Nuxt’s compatibility layer.
  - ESLint stylistic options are configured inline in nuxt.config.ts via @nuxt/eslint.
- Development server:
  - pnpm dev (or npm run dev) → http://localhost:3000
- Production build and preview:
  - pnpm build && pnpm preview (or npm run build && npm run preview)
- TypeScript:
  - Types are enforced by Nuxt’s type system; run pnpm typecheck (or npm run typecheck) to validate types without building.
- Linting:
  - pnpm lint (or npm run lint) to run ESLint using the config from eslint.config.mjs and the stylistic overrides in nuxt.config.ts.

Authentication and Routing
- The project uses nuxt-auth-utils. Middleware exists under app/middleware (for example, auth.ts). When protecting routes, prefer Nuxt route rules plus middleware guards; use definePageMeta({ middleware: 'auth' }) or named middleware as appropriate.
- Layouts: default and plain are provided (app/layouts). Pages can select a layout via definePageMeta({ layout: 'plain' }).

Testing
Overview
- There is no test runner pinned in devDependencies. For ad-hoc or CI-driven tests without modifying package.json, use Vitest via npx (npm) or dlx (pnpm). If you want a permanent test setup, add Vitest to devDependencies and define scripts.

Quick, zero-config test run (validated)
- Create a test file anywhere under tests/ (Vitest default) and run:
  - Using npm (works even if pnpm is not installed):
    - npx --yes vitest run
  - Using pnpm:
    - pnpm dlx vitest run
- Minimal example that passed locally:
  - File: tests/sample.test.ts
    import { describe, it, expect } from 'vitest'
    describe('sanity', () => {
      it('adds numbers correctly', () => {
        expect(2 + 3).toBe(5)
      })
    })
- Notes:
  - Avoid specifying --reporter=basic unless using a reporter plugin; the default reporter works out of the box.
  - If your tests import project modules that rely on Nuxt aliases (like ~ or #imports), add a basic vitest config (vitest.config.ts) mapping aliases to Vite resolve.alias entries, or use explicit relative imports.

Permanent integration (optional)
- Add devDependencies:
  - pnpm add -D vitest @vitest/ui @vitest/coverage-v8
- Add package.json scripts:
  - "test": "vitest",
  - "test:run": "vitest run",
  - "test:ui": "vitest --ui"
- Alias configuration (if needed): create vitest.config.ts:
  import { defineConfig } from 'vitest/config'
  export default defineConfig({
    test: {
      environment: 'node'
    },
    resolve: {
      alias: {
        '~': new URL('./app', import.meta.url).pathname,
        '@': new URL('./app', import.meta.url).pathname
      }
    }
  })

Guidelines for adding new tests
- Co-locate unit tests under tests/ or near the modules they cover using *.test.ts naming.
- Keep tests deterministic; avoid network calls. For composables or components depending on Nuxt runtime, abstract logic into pure modules when possible and test those directly.
- For Vue component tests, integrate @vue/test-utils and a jsdom environment via Vitest when you decide to include component tests.

Additional Development Notes
- Code style and linting:
  - ESLint v9 with @nuxt/eslint is configured. Stylistic rules include no dangling commas and 1TBS brace style. Adhere to these to minimize churn.
- Type safety:
  - Prefer explicit types for public APIs (components props, composables return types). Run typecheck in CI to catch regressions.
- UI and design system:
  - The project uses @nuxt/ui for UI primitives; prefer U- prefixed components and tokens for consistent theming and dark mode support.
- Icons and charts:
  - Iconify JSON packages (@iconify-json/lucide, @iconify-json/simple-icons) are included. Use the Nuxt UI <UIcon> component to render icons by name. Charts are powered by @unovis/vue.
- Large uploads:
  - tus-js-client is present, indicating resumable uploads support. Ensure any upload components handle retries and server-side endpoint compatibility.
- Server integration:
  - routeRules exposes CORS for /api/**. For local development against external APIs, configure .env with NUXT_ variables and use runtimeConfig if needed. Document any required env variables in README or here when they become mandatory.
- Project structure tips:
  - Pages live under app/pages, layouts under app/layouts, components under app/components. Use definePageMeta for layout or middleware on a per-page basis. Keep business logic in composables for reusability and testability.

Validated Example (executed before publishing this doc)
- A minimal Vitest file tests/sample.test.ts was created and executed successfully with:
  - npx --yes vitest run
- The file asserted 2 + 3 === 5 and passed. The temporary test file has been removed to keep the repo clean; use the snippet in the Quick, zero-config test run section to recreate it when needed.

Housekeeping
- When running commands on environments without pnpm, prefer npm equivalents or install pnpm first.
- Keep this document concise and focused on project-specific details. Update it as new conventions, env requirements, or tooling decisions are made.
