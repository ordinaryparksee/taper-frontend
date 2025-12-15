<script setup lang="tsx">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import { UAvatar, UBadge, UButton, UDropdownMenu } from '#components'
import { filesize } from 'filesize'

const props = defineProps<{
  knowledgeCode: string
}>()

const toast = useToast()
const { $api } = useNuxtApp()

const {
  data,
  refresh,
  page,
  limit,
  total,
  items,
  startWatch,
  stopWatch,
  mapStatus,
  getStatusVariant,
  getStatusColor,
  watcherId
} = useKnowledgeFiles(props.knowledgeCode)

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

onMounted(() => {
  if (data.value) {
    startWatch()
  }
})

watch(data, (newData) => {
  if (newData && !watcherId.value) {
    startWatch()
  }
}, { immediate: true })

onUnmounted(() => {
  stopWatch()
})

defineExpose({
  refresh: async () => {
    await refresh()
    startWatch()
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <UTable
      v-if="items.length > 0"
      :columns="fileColumns"
      :data="items"
    />

    <div v-if="total > limit" class="flex justify-center border-t border-gray-200 dark:border-gray-800 pt-4">
      <UPagination
        v-model:page="page"
        :total="total"
        :page-count="limit"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
