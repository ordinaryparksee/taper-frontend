<script setup lang="tsx">
import { UButton } from '#components'

const { $api } = useNuxtApp()

const props = defineProps<{
  projectCode: string
  knowledgeCode: string
}>()

const fileIds = ref([])
const splitMode = ref<KnowledgeSplitMode>(null)
const fileList = ref()
const fileManager = ref()

const { data: knowledge } = useApi<Knowledge>(`/knowledges/${props.knowledgeCode}`)

watch(() => knowledge.value?.split_mode, (val) => {
  if (val !== undefined) {
    splitMode.value = val
  }
}, { immediate: true })

const splitModeOptions = [
  { label: 'No split', value: null },
  { label: 'Context base', value: 'CONTEXT_BASE' },
  { label: 'Page base', value: 'PAGE_BASE' }
]

async function onConfirmUpload() {
  if (fileIds.value) {
    await $api(`/knowledges/${props.knowledgeCode}/files`, {
      method: 'POST',
      body: {
        file_ids: fileIds.value,
        split_mode: splitMode.value
      }
    })
    fileManager.value.clear()
    await fileList.value.refresh()
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div
      class="flex-1"
    >
      <KnowledgeFileList
        ref="fileList"
        :knowledge-code="props.knowledgeCode"
      />
    </div>
    <div class="flex mb-4">
      <div class="flex-1">
        Upload
      </div>
      <div>
        <UButton
          icon="i-lucide-upload"
          variant="ghost"
          :disabled="fileIds.length < 1"
          @click="onConfirmUpload"
        >
          Confirm
        </UButton>
      </div>
    </div>
    <div class="space-y-4">
      <UFormField
        name="split_mode"
        label="Split mode"
        orientation="horizontal"
        required
        class="space-y-2"
        :ui="{
          container: 'text-right'
        }"
      >
        <template #hint>
          <UPopover mode="hover">
            <UIcon name="i-carbon-help" />
            <template #content>
              <div class="p-2 space-y-2 text-xs">
                <div class="mb-2 text-gray-500">
                  Select how the text should be split before chunking.
                </div>
                <div class="flex gap-1">
                  <strong>No split</strong>
                  <span>The text is not split.</span>
                </div>
                <div class="flex gap-1">
                  <strong>Context base:</strong>
                  <span>The text is split into contextual pieces.</span>
                </div>
                <div class="flex gap-1">
                  <strong>Page base:</strong>
                  <span>The text is split into page‑level pieces.</span>
                </div>
              </div>
            </template>
          </UPopover>
        </template>
        <USelect
          v-model="splitMode"
          :items="splitModeOptions"
          size="sm"
          class="w-32"
        />
      </UFormField>
      <UFormField
        name="file"
        label="File"
        description="File for knowledge base"
        required
        class="space-y-2"
        :ui="{
          container: 'w-full'
        }"
      >
        <FileManager
          ref="fileManager"
          v-model="fileIds"
          :namespace="`${props.projectCode}/knowledge/${props.knowledgeCode}`"
          multiple
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>

<style scoped>

</style>
