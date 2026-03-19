<template>
  <div>
    <h1>标准 markdown-it 插件使用示例</h1>
    
    <div class="demo-section">
      <h2>使用方式</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from 'markdown-it-vue-component';
import Table from './Table.vue';
import Alert from './Alert.vue';

const mdi = new MarkdownIt();
mdi.use(MarkdownVueComponent, {
  components: {
    table: Table,    // 直接传入 Vue 组件
    alert: Alert     // 直接传入 Vue 组件
  }
});

const html = mdi.render(markdownContent);
container.innerHTML = html;

// 使用 mountComponents 辅助函数自动挂载
await mountComponents(container, {
  table: Table,
  alert: Alert
});</code></pre>
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
import { ref, onMounted, watch, type Component } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from '../src/index';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# 标准插件使用示例

这个示例展示了如何作为标准 markdown-it 插件使用，配合 \`mountComponents\` 辅助函数自动挂载 Vue 组件。

## 表格组件

:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"]], "striped": true}
:::

## 警告组件

:::alert {"type": "info", "title": "提示", "content": "使用 mountComponents 辅助函数自动挂载"}
:::

:::alert {"type": "success", "content": "无需手动处理组件挂载逻辑"}
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

async function renderMarkdown() {
  const mdi = new MarkdownIt({ html: true });
  
  mdi.use(MarkdownVueComponent, {
    components: {
      table: Table,
      alert: Alert
    }
  });
  
  const html = mdi.render(markdownContent.value);
  renderedHtml.value = html;
  
  if (containerRef.value) {
    containerRef.value.innerHTML = html;
    
    await mountComponents(containerRef.value, componentMap);
  }
}

onMounted(() => {
  renderMarkdown();
});

watch(markdownContent, renderMarkdown);
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
