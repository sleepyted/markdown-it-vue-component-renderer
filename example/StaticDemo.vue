<template>
  <div>
    <h1>MarkdownRenderer Demo</h1>

    <div class="demo-section">
      <h2>Usage</h2>
      <pre><code>import { MarkdownRenderer } from 'markdown-it-vue-component';
import Table from './Table.vue';
import Alert from './Alert.vue';

&lt;MarkdownRenderer
  :content="markdownContent"
  :components="{ table: Table, alert: Alert }"
/&gt;</code></pre>
    </div>

    <div class="demo-section">
      <h2>Markdown Source</h2>
      <pre><code>{{ markdownContent }}</code></pre>
    </div>

    <div class="demo-section">
      <h2>Rendered Result</h2>
      <MarkdownRenderer
        :content="markdownContent"
        :components="registeredComponents"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRenderer } from '../src/index';
import Alert from './components/Alert.vue';
import Table from './components/Table.vue';

const markdownContent = ref(`
# MarkdownRenderer Demo

This example shows how to convert custom markdown containers into Vue components with the high-level MarkdownRenderer API.

## Table examples

### Inline JSON after the container name

\`\`\`
:::table {"title": "Users", "headers": ["Name", "Age", "City"], "rows": [["Alice", 25, "Beijing"], ["Bob", 30, "Shanghai"], ["Carol", 28, "Guangzhou"]], "striped": true}
:::
\`\`\`

:::table {"title": "Users", "headers": ["Name", "Age", "City"], "rows": [["Alice", 25, "Beijing"], ["Bob", 30, "Shanghai"], ["Carol", 28, "Guangzhou"]], "striped": true}
:::

### JSON in the block body

\`\`\`
:::table
{
  "title": "Products",
  "headers": ["Product", "Price", "Status"],
  "rows": [["Product A", 100, "In stock"], ["Product B", 200, "Low stock"]],
  "striped": true,
  "bordered": true
}
:::
\`\`\`

:::table
{
  "title": "Products",
  "headers": ["Product", "Price", "Status"],
  "rows": [["Product A", 100, "In stock"], ["Product B", 200, "Low stock"]],
  "striped": true,
  "bordered": true
}
:::

## Alert examples

:::alert {"type": "warning", "title": "Heads up", "content": "This alert highlights an important warning for the reader."}
:::

:::alert {"type": "success", "title": "Saved", "content": "Your data was saved successfully."}
:::

:::alert {"type": "info", "content": "Standard markdown content and Vue components can live together."}
:::

## Plain Markdown

Normal markdown still renders as usual:

- List item 1
- List item 2
- List item 3

**Bold text** and *italic text* still work.

\`\`\`javascript
const message = "Code blocks also render correctly";
console.log(message);
\`\`\`
`);

const registeredComponents = ref({
  table: Table,
  alert: Alert
});
</script>

<style scoped>
.demo-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.9rem;
}
</style>
