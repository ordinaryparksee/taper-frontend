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

const model = defineModel<string[] | string | null>({})

const app = useAppConfig()
const { items } = useCredentials(computed(() => props.projectCode))

const selectItems = computed(() => {
  const credentials = items.value.map((item) => {
    return {
      label: item.name,
      value: item.code,
      icon: 'i-lucide-key'
    }
  })

  return [
    { label: 'Default', value: null, icon: app.ui.icons.apiKeyCredential },
    ...credentials
  ]
})
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="selectItems"
    :size="props.size"
    :multiple="props.multiple"
    :icon="app.ui.icons.apiKeyCredential"
    :variant="(props.variant as any)"
    value-key="value"
    placeholder="Default"
    class="min-w-30 hover:bg-default focus:bg-default data-[state=open]:bg-default"
    :ui="{
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
