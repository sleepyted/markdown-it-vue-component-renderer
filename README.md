# markdown-it-vue-component-renderer

Render Vue 3 components from `markdown-it` container blocks. This package provides a high-level `MarkdownRenderer` component for reactive content and a lower-level `mountComponents()` runtime for manual integration with an existing `markdown-it` pipeline.

[中文文档 / Chinese README](./README.zh-CN.md)

## Features

- Render custom container blocks as Vue 3 components
- Use a drop-in `MarkdownRenderer` component for reactive content
- Mount components manually on top of an existing `markdown-it` render flow
- Support JSON props from inline arguments or multiline block bodies
- Handle repeated or streaming updates with `RuntimeController`
- Customize the block matching syntax with delimiter options or a custom matcher

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

## Custom Syntax

Use `syntax.marker` when you only want to change the delimiter:

```ts
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    marker: '@@@'
  }
});
```

```md
@@@alert {"type":"info","content":"Custom delimiters still mount Vue components."}
@@@
```

Use `syntax.matcher` when you need a completely different block shape:

```ts
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    matcher({ state, startLine, endLine, componentEntries }) {
      const openLine = state.src
        .slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine])
        .trim();
      const match = openLine.match(/^<([^\s>]+)(?:\s+(.+))?>$/);
      if (!match) return null;

      const [, containerKey, inlineArgsRaw = ''] = match;
      if (!componentEntries.has(containerKey)) return null;

      for (let lineNo = startLine + 1; lineNo < endLine; lineNo++) {
        const line = state.src
          .slice(state.bMarks[lineNo] + state.tShift[lineNo], state.eMarks[lineNo])
          .trim();
        if (line === `</${containerKey}>`) {
          return {
            nextLine: lineNo + 1,
            containerKey,
            inlineArgsRaw,
            bodyRaw: state.getLines(startLine + 1, lineNo, 0, false).trimEnd()
          };
        }
      }

      return null;
    }
  }
});
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

### Props Merge Rules

Props are resolved in this order:

1. Inline JSON after `:::componentName`
2. Multiline JSON body, if the body parses as an object
3. A trimmed `content` prop, if the body is not JSON
4. `propsParser` output, if a component config provides one

Later steps override earlier values.

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
  syntax?: MarkdownVueComponentSyntaxOptions;
}
```

### Plugin Options

```ts
interface MarkdownVueComponentOptions {
  components: Record<string, string | Component | ComponentConfig>;
  containerClass?: string;
  wrapperTag?: string;
  syntax?: MarkdownVueComponentSyntaxOptions;
}

interface ComponentConfig {
  component: string | Component;
  propsParser?: (content: string, tokens: Token[]) => Record<string, unknown>;
}

interface MarkdownVueComponentSyntaxOptions {
  marker?: string;
  openMarker?: string;
  closeMarker?: string;
  matcher?: ContainerMatcher;
}
```

String registrations are useful when you only need to name a component during parsing, but only actual Vue component objects can be mounted at runtime.

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

`mountComponents()` scans placeholder nodes with:

- `data-vue-component`
- `data-vue-props`

The plugin also emits these attributes for inspection or custom integrations:

- `data-vue-body`
- `data-vue-body-format`

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
