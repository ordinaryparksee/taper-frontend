<script setup lang="ts">
import type { SelectMenuItem } from '#ui/types'

const { model, models, formatModelName, detectIcon, detectAvatar } = useModels('chat')

const items = computed(() => models.value?.map((_model) => {
  return {
    label: formatModelName(_model),
    value: _model,
    icon: detectIcon(_model),
    avatar: detectAvatar(_model)
  } as SelectMenuItem
}))
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    size="sm"
    :icon="detectIcon(model)"
    :avatar="detectAvatar(model)"
    variant="ghost"
    value-key="value"
    class="min-w-30 hover:bg-default focus:bg-default data-[state=open]:bg-default"
    :ui="{
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
