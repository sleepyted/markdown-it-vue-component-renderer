<template>
  <div class="app">
    <h1>Dynamic Rendering Demo - Simulated SSE Output</h1>

    <div class="demo-section">
      <h2>Control Panel</h2>
      <div class="controls">
        <button @click="startStream" :disabled="isStreaming">Start stream</button>
        <button @click="stopStream" :disabled="!isStreaming">Stop stream</button>
        <button @click="resetContent">Reset</button>
      </div>
      <div class="status">
        <span :class="isStreaming ? 'streaming' : 'idle'">
          {{ isStreaming ? 'Streaming content...' : 'Waiting to start' }}
        </span>
      </div>
    </div>

    <div class="demo-section">
      <h2>Live Rendered Result</h2>
      <MarkdownRenderer
        :content="dynamicContent"
        :components="registeredComponents"
      />
    </div>

    <div class="demo-section">
      <h2>Current Content</h2>
      <pre class="raw-content"><code>{{ dynamicContent || '(empty)' }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { MarkdownRenderer } from '../src/index';
import Alert from './components/Alert.vue';
import Table from './components/Table.vue';

const dynamicContent = ref('');
const isStreaming = ref(false);
let streamInterval: number | null = null;
let currentIndex = 0;

const streamChunks = [
  '# Dynamic Rendering Demo\n\n',
  'This example simulates SSE-style streaming output. Content arrives gradually and is rendered live.\n\n',
  '## Part 1: Plain markdown\n\n',
  'This first section shows the basic markdown rendering path.\n\n',
  '- List item 1\n',
  '- List item 2\n',
  '- List item 3\n\n',
  '## Part 2: Alert components\n\n',
  ':::alert {"type": "info", "title": "Info", "content": "This is an informational alert component."}\n:::\n\n',
  'Waiting for more content...\n\n',
  ':::alert {"type": "warning", "title": "Warning", "content": "This is a warning alert component."}\n:::\n\n',
  '## Part 3: Table component\n\n',
  ':::table\n{\n',
  '  "title": "Live data table",\n',
  '  "headers": ["ID", "Name", "Status"],\n',
  '  "rows": [\n',
  '    ["001", "Project A", "In progress"],\n',
  '    ["002", "Project B", "Complete"]\n',
  '  ],\n',
  '  "striped": true\n',
  '}\n:::\n\n',
  '## Part 4: More content\n\n',
  'Additional content can continue streaming in...\n\n',
  '**Bold text** and *italic text* still work.\n\n',
  ':::alert {"type": "success", "title": "Done", "content": "Streaming finished successfully."}\n:::\n\n',
  '```javascript\nconsole.log("Code block example");\n```\n'
];

const registeredComponents = ref({
  table: Table,
  alert: Alert
});

const startStream = () => {
  if (isStreaming.value) return;

  if (dynamicContent.value || currentIndex !== 0) {
    resetContent();
  }

  isStreaming.value = true;

  streamInterval = window.setInterval(() => {
    if (currentIndex < streamChunks.length) {
      dynamicContent.value += streamChunks[currentIndex];
      currentIndex++;
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
};

onUnmounted(() => {
  stopStream();
});
</script>

<style scoped>
.app {
  min-height: 100vh;
}

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
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.9rem;
}
</style>
