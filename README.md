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

### 方式二：markdown-it 插件 + mountComponents

作为标准 markdown-it 插件使用，配合 `mountComponents` 辅助函数自动挂载：

```vue
<template>
  <div ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from 'markdown-it-vue-component';
import type { RuntimeController } from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const containerRef = ref(null);
const markdownContent = ref(`
:::table {"title": "用户列表", "headers": ["姓名"], "rows": [["张三"]]}
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
  components: Record<string, string | Component | ComponentConfig>;
  containerClass?: string;
  wrapperTag?: string;
}

interface ComponentConfig {
  component: string | Component;
  propsParser?: (content: string, tokens: Token[]) => Record<string, unknown>;
}
```

### mountComponents function

```typescript
async function mountComponents(
  container: HTMLElement,
  components: Record<string, string | Component | ComponentConfig>
): Promise<RuntimeController>
```

`mountComponents` automatically hydrates every `[data-vue-component]` placeholder by reading the `data-vue-component` and `data-vue-props` attributes emitted by the plugin. The parser also emits `data-vue-body` and `data-vue-body-format` for custom consumers and debugging, but the runtime mount helper does not currently use those attributes directly.

```typescript
interface RuntimeController {
  mountedCount: number; // placeholders successfully mounted during this call
  destroy(): void;      // unmounts the Vue apps and removes their mount points
}
```

The controller lets you inspect how many components were hydrated and enables you to tear them down before replacing the HTML or when the surrounding Vue component unmounts. `destroy()` is idempotent and resets `mountedCount` to `0`.

For runtime hydration, only actual Vue components are mountable:

- `Component`
- `ComponentConfig` whose `component` field is a Vue component object

String-only registrations are still useful at parse time, but `mountComponents()` will warn and skip them because there is no mountable Vue component instance to create.

## Body Semantics

- Inline JSON immediately after the container key (e.g. `:::alert {"type":"warning"}`) becomes the base props object.
- The block body is preserved verbatim on `data-vue-body`. If it parses as JSON, it merges into the props and overrides the inline JSON; otherwise the trimmed text is copied to the `content` prop so freeform text survives.
- `data-vue-body-format` records whether the body was `empty`, `json`, or `text`, and `ComponentConfig.propsParser` always receives the raw body string plus the token context so you can reparse it with no implicit trimming.

## Dynamic Rendering

When you manually rerender markdown (streaming, SSE, `watch`), guard the asynchronous mount by tracking a render ID. Only the latest render should keep its controller; stale renders destroy themselves. A typical pattern is:

```ts
let controller: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

async function renderMarkdown() {
  const renderId = ++renderToken;
  activeRenderToken = renderId;

  controller?.destroy();
  controller = null;

  const html = mdi.render(dynamicContent.value);
  containerRef.value!.innerHTML = html;

  const nextController = await mountComponents(containerRef.value!, components);
  if (activeRenderToken !== renderId) {
    nextController.destroy();
    return;
  }

  controller = nextController;
}

onUnmounted(() => {
  activeRenderToken = ++renderToken;
  controller?.destroy();
});
```

`RuntimeController.mountedCount` is also handy for checking whether the latest render produced any placeholders to hydrate. Streaming helpers such as `<MarkdownRenderer />` still work because they encapsulate this cleanup pattern internally.

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
