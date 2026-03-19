<template>
  <div class="custom-alert" :class="`alert-${type}`">
    <strong v-if="title">{{ title }}</strong>
    <p v-if="content">{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  content?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  content: ''
});
</script>

<style scoped>
.custom-alert {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.alert-info {
  background-color: #e7f3ff;
  border-left: 4px solid #2196f3;
  color: #0d47a1;
}

.alert-warning {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
  color: #e65100;
}

.alert-error {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  color: #c62828;
}

.alert-success {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
  color: #2e7d32;
}

.custom-alert strong {
  display: block;
  margin-bottom: 0.25rem;
}
</style>
