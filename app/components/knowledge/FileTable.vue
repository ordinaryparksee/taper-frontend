<script setup lang="tsx">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Color, Variant } from '~/types'
import type { PaginatedList, KnowledgeFile, KnowledgeFileStatus } from '#shared/types'
import type { Row } from '@tanstack/table-core'
import { UAvatar, UBadge, UButton, UDropdownMenu } from '#components'
import { filesize } from 'filesize'

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

function getRowItems(row: Row<KnowledgeFile>): DropdownMenuItem[] {
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
            file_ids: [row.original.file_id]
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
            file_ids: [row.original.file_id]
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

const fileColumns: TableColumn<KnowledgeFile>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      return (
        <div class="flex items-center gap-3 w-full">
          <div>
            {
              row.original.file_type.startsWith('image/')
                ? <UAvatar icon="i-lucide-image" size="lg" />
                : row.original.file_type.startsWith('video/')
                  ? <UAvatar icon="i-lucide-video" size="lg" />
                  : <UAvatar icon="i-lucide-file-text" size="lg" />
            }
          </div>
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <div class="truncate" title={row.original.file_name}>{row.original.file_name}</div>
          </div>
        </div>
      )
    },
    meta: {
      class: {
        th: 'w-full'
      }
    }
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ row }) => filesize(row.original.file_size)
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <UBadge
        variant={getStatusVariant(row.original.status)}
        color={getStatusColor(row.original.status)}
      >
        {mapStatus(row.original.status)}
      </UBadge>
    )
  },
  {
    id: 'menu',
    cell: ({ row }) => (
      <div class="text-right px-1" onClick={(e: MouseEvent) => e.stopPropagation()}>
        <UDropdownMenu items={getRowItems(row as unknown as Row<KnowledgeFile>)} content={{ align: 'end' }}>
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" class="ml-auto" size="xs" />
        </UDropdownMenu>
      </div>
    ),
    meta: {
      class: {
        th: 'w-0',
        td: 'whitespace-nowrap'
      }
    }
  }
]

defineExpose({
  refresh
})

onMounted(() => {
  startWatch()
})

onUnmounted(() => {
  stopWatch()
})
</script>

<template>
  <UTable
    v-if="data && data.items.length > 0"
    :columns="fileColumns"
    :data="data.items"
  />
</template>

<style scoped>

</style>
