# NPM Publish Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the package for a clean npm release under the new name `markdown-it-vue-component-renderer`, with complete metadata, English-first documentation, and packaging safeguards against stale `dist/` artifacts.

**Architecture:** Keep the runtime and parser implementation unchanged. Add one focused metadata test file, tighten `package.json` release metadata and scripts, rewrite root docs for npm/GitHub first contact, preserve Chinese docs in a secondary README, and verify the packed tarball contains only the intended build output.

**Tech Stack:** TypeScript, Vitest, Node.js package metadata, npm pack, Markdown documentation

---

## File Map

- Modify: `d:\study\markdown-it-vue-component\package.json`
- Modify: `d:\study\markdown-it-vue-component\README.md`
- Create: `d:\study\markdown-it-vue-component\README.zh-CN.md`
- Create: `d:\study\markdown-it-vue-component\LICENSE`
- Create: `d:\study\markdown-it-vue-component\tests\package-metadata.spec.ts`

### Task 1: Lock Release Metadata and Packaging Guards

**Files:**
- Modify: `d:\study\markdown-it-vue-component\package.json`
- Create: `d:\study\markdown-it-vue-component\tests\package-metadata.spec.ts`
- Test: `d:\study\markdown-it-vue-component\tests\package-metadata.spec.ts`

- [ ] **Step 1: Write the failing metadata test**

Create `d:\study\markdown-it-vue-component\tests\package-metadata.spec.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type PackageJson = {
  name: string;
  version: string;
  description?: string;
  license?: string;
  repository?: { type?: string; url?: string } | string;
  homepage?: string;
  bugs?: { url?: string } | string;
  exports?: Record<string, { import?: string; types?: string }>;
  files?: string[];
  sideEffects?: boolean;
  scripts?: Record<string, string>;
};

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
) as PackageJson;

describe('package metadata for npm publishing', () => {
  test('uses the chosen publishable package identity', () => {
    expect(packageJson.name).toBe('markdown-it-vue-component-renderer');
    expect(packageJson.version).toBe('0.1.0');
    expect(packageJson.license).toBe('MIT');
  });

  test('includes repository metadata for npm package pages', () => {
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/sleepyted/markdown-it-vue-component-renderer.git'
    });
    expect(packageJson.homepage).toBe(
      'https://github.com/sleepyted/markdown-it-vue-component-renderer#readme'
    );
    expect(packageJson.bugs).toEqual({
      url: 'https://github.com/sleepyted/markdown-it-vue-component-renderer/issues'
    });
  });

  test('publishes only the dist entry through exports', () => {
    expect(packageJson.exports).toEqual({
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts'
      }
    });
    expect(packageJson.files).toEqual(['dist']);
    expect(packageJson.sideEffects).toBe(false);
  });

  test('defines clean and publish guard scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      clean: 'node -e "require(\'node:fs\').rmSync(\'dist\', { recursive: true, force: true })"',
      build: 'npm run clean && tsc',
      prepack: 'npm test && npm run build',
      prepublishOnly: 'npm test && npm run build'
    });
  });
});
```

- [ ] **Step 2: Run the metadata test to verify it fails**

Run:

```bash
npm test -- tests/package-metadata.spec.ts
```

Expected:

- FAIL because the current package name is still `markdown-it-vue-component`
- FAIL because `license`, `repository`, `homepage`, `bugs`, `exports`, `sideEffects`, and release scripts are still missing

- [ ] **Step 3: Update `package.json` with the release-ready metadata**

Replace the current metadata section in `d:\study\markdown-it-vue-component\package.json` so the file matches this structure:

