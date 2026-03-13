<script setup lang="ts">
import type { ZodStandardJSONSchemaPayload } from 'zod/v4/core'

interface DataTypeProps<T = unknown> {
  schema: ZodStandardJSONSchemaPayload<T>
}

const props = defineProps<DataTypeProps>()

const getTypeName = (schema: Record<string, unknown>): string => {
  if (!schema) return 'unknown'

  if (schema.$ref && typeof schema.$ref === 'string') {
    const ref = schema.$ref
    const parts = ref.split('/')
    const name = parts[parts.length - 1]

    return name || 'any'
  }

  if (schema.type === 'array' && schema.items) {
    return `Array<${getTypeName(schema.items as Record<string, unknown>)}>`
  }

  return (schema.id as string) || (schema.type as string) || 'any'
}

const dataType = computed(() => getTypeName(props.schema as Record<string, unknown>))
</script>

<template>
  <UBadge size="sm" variant="soft">
    {{ dataType }}
  </UBadge>
</template>

<style scoped>

</style>
