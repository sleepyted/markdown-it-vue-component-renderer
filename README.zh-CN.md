# markdown-it-vue-component-renderer

[English README](./README.md)

将 `markdown-it` 中的自定义区块渲染成 Vue 3 组件。这个包提供两种主要用法：

- 直接使用 `MarkdownRenderer` 组件
- 把它当作标准 `markdown-it` 插件，再配合 `mountComponents()` 手动挂载

## 安装

```bash
npm install markdown-it-vue-component-renderer
```

Peer dependencies:

- `vue@^3`
- `markdown-it@^14`

## 推荐用法：`MarkdownRenderer`

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
# 示例

:::table {"title":"用户列表","headers":["姓名","年龄"],"rows":[["张三",25]]}
:::

:::alert {"type":"warning","content":"这是一条警告"}
:::
`);
</script>
```

`MarkdownRenderer` 会负责：

- Markdown 渲染
- 占位节点生成
- Vue 组件挂载
- 内容更新时的旧实例清理

## 手动用法：`markdown-it` 插件 + `mountComponents()`

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

## 自定义语法

### 使用 `syntax.marker` 更换分隔符

```ts
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    marker: '@@@'
  }
});
```

```md
@@@alert {"type":"info","content":"自定义分隔符依然会挂载 Vue 组件。"}
@@@
```

### 使用 `syntax.matcher` 自定义整套匹配逻辑

```ts
mdi.use(MarkdownVueComponent, {
  components,
  syntax: {
    matcher({ state, startLine, endLine, componentEntries }) {
      const openLine = state.src
        .slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine])
        .trim();

      const tagMatch = openLine.match(/^<([^\s>]+)(?:\s+(.+))?>$/);
      const bracketMatch = openLine.match(/^\[\[([^\s\]]+)(?:\s+(.+))?\]\]$/);
      const match = tagMatch ?? bracketMatch;
      if (!match) return null;

      const [, containerKey, inlineArgsRaw = ''] = match;
      if (!componentEntries.has(containerKey)) return null;

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
  }
});
```

支持的 Markdown 例子：

```md
<alert {"type":"info"}>
标签式自定义语法
</alert>

[[alert {"type":"success"}]]
方括号式自定义语法
[[/alert]]
```

## 语法

### 行内 JSON

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

当正文不是合法 JSON 时，去掉首尾空白后的正文会自动作为 `content` prop：

```md
:::alert {"type":"info"}
这段文本会成为 `content` prop。
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
  syntax?: MarkdownVueComponentSyntaxOptions;
}
```

### 插件配置

```ts
interface MarkdownVueComponentOptions {
  components: Record<string, string | Component | ComponentConfig>;
  containerClass?: string;
  wrapperTag?: string;
  syntax?: MarkdownVueComponentSyntaxOptions;
}

interface ComponentConfig {
  component: string | Component;
  propsParser?: (content: string, tokens: Token[]) => Record<string, unknown>;
}

interface MarkdownVueComponentSyntaxOptions {
  marker?: string;
  openMarker?: string;
  closeMarker?: string;
  matcher?: ContainerMatcher;
}
```

说明：

- `string` 注册适合在解析阶段标识组件名
- 真正运行时挂载时，只有 Vue 组件对象可以被挂载

### `mountComponents()`

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

`mountComponents()` 会扫描容器中的：

- `data-vue-component`
- `data-vue-props`

插件还会输出：

- `data-vue-body`
- `data-vue-body-format`

## 动态渲染

如果你会重复调用 `mountComponents()` 来处理流式输出、SSE 或 watcher 驱动的重新渲染，建议像示例那样维护 render token，并在接受新结果前先销毁旧 controller。

## 开发

```bash
npm install
npm test
npm run build
npm run example
```

## 许可证

[MIT](./LICENSE)