```json
{
  "name": "markdown-it-vue-component-renderer",
  "version": "0.1.0",
  "description": "Render Vue 3 components from markdown-it container blocks with a ready-to-use MarkdownRenderer or manual runtime mounting.",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "sideEffects": false,
  "scripts": {
    "clean": "node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
    "build": "npm run clean && tsc",
    "dev": "tsc --watch",
    "example": "vite",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepack": "npm test && npm run build",
    "prepublishOnly": "npm test && npm run build"
  },
  "keywords": [
    "markdown-it",
    "markdown-it-plugin",
    "markdown",
    "vue",
    "vue3",
    "vue-component",
    "renderer"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sleepyted/markdown-it-vue-component-renderer.git"
  },
  "homepage": "https://github.com/sleepyted/markdown-it-vue-component-renderer#readme",
  "bugs": {
    "url": "https://github.com/sleepyted/markdown-it-vue-component-renderer/issues"
  },
  "peerDependencies": {
    "markdown-it": "^14.0.0",
    "vue": "^3.0.0"
  },
  "devDependencies": {
    "@types/markdown-it": "^14.1.2",
    "@types/node": "^22.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^29.0.1",
    "markdown-it": "^14.1.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^4.1.2",
    "vue": "^3.4.0"
  }
}
```

- [ ] **Step 4: Run the metadata test to verify it passes**

Run:

```bash
npm test -- tests/package-metadata.spec.ts
```

Expected:

- PASS
- All 4 metadata assertions pass

- [ ] **Step 5: Commit the metadata changes**

Run:

```bash
git add package.json tests/package-metadata.spec.ts
git commit -m "chore: prepare package metadata for npm publish"
```

### Task 2: Add the MIT License and Rewrite Docs for npm/GitHub Visitors

**Files:**
- Modify: `d:\study\markdown-it-vue-component\README.md`
- Create: `d:\study\markdown-it-vue-component\README.zh-CN.md`
- Create: `d:\study\markdown-it-vue-component\LICENSE`

- [ ] **Step 1: Add the MIT license file**

Create `d:\study\markdown-it-vue-component\LICENSE` with:

```text
MIT License

Copyright (c) 2026 sleepyted

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Replace the root README with an English npm-facing document**

Replace `d:\study\markdown-it-vue-component\README.md` with:

```md
# markdown-it-vue-component-renderer

Render Vue 3 components from `markdown-it` container blocks. The package provides a high-level `MarkdownRenderer` component for most use cases and a lower-level `mountComponents()` runtime for manual integration with existing `markdown-it` pipelines.

[中文文档 / Chinese README](./README.zh-CN.md)

## Features

- Render custom container blocks as Vue 3 components
- Use a drop-in `MarkdownRenderer` component for reactive content
- Mount components manually on top of an existing `markdown-it` render flow
- Support JSON props from inline arguments or block bodies
- Handle repeated or streaming updates with `RuntimeController`

## Installation

```bash
npm install markdown-it-vue-component-renderer
```

Peer dependencies:

- `vue@^3`
- `markdown-it@^14`

## Recommended Usage: `MarkdownRenderer`

```vue
<template>
  <MarkdownRenderer
    :content="markdownContent"
    :components="{ table: Table, alert: Alert }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRenderer } from 'markdown-it-vue-component-renderer';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# Demo

:::table {"title":"Users","headers":["Name","Age"],"rows":[["Alice",25],["Bob",30]]}
:::

:::alert {"type":"warning","content":"This block is rendered as a Vue component."}
:::
`);
</script>
```

`MarkdownRenderer` handles:

- markdown rendering
- placeholder detection
- Vue component mounting
- cleanup during repeated updates
- stale async render protection

## Manual Usage: `markdown-it` Plugin + `mountComponents()`

Use this path when you already control the `markdown-it` lifecycle yourself.

```vue
<template>
  <div ref="containerRef"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, {
  mountComponents,
  type RuntimeController
} from 'markdown-it-vue-component-renderer';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const containerRef = ref<HTMLElement | null>(null);
const markdownContent = ref(`
:::table {"title":"Users","headers":["Name"],"rows":[["Alice"]]}
:::
`);

const components = { table: Table, alert: Alert };
const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, { components });

let controller: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

async function renderMarkdown() {
  if (!containerRef.value) return;

  const renderId = ++renderToken;
  activeRenderToken = renderId;

  controller?.destroy();
  controller = null;

  const html = mdi.render(markdownContent.value);
  containerRef.value.innerHTML = html;

  const nextController = await mountComponents(containerRef.value, components);
  if (activeRenderToken !== renderId) {
    nextController.destroy();
    return;
  }

  controller = nextController;
}

onMounted(renderMarkdown);
watch(markdownContent, renderMarkdown);

