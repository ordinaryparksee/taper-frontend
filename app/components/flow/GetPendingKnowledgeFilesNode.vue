<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
</script>

<template>
  <FlowDefaultNode
    v-bind="props"
    :data="{
      label: props.data.label || 'Pending knowledge files'
    }"
    :output-schema="KnowledgeFileSchema"
  >
    Body
  </FlowDefaultNode>
</template>

<style scoped>

</style>
