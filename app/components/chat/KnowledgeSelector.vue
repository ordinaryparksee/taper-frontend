<script setup lang="ts">
const props = withDefaults(defineProps<{
  multiple?: boolean
  projectCode?: string | null
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: string
}>(), {
  modelValue: null,
  multiple: false,
  disabled: false,
  size: 'sm',
  variant: 'ghost'
})

const model = defineModel<string[] | string>({})

const app = useAppConfig()
const { items } = useKnowledges(computed(() => props.projectCode))

const selectItems = computed(() => {
  const knowledges = items.value.map((item) => {
    return {
      label: item.name,
      value: item.code,
      icon: app.ui.icons.knowledge
    }
  })

  return [
    ...knowledges
  ]
})
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="selectItems"
    :size="props.size"
    :multiple="props.multiple"
    :icon="app.ui.icons.knowledge"
    :variant="(props.variant as any)"
    value-key="value"
    placeholder="None"
    class="min-w-30 hover:bg-default focus:bg-default data-[state=open]:bg-default"
    :ui="{
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
