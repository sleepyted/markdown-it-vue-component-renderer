<template>
  <div>
    <h1>Advanced Syntax Customization Demo</h1>

    <div class="demo-section">
      <h2>Usage</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, {
  mountComponents,
  type ContainerMatchResult,
  type RuntimeController
} from 'markdown-it-vue-component';

const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    matcher({ state, startLine, endLine, componentEntries }): ContainerMatchResult | null {
      const openLine = state.src
        .slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine])
        .trim();

      const tagMatch = openLine.match(/^&lt;([^\s&gt;]+)(?:\s+(.+))?&gt;$/);
      const bracketMatch = openLine.match(/^\[\[([^\s\]]+)(?:\s+(.+))?\]\]$/);
      const match = tagMatch ?? bracketMatch;
      if (!match) return null;

      const [, containerKey, inlineArgsRaw = ''] = match;
      if (!componentEntries.has(containerKey)) return null;

      const closeLine = tagMatch ? `&lt;/${containerKey}&gt;` : `[[/${containerKey}]]`;
      for (let lineNo = startLine + 1; lineNo &lt; endLine; lineNo++) {
        const line = state.src
          .slice(state.bMarks[lineNo] + state.tShift[lineNo], state.eMarks[lineNo])
          .trim();
        if (line === closeLine) {
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
});</code></pre>
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
import MarkdownVueComponent, {
  mountComponents,
  type ContainerMatchResult,
  type ContainerMatcherContext,
  type RuntimeController
} from '../src/index';
import Alert from './components/Alert.vue';
import Table from './components/Table.vue';

function tagMatcher({
  state,
  startLine,
  endLine,
  componentEntries
}: ContainerMatcherContext): ContainerMatchResult | null {
  const openLine = state.src
    .slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine])
    .trim();

  const tagMatch = openLine.match(/^<([^\s>]+)(?:\s+(.+))?>$/);
  const bracketMatch = openLine.match(/^\[\[([^\s\]]+)(?:\s+(.+))?\]\]$/);
  const match = tagMatch ?? bracketMatch;
  if (!match) {
    return null;
  }

  const [, containerKey, inlineArgsRaw = ''] = match;
  if (!componentEntries.has(containerKey)) {
    return null;
  }

  const closeLine = tagMatch ? `</${containerKey}>` : `[[/${containerKey}]]`;
  for (let lineNo = startLine + 1; lineNo < endLine; lineNo++) {
    const line = state.src
      .slice(state.bMarks[lineNo] + state.tShift[lineNo], state.eMarks[lineNo])
      .trim();
    if (line === closeLine) {
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

const markdownContent = ref(`
# syntax.matcher Demo

This page demonstrates advanced syntax customization with a custom matcher.

The rendering, mounting, and cleanup pipeline stays the same. Only the block recognition logic changes.

## Alert example

<alert {"type":"info"}>
This alert is matched by syntax.matcher instead of the built-in ::: container rule.
</alert>

## Bracket-style alert example

[[alert {"type":"success"}]]
The same matcher can also support nested project-specific delimiters such as [[alert]] and [[/alert]].
[[/alert]]

## Table example

<table {"title":"Tag-style blocks","headers":["Name","Role"],"rows":[["Alice","Author"],["Bob","Reviewer"]],"striped":true}>
</table>
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
    matcher: tagMatcher
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
