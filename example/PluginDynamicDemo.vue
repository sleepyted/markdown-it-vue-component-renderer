<template>
  <div>
    <h1>标准插件 + 动态渲染示例</h1>
    
    <div class="demo-section">
      <h2>使用方式</h2>
      <pre><code>import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from 'markdown-it-vue-component';
import type { RuntimeController } from 'markdown-it-vue-component';

const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, { components });

let controller: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

// 动态更新内容
dynamicContent.value += chunk;

// 重新渲染并挂载
const renderId = ++renderToken;
activeRenderToken = renderId;
controller?.destroy();
controller = null;

const html = mdi.render(dynamicContent.value);
container.innerHTML = html;

const nextController = await mountComponents(container, components);
if (activeRenderToken !== renderId) {
  nextController.destroy();
  return;
}

controller = nextController;</code></pre>
    </div>
    
    <div class="demo-section">
      <h2>控制面板</h2>
      <div class="controls">
        <button @click="startStream" :disabled="isStreaming">开始模拟流</button>
        <button @click="stopStream" :disabled="!isStreaming">停止流</button>
        <button @click="resetContent">重置</button>
      </div>
      <div class="status">
        <span :class="isStreaming ? 'streaming' : 'idle'">
          {{ isStreaming ? '🔴 流式传输中...' : '⚪ 等待开始' }}
        </span>
      </div>
    </div>
    
    <div class="demo-section">
      <h2>实时渲染结果</h2>
      <div class="markdown-content" ref="containerRef"></div>
    </div>
    
    <div class="demo-section">
      <h2>当前内容</h2>
      <pre class="raw-content"><code>{{ dynamicContent || '(空)' }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, type Component } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from '../src/index';
import type { RuntimeController } from '../src/index';
import Table from './components/Table.vue';
import Alert from './components/Alert.vue';

const dynamicContent = ref('');
const isStreaming = ref(false);
const containerRef = ref<HTMLElement | null>(null);
let streamInterval: number | null = null;
let currentIndex = 0;
let mountedController: RuntimeController | null = null;
let renderToken = 0;
let activeRenderToken = 0;

function markPendingRenderStale() {
  activeRenderToken = ++renderToken;
}

const components: Record<string, Component> = {
  table: Table,
  alert: Alert
};

const mdi = new MarkdownIt({ html: true });
mdi.use(MarkdownVueComponent, { components });

const streamChunks = [
  '# 动态渲染示例\n\n',
  '这是使用标准 markdown-it 插件 + mountComponents 实现的动态渲染。\n\n',
  '## 第一部分：普通文本\n\n',
  '内容会逐步到达并实时渲染。\n\n',
  '- 列表项 1\n',
  '- 列表项 2\n',
  '- 列表项 3\n\n',
  '## 第二部分：警告组件\n\n',
  ':::alert {"type": "info", "title": "提示", "content": "这是一个信息提示组件"}\n:::\n\n',
  '继续接收数据...\n\n',
  ':::alert {"type": "warning", "title": "注意", "content": "这是一个警告提示组件"}\n:::\n\n',
  '## 第三部分：表格组件\n\n',
  ':::table\n{\n',
  '  "title": "动态数据表",\n',
  '  "headers": ["ID", "名称", "状态"],\n',
  '  "rows": [\n',
  '    ["001", "项目A", "进行中"],\n',
  '    ["002", "项目B", "已完成"]\n',
  '  ],\n',
  '  "striped": true\n',
  '}\n:::\n\n',
  '## 第四部分：更多内容\n\n',
  '继续添加更多内容...\n\n',
  '**粗体文本** 和 *斜体文本* 都能正常工作。\n\n',
  ':::alert {"type": "success", "title": "完成", "content": "流式传输已完成！"}\n:::\n\n',
  '```javascript\nconsole.log("代码块示例");\n```\n'
];

async function renderContent() {
  if (!containerRef.value) return;
  
  const renderId = ++renderToken;
  activeRenderToken = renderId;

  if (mountedController) {
    mountedController.destroy();
    mountedController = null;
  }

  const html = mdi.render(dynamicContent.value);
  containerRef.value.innerHTML = html;
  
  const nextController = await mountComponents(containerRef.value, components);
  if (activeRenderToken !== renderId) {
    nextController.destroy();
    return;
  }

  mountedController = nextController;
}

const startStream = () => {
  if (isStreaming.value) return;
  
  isStreaming.value = true;
  currentIndex = 0;
  
  streamInterval = window.setInterval(async () => {
    if (currentIndex < streamChunks.length) {
      dynamicContent.value += streamChunks[currentIndex];
      currentIndex++;
      await renderContent();
    } else {
      stopStream();
    }
  }, 300);
};

const stopStream = () => {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }
  isStreaming.value = false;
};

const resetContent = () => {
  stopStream();
  dynamicContent.value = '';
  currentIndex = 0;
  if (mountedController) {
    mountedController.destroy();
    mountedController = null;
  }
  markPendingRenderStale();
  if (containerRef.value) {
    containerRef.value.innerHTML = '';
  }
};

onUnmounted(() => {
  markPendingRenderStale();
  stopStream();
  if (mountedController) {
    mountedController.destroy();
    mountedController = null;
  }
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

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.controls button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.controls button:first-child {
  background: #4caf50;
  color: white;
}

.controls button:first-child:disabled {
  background: #ccc;
}

.controls button:nth-child(2) {
  background: #f44336;
  color: white;
}

.controls button:nth-child(2):disabled {
  background: #ccc;
}

.controls button:nth-child(3) {
  background: #2196f3;
  color: white;
}

.status {
  font-size: 1.1rem;
  padding: 0.5rem;
}

.status .streaming {
  color: #f44336;
  animation: pulse 1s infinite;
}

.status .idle {
  color: #999;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.raw-content {
  max-height: 300px;
  overflow-y: auto;
}
</style>
