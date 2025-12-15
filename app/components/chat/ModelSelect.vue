<script setup lang="ts">
const { model, models, formatModelName } = useModels('chat')

const items = computed(() => models.value?.map((_model) => {
  return {
    label: formatModelName(_model),
    value: _model,
    icon: `i-simple-icons-${detectIcon(_model)}`
  }
}))

function detectIcon(_model: string) {
  const segments = _model.split('/')
  if (segments[0] === 'openrouter') {
    return segments[1]
  } else {
    return segments[0]
  }
}
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    size="sm"
    :icon="`i-simple-icons-${detectIcon(model)}`"
    variant="ghost"
    value-key="value"
    class="min-w-30 hover:bg-default focus:bg-default data-[state=open]:bg-default"
    :ui="{
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
