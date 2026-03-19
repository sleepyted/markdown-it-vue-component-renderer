<template>
  <div>
    <h1>标准 markdown-it 插件使用示例</h1>
    
    <div class="demo-section">
      <h2>使用方式</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent from 'markdown-it-vue-component';

const mdi = new MarkdownIt();
mdi.use(MarkdownVueComponent, {
  components: {
    table: 'Table',
    alert: 'Alert'
  }
});

const html = mdi.render(markdownContent);

// 需要自行处理 Vue 组件挂载
const { createApp } = await import('vue');
const elements = container.querySelectorAll('[data-vue-component]');

elements.forEach((el) => {
  const componentName = el.getAttribute('data-vue-component');
  const props = JSON.parse(el.getAttribute('data-props') || '{}');
  const component = componentMap[componentName];
  
  if (component) {
    const mountPoint = document.createElement('div');
    el.innerHTML = '';
    el.appendChild(mountPoint);
    createApp(component, props).mount(mountPoint);
  }
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
import MarkdownVueComponent from '../src/index';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# 标准插件使用示例

这个示例展示了如何作为标准 markdown-it 插件使用。

## 表格组件

:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"]], "striped": true}
:::

## 警告组件

:::alert {"type": "info", "title": "提示", "content": "这是通过标准 markdown-it 插件渲染的组件"}
:::

:::alert {"type": "success", "content": "组件挂载由用户手动处理"}
:::

## 普通 Markdown

- 列表项 1
- 列表项 2

**粗体** 和 *斜体*
`);

const renderedHtml = ref('');
const containerRef = ref<HTMLElement | null>(null);

const componentMap: Record<string, Component> = {
  Table,
  Alert
};

async function renderMarkdown() {
  const mdi = new MarkdownIt({ html: true });
  
  mdi.use(MarkdownVueComponent, {
    components: {
      table: 'Table',
      alert: 'Alert'
    }
  });
  
  const html = mdi.render(markdownContent.value);
  renderedHtml.value = html;
  
  if (containerRef.value) {
    containerRef.value.innerHTML = html;
    
    const { createApp } = await import('vue');
    const elements = containerRef.value.querySelectorAll('[data-vue-component]');
    
    elements.forEach((el) => {
      const componentName = el.getAttribute('data-vue-component') || '';
      const propsJson = el.getAttribute('data-props') || '{}';
      
      let props: Record<string, unknown> = {};
      try {
        props = JSON.parse(propsJson);
      } catch (e) {
        console.warn(`Failed to parse props:`, e);
      }
      
      const component = componentMap[componentName];
      
      if (component) {
        const mountPoint = document.createElement('div');
        el.innerHTML = '';
        el.appendChild(mountPoint);
        createApp(component, props).mount(mountPoint);
      }
    });
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
