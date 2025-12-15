<script setup lang="ts">
const config = useRuntimeConfig()
const model = defineModel<string | null>({})
const file = defineModel<File | null>('file')
const props = defineProps<{
  endpoint?: string
  chunkSize?: number
  namespace?: string
  beforeCancel?: (fileId?: string | null) => void | Promise<void>
}>()
const emits = defineEmits<{
  progress: [bytesUploaded: number, bytesTotal: number]
  uploaded: [fileId?: string | null]
  beforeCancel: [fileId?: string | null]
  canceled: [fileId?: string | null]
}>()

// useTus 컴포저블을 초기화하고 진행률을 상위로 전달
const tusUploader = useTus({
  endpoint: props.endpoint || `${config.public.apiBase}/tus/upload`,
  metadata: {
    namespace: props.namespace || 'default'
  },
  chunkSize: props.chunkSize || 5 * 1024 * 1024,
  onProgress(uploaded, total) {
    emits('progress', uploaded, total)
  },
  onSuccess() {
    emits('uploaded', uploadId.value)
  }
})

const uploadId = computed(() => model.value ?? tusUploader.uploadId.value ?? null)

watch(tusUploader.uploadId, (id) => {
  model.value = id ?? null
})

async function handleModelValueChange(value?: File | null) {
  if (value) {
    await tusUploader.upload(value)
  } else if (file.value) {
    const lastUploadId = uploadId.value
    try {
      await props.beforeCancel?.(lastUploadId)
      emits('beforeCancel', lastUploadId)
      // Capture the last known upload id before resetting
      await tusUploader.terminate(file.value)
      tusUploader.reset()
      emits('canceled', lastUploadId)
    } catch (error) {
      console.error(error)
    }
  }

  // Clear model when file is cleared; uploadId will be set via watcher when available
  if (!value) model.value = null
  file.value = value || null
}
</script>

<template>
  <UFileUpload
    :model-value="file"
    @update:model-value="handleModelValueChange($event)"
  />
</template>

<style scoped>

</style>
