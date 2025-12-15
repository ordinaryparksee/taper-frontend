<script setup lang="tsx">
import { UButton } from '#components'

const { $api } = useNuxtApp()

const props = defineProps<{
  projectCode: string
  knowledgeCode: string
}>()

const fileIds = ref([])
const fileList = ref()
const fileManager = ref()

async function onConfirmUpload() {
  if (fileIds.value) {
    await $api(`/knowledges/${props.knowledgeCode}/files`, {
      method: 'POST',
      body: {
        file_ids: fileIds.value
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
    <div class="flex">
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
</template>

<style scoped>

</style>
