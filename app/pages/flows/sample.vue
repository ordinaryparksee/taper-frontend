<script setup lang="ts">
import { ref } from 'vue'
import { VueFlow } from '@vue-flow/core'

const elements = ref([
  {
    id: '1',
    type: 'input',
    label: 'Node 1',
    position: { x: 250, y: 5 }
  },
  {
    id: '2',
    label: 'Node 2',
    position: { x: 100, y: 100 }
  },
  {
    id: '3',
    label: 'Node 3',
    position: { x: 400, y: 100 }
  },
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3'
  }
])
</script>

<template>
  <div class="flow-container">
    <VueFlow v-model="elements" fit-view-on-init />
  </div>
</template>

<style scoped>
.flow-container {
  width: 100%;
  height: 800px;
  background-color: #f8f9fa;
}
</style>
