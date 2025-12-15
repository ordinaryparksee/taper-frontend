<script setup lang="ts">
import type { Knowledge } from '#shared/types'

const props = withDefaults(defineProps<{
  multiple?: boolean
  projectCode?: string | null
  buttonLabel?: string
  disabled?: boolean
}>(), {
  modelValue: null,
  multiple: false,
  buttonLabel: 'Select knowledge',
  disabled: false
})

const model = defineModel<string[] | string | null>({})
const selected = ref<string[]>(Array.isArray(model.value) ? model.value : model.value ? [model.value] : [])
const inputValue = computed(() => {
  if (Array.isArray(model.value)) {
    return model.value
  } else {
    return model.value ? [model.value] : null
  }
})

if (props.multiple) {
  model.value = []
}

const isOpen = ref(false)
const selectedItems = ref<Knowledge[] | null>(null)

function open() {
  if (props.disabled) return
  isOpen.value = true
  selectedItems.value = null
}

function updateValue(payload: string[]) {
  selected.value = payload
  if (Array.isArray(model.value)) {
    model.value = selected.value
  } else {
    model.value = selected.value[0] || null
  }
}

function confirm() {
  if (Array.isArray(model.value)) {
    model.value = selected.value
  } else {
    model.value = selected.value[0] || null
  }
  isOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-3">
    <UButton
      color="primary"
      icon="i-lucide-list-checks"
      :disabled="props.disabled"
      @click="open"
    >
      {{ props.buttonLabel }}
    </UButton>

    <div class="flex flex-wrap gap-2">
      <UInputTags
        v-if="inputValue && inputValue.length > 0"
        :model-value="inputValue"
        variant="soft"
        icon="i-lucide-book"
        readonly
        @update:model-value="updateValue($event)"
      />
    </div>

    <UModal
      v-model:open="isOpen"
      title="Knowledges"
      :ui="{
        footer: 'justify-end'
      }"
      @update:open="(state) => {
        if (!state) {
          selected = inputValue || []
        }
      }"
    >
      <template #body>
        <div class="flex-1 overflow-auto">
          <KnowledgeList
            :selected="selected"
            :selectable="true"
            :multiple="props.multiple"
            :project-code="props.projectCode"
            @update:selected="(value) => {
              selected = value
              if (!props.multiple) confirm()
            }"
          />
        </div>
      </template>
      <template v-if="props.multiple" #footer>
        <UButton label="Confirm" @click="confirm" />
      </template>
    </UModal>
  </div>
</template>
