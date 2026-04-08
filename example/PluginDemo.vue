<template>
  <div>
    <h1>Simple Syntax Customization Demo</h1>

    <div class="demo-section">
      <h2>Usage</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, {
  mountComponents,
  type RuntimeController
} from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const components = { table: Table, alert: Alert };
const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    marker: '@@@'
  }
});

let controller: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

const renderId = ++renderToken;
activeRenderToken = renderId;
controller?.destroy();
controller = null;

const html = mdi.render(markdownContent);
container.innerHTML = html;

const nextController = await mountComponents(container, components);
if (activeRenderToken !== renderId) {
  nextController.destroy();
  return;
}

controller = nextController;</code></pre>
    </div>

    <div class="demo-section">
      <h2>Markdown Source</h2>
      <pre><code>{{ markdownContent }}</code></pre>
    </div>

    <div class="demo-section">
      <h2>Rendered HTML</h2>
      <pre class="html-output"><code>{{ renderedHtml }}</code></pre>
    </div>

    <div class="demo-section">
      <h2>Mounted Result</h2>
      <div ref="containerRef" class="markdown-content"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Component } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from '../src/index';
import type { RuntimeController } from '../src/index';
import Alert from './components/Alert.vue';
import Table from './components/Table.vue';

const markdownContent = ref(`
# syntax.marker Demo

This page demonstrates simple syntax customization by replacing the default \`:::\` delimiter with \`@@@\`.

The rendering, mounting, and cleanup pipeline stays the same. Only the block delimiter changes.

## Alert example

@@@alert {"type": "info", "title": "Custom delimiter", "content": "Use syntax.marker when you only need to change the container marker."}
@@@

@@@alert {"type": "success", "content": "The parser still produces the same placeholder format for the runtime layer."}
@@@

## Table example

@@@table {"title": "Users", "headers": ["Name", "Age", "City"], "rows": [["Alice", 25, "Beijing"], ["Bob", 30, "Shanghai"]], "striped": true}
@@@

## Plain Markdown

- Existing markdown still works
- RuntimeController cleanup still applies

**Bold** and *italic* text render as usual.
`);

const renderedHtml = ref('');
const containerRef = ref<HTMLElement | null>(null);

const componentMap: Record<string, Component> = {
  table: Table,
  alert: Alert
};

const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, {
  components: componentMap,
  syntax: {
    marker: '@@@'
  }
});

let mountedController: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

async function renderMarkdown() {
  if (!containerRef.value) {
    return;
  }

  const renderId = ++renderToken;
  activeRenderToken = renderId;

  mountedController?.destroy();
  mountedController = null;

  const html = mdi.render(markdownContent.value);
  renderedHtml.value = html;
  containerRef.value.innerHTML = html;

  const nextController = await mountComponents(containerRef.value, componentMap);
  if (activeRenderToken !== renderId) {
    nextController.destroy();
    return;
  }

  mountedController = nextController;
}

onMounted(() => {
  void renderMarkdown();
});

watch(markdownContent, () => void renderMarkdown());

onUnmounted(() => {
  activeRenderToken = ++renderToken;
  mountedController?.destroy();
  mountedController = null;
});
</script>

<style scoped>
.demo-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.demo-section h2 {
  margin-top: 0;
  color: #555;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

pre {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.html-output {
  max-height: 300px;
  overflow-y: auto;
}

code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.85rem;
}
</style>
