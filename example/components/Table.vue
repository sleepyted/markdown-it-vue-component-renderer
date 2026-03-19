<template>
  <div class="custom-table">
    <h3 v-if="title">{{ title }}</h3>
    <table :class="tableClass">
      <thead v-if="headers.length">
        <tr>
          <th v-for="(header, index) in headers" :key="index">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
          <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
  headers?: string[];
  rows?: string[][];
  striped?: boolean;
  bordered?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  headers: () => [],
  rows: () => [],
  striped: false,
  bordered: false
});

const tableClass = computed(() => ({
  'table-striped': props.striped,
  'table-bordered': props.bordered
}));
</script>

<style scoped>
.custom-table {
  margin: 1rem 0;
}

.custom-table h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.custom-table table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th,
.custom-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.custom-table th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.table-striped tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

.table-bordered th,
.table-bordered td {
  border: 1px solid #ddd;
}
</style>
