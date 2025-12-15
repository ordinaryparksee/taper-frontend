<script setup lang="tsx">
import type { TableColumn } from '@nuxt/ui'
import { UAvatar, UButton, UProgress, UIcon } from '#components'
import { filesize } from 'filesize'
import * as tus from 'tus-js-client'
import { useSortable } from '@vueuse/integrations/useSortable'

interface FileRow {
  id: string
  file: File
  bytesUploaded: number
  bytesTotal: number
}

const props = defineProps<{
  multiple?: boolean
  endpoint?: string
  chunkSize?: number
  namespace?: string
  sortable?: boolean
}>()
const emits = defineEmits<{
  progress: [fileId: string, bytesUploaded: number, bytesTotal: number]
  uploaded: [fileId: string, payload: tus.OnSuccessPayload]
  deleted: [fileId: string]
  failed: [error: Error, fileId?: string | null]
  canceled: [fileId?: string | null]
}>()

const { $api } = useNuxtApp()
const model = defineModel<string | string[] | null>()
const input = ref()
const data = ref<FileRow[]>([])

const columns: TableColumn<FileRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      return (
        <div class="flex items-center gap-3 w-full">
          {props.sortable && <UIcon name="i-lucide-chevrons-up-down" class="file-sort-handle cursor-move" />}
          <div>
            {
              row.original.file.type.startsWith('image/')
                ? <UAvatar icon="i-lucide-image" size="lg" />
                : row.original.file.type.startsWith('video/')
                  ? <UAvatar icon="i-lucide-video" size="lg" />
                  : <UAvatar icon="i-lucide-file-text" size="lg" />
            }
          </div>
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <div class="truncate" title={row.original.file.name}>{row.original.file.name}</div>
            <UProgress model-value={uploadedRatio(row.original) * 100} size="xs" />
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
    cell: ({ row }) => (
      <div class="flex gap-1 items-center">
        <span>{filesize(row.original.file.size)}</span>
        <span class="text-xs">
          (
          {uploadedPercent(row.original)}
          )
        </span>
      </div>
    )
  },
  {
    accessorKey: 'delete',
    header: 'Delete',
    cell: ({ row }) => (
      <UButton
        icon="i-lucide-circle-x"
        variant="ghost"
        color="error"
        onClick={() => handleDelete(row.original)}
      />
    ),
    meta: {
      class: {
        td: 'text-center'
      }
    }
  }
]

function clear() {
  data.value = []
  input.value = null
  syncModelValue()
}

function uploadedRatio(file: FileRow) {
  return file.bytesUploaded / file.bytesTotal
}

function uploadedPercent(file: FileRow) {
  return `${Math.round(uploadedRatio(file) * 10000) / 100}%`
}

function syncModelValue() {
  if (props.multiple) {
    model.value = data.value.map(record => record.id)
  } else {
    model.value = data.value.at(0)?.id
  }
}

async function generateFileContentHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function upload(file: File, options: tus.UploadOptions = {}): Promise<FileRow> {
  const contentHash = await generateFileContentHash(file)
  let fileId: string | null | undefined = null

  options.metadata = {
    namespace: props.namespace || 'default',
    filename: file.name,
    filetype: file.type,
    fingerprint: btoa(contentHash),
    ...options.metadata
  }

  return new Promise<FileRow>((resolve, reject) => {
    const uploader = new tus.Upload(file, {
      endpoint: props.endpoint || 'http://localhost:8080/api/v1/tus/upload',
      chunkSize: props.chunkSize || 5 * 1024 * 1024,
      removeFingerprintOnSuccess: false,
      storeFingerprintForResuming: false,
      onShouldRetry() {
        return false
      },
      onUploadUrlAvailable() {
        if (uploader.url) {
          fileId = new URL(uploader.url).pathname.split('/').filter(Boolean).pop()
        }
      },
      onProgress(uploaded, total) {
        if (fileId) {
          const record = data.value.find(record => record.id === fileId)
          if (record) {
            record.bytesUploaded = uploaded
            record.bytesTotal = total
          } else {
            data.value.push({
              id: fileId,
              file,
              bytesUploaded: uploaded,
              bytesTotal: total
            })
          }
          emits('progress', fileId, uploaded, total)
        }
      },
      onSuccess(payload) {
        if (fileId) {
          resolve({
            id: fileId,
            file,
            bytesUploaded: file.size,
            bytesTotal: file.size
          })
          emits('uploaded', fileId, payload)
        }
      },
      onError(error) {
        reject(error)
        emits('failed', error, fileId)
      },
      ...options
    })
    uploader.start()
  })
}

async function handleModelValueChange(file?: File | File[] | null) {
  if (!props.multiple) data.value = []

  if (Array.isArray(file)) {
    await Promise.all(file.map(_file => upload(_file)))
  } else {
    if (file) {
      await upload(file)
    }
  }

  syncModelValue()

  input.value = null
}

async function handleDelete(item: FileRow) {
  if (!confirm('Are you sure you want to delete this file?')) return

  const index = data.value.findIndex(record => record.id == item.id)
  if (index > -1) {
    await $api(`/files/${data.value[index]!.id}`, {
      method: 'DELETE'
    })
    data.value.splice(index, 1)
    emits('deleted', item.id)
  }

  syncModelValue()
}

syncModelValue()

useSortable('.file-table-tbody', data, {
  // enable drag only when sortable is true
  disabled: !props.sortable,
  // for table bodies, explicitly set row selector
  draggable: 'tr',
  handle: props.sortable ? '.file-sort-handle' : undefined,
  animation: 150,
  onUpdate(evt) {
    // Reflect new order to the underlying data array
    // SortableJS provides oldIndex/newIndex relative to the container
    if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number' && evt.oldIndex !== evt.newIndex) {
      const moved = data.value.splice(evt.oldIndex, 1)[0]
      if (moved) data.value.splice(evt.newIndex, 0, moved)
    }

    if (props.multiple) {
      model.value = data.value.map(record => record.id)
    } else {
      model.value = data.value.at(0)?.id ?? null
    }
  }
})

defineExpose({
  clear
})
</script>

<template>
  <div>
    <UFileUpload
      :model-value="input"
      :file-delete="false"
      :multiple="props.multiple"
      @update:model-value="handleModelValueChange($event)"
    />
    <UTable
      v-if="data.length > 0"
      :data="data"
      :columns="columns"
      :ui="{
        tbody: 'file-table-tbody'
      }"
    />
  </div>
</template>

<style scoped>

</style>
