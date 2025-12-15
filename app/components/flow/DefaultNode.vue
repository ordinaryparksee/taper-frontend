<script setup lang="ts">
import type { ZodStandardJSONSchemaPayload } from 'zod/v4/core'
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'

interface DefaultNodeProps<I = unknown, O = unknown> extends NodeProps {
  inputSchemas?: ZodStandardJSONSchemaPayload<I>[]
  outputSchema?: ZodStandardJSONSchemaPayload<O>
}

const props = defineProps<DefaultNodeProps>()
</script>

<template>
  <Handle v-if="props.inputSchemas" type="source" :position="props.sourcePosition || Position.Left" />
  <UCard
    variant="subtle"
    :ui="{
      header: 'p-2 sm:p-2',
      body: 'p-2 sm:p-2 min-w-[150px] bg-white'
    }"
  >
    <template #header>
      <slot name="header">
        <div class="flex items-center gap-1">
          <strong>
            {{ props.data.label }}
          </strong>
          <div v-if="props.inputSchemas">
            (
            <UBadge
              v-for="inputSchema in props.inputSchemas"
              :key="inputSchema.id"
            >
              {{ inputSchema.id }}
            </UBadge>
            )
          </div>
          <div v-if="props.outputSchema">
            : <UBadge>{{ props.outputSchema.id }}</UBadge>
          </div>
        </div>
      </slot>
    </template>

    <template #default>
      <slot name="default" />
    </template>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
  <Handle v-if="props.outputSchema" type="target" :position="props.targetPosition || Position.Right" />
</template>

<style scoped>

</style>
