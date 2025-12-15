<script setup lang="ts">
import { FILE_UPLOAD_CONFIG, MODALITY_MIME_TYPES } from '#shared/utils/file'

const props = defineProps<{
  modalities: string[]
}>()

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const { loggedIn } = useUserSession()
const inputId = useId()

const accept = computed(() => {
  if (props.modalities.length === 0) return FILE_UPLOAD_CONFIG.acceptPattern

  const mimes = props.modalities.flatMap(m => MODALITY_MIME_TYPES[m] || [])
  return mimes.length > 0 ? mimes.join(',') : FILE_UPLOAD_CONFIG.acceptPattern
})

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])

  if (files.length > 0) {
    emit('filesSelected', files)
  }

  input.value = ''
}
</script>

<template>
  <UTooltip
    :content="{
      side: 'top'
    }"
    :text="!loggedIn ? 'You need to be logged in to upload files' : ''"
  >
    <label :for="inputId" :class="{ 'cursor-not-allowed opacity-50': !loggedIn }">
      <UButton
        icon="i-lucide-paperclip"
        variant="ghost"
        color="neutral"
        size="sm"
        as="span"
        :disabled="!loggedIn"
      />
    </label>
    <input
      :id="inputId"
      type="file"
      multiple
      :accept="accept"
      class="hidden"
      :disabled="!loggedIn"
      @change="handleFileSelect"
    >
  </UTooltip>
</template>
