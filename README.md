# markdown-it-vue-component

一个把 Markdown 自定义容器语法渲染成 Vue 3 组件的 `markdown-it` 插件。

它支持两种主要用法：

- 直接使用 `MarkdownRenderer` 组件
- 把它当成普通 `markdown-it` 插件，再用 `mountComponents()` 手动挂载

## 安装

```bash
npm install markdown-it-vue-component
```

## 使用方式

### 方式一：`MarkdownRenderer` 组件

这是推荐方式。`MarkdownRenderer` 会负责：

- 渲染 Markdown
- 识别自定义组件容器
- 挂载对应 Vue 组件
- 在内容频繁更新时自动清理旧挂载，避免残留实例

```vue
<template>
  <MarkdownRenderer
    :content="markdownContent"
    :components="{ table: Table, alert: Alert }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRenderer } from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# 标题

:::table {"title":"用户列表","headers":["姓名","年龄"],"rows":[["张三",25]]}
:::

:::alert {"type":"warning","content":"这是一条警告"}
:::
`);
</script>
```

### 方式二：`markdown-it` 插件 + `mountComponents`

如果你已经有自己的 Markdown 渲染流程，也可以手动接入：

```vue
<template>
  <div ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, {
  mountComponents,
  type RuntimeController
} from 'markdown-it-vue-component';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const containerRef = ref<HTMLElement | null>(null);
const markdownContent = ref(`
:::table {"title":"用户列表","headers":["姓名"],"rows":[["张三"]]}
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

```md
:::componentName {"prop1":"value1","prop2":"value2"}
:::
```

### 多行 JSON

```md
:::table
{
  "title": "产品列表",
  "headers": ["产品", "价格", "状态"],
  "rows": [["产品A", 100, "库存充足"]],
  "striped": true
}
:::
```

### 非 JSON 正文

如果正文不是 JSON，对应文本会自动传给组件的 `content` prop：

```md
:::alert {"type":"info"}
这是一段普通文本
:::
```

### 兼容写法

当前实现也兼容“组件名后面紧跟 JSON”的写法：

```md
:::alert{"type":"warning"}
:::
```

## 正文语义

组件容器的 props 生成规则如下：

1. 行内 JSON 先作为基础 props。
2. 如果块正文是 JSON object，则合并进 props，并覆盖同名行内字段。
3. 如果块正文不是 JSON，则把去掉首尾空白后的正文放到 `content` prop。
4. 如果提供了 `propsParser`，它会在最后执行，拿到原始正文字符串和当前容器的 token 上下文，它返回的字段优先级最高。

## API

### `MarkdownRenderer`

```ts
interface MarkdownRendererProps {
  content: string;
  components: Record<string, Component>;
  mdOptions?: MarkdownItComponentOptions;
}
```

`MarkdownRenderer` 额外支持：

- `tag?: string`，默认为 `div`

### `MarkdownItComponentOptions`

```ts
interface MarkdownItComponentOptions {
  html?: boolean;          // 默认 true
  linkify?: boolean;       // 默认 true
  typographer?: boolean;   // 默认 true
  containerClass?: string; // 默认 "vue-component"
  wrapperTag?: string;     // 默认 "div"
}
```

### 插件配置

```ts
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

说明：

- `string` 注册适合解析阶段标识组件名。
- 真正运行时挂载时，只有 Vue 组件对象是可挂载的。
- 如果传入字符串注册给 `mountComponents()`，运行时会发出警告并跳过该占位节点。

### `mountComponents`

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

`mountComponents()` 会扫描容器内的 `[data-vue-component]` 节点，并读取：

- `data-vue-component`
- `data-vue-props`

插件还会输出下面两个属性，供调试或自定义消费逻辑使用，但默认 runtime 不直接依赖它们：

- `data-vue-body`
- `data-vue-body-format`

`RuntimeController` 的作用：

- `mountedCount`：本次成功挂载的组件数量
- `destroy()`：卸载当前 controller 管理的所有 Vue app，并移除它们的挂载点

`destroy()` 是幂等的，可以安全重复调用。

## 动态渲染

如果你是手动调用 `mountComponents()` 做流式渲染、SSE、`watch` 重渲染，建议使用“render token”模式避免异步串线：

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

如果你直接使用 `<MarkdownRenderer />`，这些清理和失效保护已经内建。

## 占位属性

插件输出的占位节点大致如下：

```html
<div
  class="vue-component vue-component--alert"
  data-vue-component="alert"
  data-vue-props="{&quot;type&quot;:&quot;warning&quot;}"
  data-vue-body="&quot;raw body text&quot;"
  data-vue-body-format="text"
></div>
```

其中：

- `data-vue-props` 是 runtime 默认读取的 props 数据
- `data-vue-body-format` 可能是 `empty`、`json` 或 `text`

## 示例组件

### Table

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

### Alert

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
npm install
npm test
npm run build
npm run example
```

## License

MIT