onUnmounted(() => {
  activeRenderToken = ++renderToken;
  controller?.destroy();
});
</script>
```

## Syntax

### Inline JSON

```md
:::componentName {"prop1":"value1","prop2":"value2"}
:::
```

### Multiline JSON

```md
:::table
{
  "title": "Products",
  "headers": ["Name", "Price", "Status"],
  "rows": [["Item A", 100, "In stock"]],
  "striped": true
}
:::
```

### Text Body

When the block body is not valid JSON, the trimmed body is passed as `content`:

```md
:::alert {"type":"info"}
This text becomes the `content` prop.
:::
```

## API

### `MarkdownRenderer`

```ts
interface MarkdownRendererProps {
  content: string;
  components: Record<string, Component>;
  mdOptions?: MarkdownItComponentOptions;
  tag?: string;
}
```

### `MarkdownItComponentOptions`

```ts
interface MarkdownItComponentOptions {
  html?: boolean;
  linkify?: boolean;
  typographer?: boolean;
  containerClass?: string;
  wrapperTag?: string;
}
```

### `mountComponents()`

```ts
async function mountComponents(
  container: HTMLElement,
  components: Record<string, string | Component | ComponentConfig>
): Promise<RuntimeController>
```

```ts
interface RuntimeController {
  mountedCount: number;
  destroy(): void;
}
```

## Dynamic Rendering Notes

If you call `mountComponents()` repeatedly for streaming updates, SSE-style output, or watcher-driven rerenders, keep a render token and destroy stale controllers before accepting a new render result. The manual example above shows the recommended pattern.

## Development

```bash
npm install
npm test
npm run build
npm run example
```

## License

[MIT](./LICENSE)
```

- [ ] **Step 3: Preserve the existing Chinese documentation in `README.zh-CN.md`**

Copy the current Chinese documentation into `d:\study\markdown-it-vue-component\README.zh-CN.md`, then add this header above the existing body:

```md
# markdown-it-vue-component-renderer

[English README](./README.md)
```

Keep the existing Chinese API explanation and examples intact unless they still reference the old package name. Update imports and install commands so they use:

```md
npm install markdown-it-vue-component-renderer
```

and:

```ts
import MarkdownVueComponent from 'markdown-it-vue-component-renderer';
import { MarkdownRenderer } from 'markdown-it-vue-component-renderer';
```

- [ ] **Step 4: Sanity-check both README files**

Run:

```bash
rg -n "markdown-it-vue-component(?!-renderer)" README.md README.zh-CN.md
```

Expected:

- no matches for the old package name in install or import snippets

Run:

```bash
rg -n "README.zh-CN|English README|Chinese README" README.md README.zh-CN.md
```

Expected:

- README cross-links appear in both files

- [ ] **Step 5: Commit the docs and license updates**

Run:

```bash
git add README.md README.zh-CN.md LICENSE
git commit -m "docs: rewrite npm-facing readme"
```

### Task 3: Verify Clean Builds and the Published Tarball Contents

**Files:**
- Modify: `d:\study\markdown-it-vue-component\package.json`
- Verify: `d:\study\markdown-it-vue-component\dist\`

- [ ] **Step 1: Run the full test suite after metadata and docs changes**

Run:

```bash
npm test
```

Expected:

- PASS
- existing renderer/runtime/plugin tests still pass
- `tests/package-metadata.spec.ts` passes

- [ ] **Step 2: Run the clean build**

Run:

```bash
npm run build
```

Expected:

- PASS
- `dist/` is recreated from current `src/`

- [ ] **Step 3: Inspect the packed tarball contents**

Run:

```bash
npm pack --dry-run
```

Expected:

- the tarball contains `README.md`, `package.json`, and current `dist/*`
- the tarball does not include stale historical build artifacts unrelated to current `src/`
- the tarball does not include `example/`, `tests/`, or docs source files

- [ ] **Step 4: Re-check name availability before final publish prep**

Run:

```bash
npm view markdown-it-vue-component-renderer name version --json
```

Expected:

- E404 not found, confirming the name is still available at the moment of release prep

- [ ] **Step 5: Commit the verified release refresh**

Run:

```bash
git add package.json README.md README.zh-CN.md LICENSE tests/package-metadata.spec.ts
git commit -m "chore: refresh package for npm release"
```
