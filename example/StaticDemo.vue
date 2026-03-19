<template>
  <div>
    <h1>Markdown-it Vue Component Plugin Demo</h1>
    
    <div class="demo-section">
      <h2>使用方式</h2>
      <pre><code>import { MarkdownRenderer } from 'markdown-it-vue-component';
import Table from './Table.vue';
import Alert from './Alert.vue';

&lt;MarkdownRenderer
  :content="markdownContent"
  :components="{ table: Table, alert: Alert }"
/&gt;</code></pre>
    </div>
    
    <div class="demo-section">
      <h2>Markdown 源码</h2>
      <pre><code>{{ markdownContent }}</code></pre>
    </div>
    
    <div class="demo-section">
      <h2>渲染结果</h2>
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
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const markdownContent = ref(`
# Markdown Vue Component 示例

这是一个演示如何使用自定义容器语法将 Markdown 内容转换为 Vue 组件的示例。

## 表格组件示例

### 方式一：JSON 在标签后

\`\`\`
:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"], ["王五", 28, "广州"]], "striped": true}
:::
\`\`\`

:::table {"title": "用户列表", "headers": ["姓名", "年龄", "城市"], "rows": [["张三", 25, "北京"], ["李四", 30, "上海"], ["王五", 28, "广州"]], "striped": true}
:::

### 方式二：JSON 在内容中

\`\`\`
:::table
{
  "title": "产品列表",
  "headers": ["产品", "价格", "状态"],
  "rows": [["产品A", 100, "库存充足"], ["产品B", 200, "库存紧张"]],
  "striped": true,
  "bordered": true
}
:::
\`\`\`

:::table
{
  "title": "产品列表",
  "headers": ["产品", "价格", "状态"],
  "rows": [["产品A", 100, "库存充足"], ["产品B", 200, "库存紧张"]],
  "striped": true,
  "bordered": true
}
:::

## 警告组件示例

:::alert {"type": "warning", "title": "注意事项", "content": "这是一个警告提示，用于提醒用户重要信息。"}
:::

:::alert {"type": "success", "title": "操作成功", "content": "您的数据已成功保存！"}
:::

:::alert {"type": "info", "content": "这是一条普通的信息提示。"}
:::

## 普通 Markdown 内容

插件不会影响普通的 Markdown 渲染：

- 列表项 1
- 列表项 2
- 列表项 3

**粗体文本** 和 *斜体文本* 都能正常工作。

\`\`\`javascript
const message = "代码块也能正常显示";
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
