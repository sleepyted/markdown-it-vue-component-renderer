<template>
  <div class="app">
    <nav class="nav">
      <button :class="{ active: currentView === 'static' }" @click="currentView = 'static'">
        MarkdownRenderer
      </button>
      <button :class="{ active: currentView === 'plugin' }" @click="currentView = 'plugin'">
        Plugin
      </button>
      <button :class="{ active: currentView === 'dynamic' }" @click="currentView = 'dynamic'">
        Dynamic (SSE)
      </button>
      <button
        :class="{ active: currentView === 'pluginDynamic' }"
        @click="currentView = 'pluginDynamic'"
      >
        Plugin + Dynamic
      </button>
      <button :class="{ active: currentView === 'matcher' }" @click="currentView = 'matcher'">
        Custom matcher
      </button>
    </nav>

    <StaticDemo v-if="currentView === 'static'" />
    <PluginDemo v-else-if="currentView === 'plugin'" />
    <DynamicDemo v-else-if="currentView === 'dynamic'" />
    <PluginDynamicDemo v-else-if="currentView === 'pluginDynamic'" />
    <MatcherDemo v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DynamicDemo from './DynamicDemo.vue';
import MatcherDemo from './MatcherDemo.vue';
import PluginDemo from './PluginDemo.vue';
import PluginDynamicDemo from './PluginDynamicDemo.vue';
import StaticDemo from './StaticDemo.vue';

const currentView = ref<'static' | 'plugin' | 'dynamic' | 'pluginDynamic' | 'matcher'>('static');
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #f5f5f5;
}

.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.nav button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.nav button:hover {
  background: #f0f0f0;
}

.nav button.active {
  background: #4caf50;
  color: white;
}
</style>
