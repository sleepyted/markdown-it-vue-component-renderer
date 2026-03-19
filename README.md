# markdown-it-vue-component

一个 markdown-it 插件，支持将自定义容器语法转换为 Vue 3 组件。

## 安装

```bash
npm install markdown-it-vue-component
```

## 使用方式

### 方式一：MarkdownRenderer 组件（推荐）

直接在 Vue 组件中使用，自动处理组件挂载：

```vue
<template>
  <MarkdownRenderer
    :content="markdownContent"
    :components="{ table: Table, alert: Alert }"
  />
</template>

<script setup>
import { ref } from 'vue';
import { MarkdownRenderer } from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# 标题

:::table {"title": "用户列表", "headers": ["姓名", "年龄"], "rows": [["张三", 25]]}
:::

:::alert {"type": "warning", "content": "这是一条警告"}
:::
`);
</script>
```

### 方式二：markdown-it 插件

作为标准 markdown-it 插件使用，需要自行处理 Vue 组件挂载：

```vue
<template>
  <div ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const containerRef = ref(null);
const markdownContent = ref(`
:::table {"title": "用户列表", "headers": ["姓名"], "rows": [["张三"]]}
:::
`);

const componentMap = { Table, Alert };

async function renderMarkdown() {
  const mdi = new MarkdownIt({ html: true });
  
  // 使用插件
  mdi.use(MarkdownVueComponent, {
    components: {
      table: 'Table',
      alert: 'Alert'
    }
  });
  
  // 渲染 HTML
  const html = mdi.render(markdownContent.value);
  containerRef.value.innerHTML = html;
  
  // 手动挂载 Vue 组件
  const { createApp } = await import('vue');
  const elements = containerRef.value.querySelectorAll('[data-vue-component]');
  
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
  });
}

onMounted(renderMarkdown);
watch(markdownContent, renderMarkdown);
</script>
```

## 语法

### 基本语法

```
:::componentName {"prop1": "value1", "prop2": "value2"}
:::
```

### 示例

#### 单行 JSON

```
:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"]], "striped": true}
:::
```

#### 多行 JSON

```
:::table
{
  "title": "产品列表",
  "headers": ["产品", "价格", "状态"],
  "rows": [["产品A", 100, "库存充足"]],
  "striped": true,
  "bordered": true
}
:::
```

#### Alert 组件

```
:::alert {"type": "warning", "title": "注意事项", "content": "这是警告内容"}
:::
```

## API

### MarkdownRenderer Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | `string` | 是 | Markdown 内容 |
| components | `Record<string, Component>` | 是 | 组件映射表 |
| mdOptions | `MarkdownItComponentOptions` | 否 | markdown-it 配置 |
| tag | `string` | 否 | 容器标签，默认 `div` |

### MarkdownItComponentOptions

```typescript
interface MarkdownItComponentOptions {
  html?: boolean;           // 默认 true
  linkify?: boolean;        // 默认 true
  typographer?: boolean;    // 默认 true
  containerClass?: string;  // 默认 'vue-component'
  wrapperTag?: string;      // 默认 'div'
}
```

### 插件配置

```typescript
interface MarkdownVueComponentOptions {
  components: Record<string, string | ComponentConfig>;
  containerClass?: string;
  wrapperTag?: string;
}

interface ComponentConfig {
  component: string;
  propsParser?: (content: string, tokens: Token[]) => Record<string, unknown>;
}
```

## 动态渲染

支持内容动态更新，适用于 SSE 流式输出场景：

```vue
<template>
  <MarkdownRenderer
    :content="dynamicContent"
    :components="components"
  />
</template>

<script setup>
import { ref } from 'vue';
import { MarkdownRenderer } from 'markdown-it-vue-component';

const dynamicContent = ref('');

// 模拟 SSE 流式输出
function appendContent(chunk) {
  dynamicContent.value += chunk;
}
</script>
```

## 组件示例

### Table 组件

```vue
<template>
  <div class="custom-table">
    <h3 v-if="title">{{ title }}</h3>
    <table>
      <thead v-if="headers.length">
        <tr>
          <th v-for="header in headers" :key="header">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  headers: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] }
});
</script>
```

### Alert 组件

```vue
<template>
  <div class="alert" :class="`alert-${type}`">
    <strong v-if="title">{{ title }}</strong>
    <p v-if="content">{{ content }}</p>
  </div>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'info' },
  title: String,
  content: String
});
</script>
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行示例
npm run example
```

## License

MIT
