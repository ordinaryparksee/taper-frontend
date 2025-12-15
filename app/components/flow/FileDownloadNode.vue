<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
</script>

<template>
  <FlowDefaultNode
    v-bind="props"
    :data="{
      label: props.data.label || 'Download file'
    }"
    :input-schemas="[FileSchema]"
    :output-schema="FileSchema"
  >
    Body
  </FlowDefaultNode>
</template>

<style scoped>

</style>
