<script setup lang="tsx">
import type { DropdownMenuItem } from '@nuxt/ui'
import { UAvatar, UBadge, UButton, UDropdownMenu, UCard } from '#components'
import { filesize } from 'filesize'
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  knowledgeCode: string
}>()

const toast = useToast()
const { $api } = useNuxtApp()

const {
  data,
  refresh,
  startWatch,
  stopWatch,
  mapStatus,
  getStatusVariant,
  getStatusColor,
  watcherId
} = useKnowledgeFiles(props.knowledgeCode)

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
