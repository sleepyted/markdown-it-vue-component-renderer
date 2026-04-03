# markdown-it-vue-component-renderer

[English README](./README.md)

把 `markdown-it` 自定义容器语法渲染成 Vue 3 组件。这个包提供两种主要用法：

- 直接使用 `MarkdownRenderer` 组件
- 把它当作标准 `markdown-it` 插件，再配合 `mountComponents()` 手动挂载

## 安装

```bash
npm install markdown-it-vue-component-renderer
```

Peer dependencies:

- `vue@^3`
- `markdown-it@^14`

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
import { MarkdownRenderer } from 'markdown-it-vue-component-renderer';
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

### 方式二：`markdown-it` 插件 + `mountComponents()`

如果你已经有自己的 Markdown 渲染流程，也可以手动接入：

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
  "rows": [["产品A", 100, "有库存"]],
  "striped": true
}
:::
```

### 文本正文

如果正文不是合法 JSON，去掉首尾空白后的正文会自动作为 `content` prop：

```md
:::alert {"type":"info"}
这段文本会变成 `content` prop。
:::
```

### Props 合并规则

props 的生成顺序如下：

1. `:::componentName` 后面的行内 JSON
2. 如果正文是 JSON object，则合并正文里的字段
3. 如果正文不是 JSON，则把正文作为 `content`
4. 如果组件配置了 `propsParser`，则最后合并它的返回值

后面的步骤会覆盖前面的同名字段。

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

- `string` 注册适合在解析阶段标识组件名
- 真正运行时挂载时，只有 Vue 组件对象可以被挂载

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

`mountComponents()` 会扫描容器里的 `[data-vue-component]` 节点，并读取：

- `data-vue-component`
- `data-vue-props`

插件还会额外输出下面两个属性，方便调试或自定义消费逻辑：

- `data-vue-body`
- `data-vue-body-format`

## 动态渲染

如果你是手动调用 `mountComponents()` 来做流式渲染、SSE 或 `watch` 重渲染，建议使用 render token 模式避免异步串线。上面的手动示例就是推荐写法。

## 开发

```bash
npm install
npm test
npm run build
npm run example
```

## 许可证

[MIT](./LICENSE)
