<script setup lang="tsx">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Color, Variant } from '~/types'
import type { PaginatedList, KnowledgeFile, KnowledgeFileStatus } from '#shared/types'
import { UAvatar, UBadge, UButton, UDropdownMenu, UCard } from '#components'
import { filesize } from 'filesize'
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  knowledgeCode: string
}>()

const toast = useToast()
const { $api } = useNuxtApp()

const { data, refresh } = useApi<PaginatedList<KnowledgeFile>>(`/knowledges/${props.knowledgeCode}/files`)

const hasInProgressFiles = computed(() => {
  const items = data.value?.items || []
  return items.some(f => f.status !== 'COMPLETED' && f.status !== 'FAILED')
})
const watcherId = ref<number>()

function startWatch() {
  if (hasInProgressFiles.value) {
    watcherId.value = window.setInterval(async () => {
      await refresh()
      if (!hasInProgressFiles.value) {
        stopWatch()
      }
    }, 3000)
  }
}

function stopWatch() {
  if (watcherId.value) {
    clearInterval(watcherId.value)
    watcherId.value = undefined
  }
}

function mapStatus(status: KnowledgeFileStatus) {
  if (status === 'SCHEDULED') {
    return 'Scheduled'
  } else if (status === 'STARTED') {
    return 'Started'
  } else if (status === 'LOADING') {
    return 'File loading'
  } else if (status === 'CHUNKING') {
    return 'Chunking'
  } else if (status === 'CHUNKING_FAILED') {
    return 'Chunking failed'
  } else if (status === 'EMBEDDING') {
    return 'Embedding'
  } else if (status === 'EMBEDDING_FAILED') {
    return 'Embedding failed'
  } else if (status === 'COMPLETED') {
    return 'Completed'
  } else if (status === 'FAILED') {
    return 'Failed'
  } else {
    return status
  }
}

function getStatusVariant(status: KnowledgeFileStatus): Variant {
  if (status === 'COMPLETED') return 'soft'
  if (status === 'FAILED' || status === 'CHUNKING_FAILED' || status === 'EMBEDDING_FAILED') return 'soft'
  if (status === 'SCHEDULED') return 'outline'
  if (status === 'STARTED' || status === 'LOADING' || status === 'CHUNKING' || status === 'EMBEDDING') return 'outline'
  return 'outline'
}

function getStatusColor(status: KnowledgeFileStatus): Color {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED' || status === 'CHUNKING_FAILED' || status === 'EMBEDDING_FAILED') return 'error'
  if (status === 'SCHEDULED') return 'neutral'
  if (status === 'STARTED' || status === 'LOADING' || status === 'CHUNKING' || status === 'EMBEDDING') return 'info'
  return 'neutral'
}

function getItemMenu(file: KnowledgeFile): DropdownMenuItem[] {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Reset state',
      icon: 'i-lucide-refresh-ccw',
      async onSelect() {
        if (!confirm('Are you sure you want to reset state?')) return
        await $api(`/knowledges/${props.knowledgeCode}/pipeline/reset`, {
          method: 'POST',
          body: {
            file_ids: [file.file_id]
          }
        })
        await refresh()
        startWatch()
      }
    },
    { type: 'separator' },
    {
      label: 'Delete file',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        if (!confirm('Are you sure you want to delete this file?')) return
        await $api(`/knowledges/${props.knowledgeCode}/files`, {
          method: 'DELETE',
          body: {
            file_ids: [file.file_id]
          }
        })
        await refresh()
        startWatch()
        toast.add({
          title: 'File deleted',
          description: 'The file has been deleted.'
        })
      }
    }
  ]
}

defineExpose({
  refresh: async () => {
    await refresh()
    startWatch()
  }
})

onMounted(() => {
  startWatch()
})

onUnmounted(() => {
  stopWatch()
})
</script>

<template>
  <div v-if="data && data.items.length > 0" class="grid grid-cols-1 gap-4">
    <UCard
      v-for="file in data.items"
      :key="file.file_id"
      :ui="{
        body: 'p-3 sm:p-3'
      }"
    >
      <div class="flex items-start gap-3 w-full">
        <div>
          <UAvatar
            v-if="file.file_type.startsWith('image/')"
            icon="i-lucide-image"
            size="lg"
          />
          <UAvatar
            v-else-if="file.file_type.startsWith('video/')"
            icon="i-lucide-video"
            size="lg"
          />
          <UAvatar
            v-else
            icon="i-lucide-file-text"
            size="lg"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div
            class="truncate font-medium"
            :title="file.file_name"
          >
            {{ file.file_name }}
          </div>
          <div class="text-sm text-neutral-500">
            {{ filesize(file.file_size) }}
          </div>
        </div>
        <div class="ml-auto -mr-1" @click.stop>
          <UDropdownMenu
            :items="getItemMenu(file)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="xs"
            />
          </UDropdownMenu>
        </div>
      </div>
      <div class="flex justify-between mt-3">
        <div />
        <div>
          <UBadge
            :variant="getStatusVariant(file.status)"
            :color="getStatusColor(file.status)"
          >
            {{ mapStatus(file.status) }}
          </UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>

</style>
