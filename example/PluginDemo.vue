<template>
  <div>
    <h1>标准 markdown-it 插件使用示例</h1>

    <div class="demo-section">
      <h2>使用方式</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, {
  mountComponents,
  type RuntimeController
} from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const components = { table: Table, alert: Alert };
const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, { components });

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
      <h2>Markdown 源码</h2>
      <pre><code>{{ markdownContent }}</code></pre>
    </div>

    <div class="demo-section">
      <h2>渲染后的 HTML</h2>
      <pre class="html-output"><code>{{ renderedHtml }}</code></pre>
    </div>

    <div class="demo-section">
      <h2>最终渲染结果</h2>
      <div class="markdown-content" ref="containerRef"></div>
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
# 标准插件使用示例

这个示例展示了如何把本库当作标准 \`markdown-it\` 插件使用，并配合 \`mountComponents()\` 手动挂载 Vue 组件。

## 表格组件

:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"]], "striped": true}
:::

## 提示组件

:::alert {"type": "info", "title": "提示", "content": "手动挂载时要保存 RuntimeController，并在重渲染前先销毁旧实例。"}
:::

:::alert {"type": "success", "content": "这样可以避免旧渲染残留在容器中。"}
:::

## 普通 Markdown

- 列表项 1
- 列表项 2

**粗体** 和 *斜体*
`);

const renderedHtml = ref('');
const containerRef = ref<HTMLElement | null>(null);

const componentMap: Record<string, Component> = {
  table: Table,
  alert: Alert
};

const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, {
  components: componentMap
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
  renderMarkdown();
});

watch(markdownContent, renderMarkdown);

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

.html-output {
  max-height: 300px;
  overflow-y: auto;
}

code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.85rem;
}
</style>
