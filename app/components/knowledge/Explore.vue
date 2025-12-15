<script setup lang="tsx">
import type { TableColumn } from '@nuxt/ui'
import { UButton, TruncateCell } from '#components'

const props = defineProps<{
  knowledge: Knowledge
}>()

const queryInput = ref('')
const query = ref('')
const page = ref(1)
const limit = ref(10)
const topK = ref(5)
const loading = ref(false)
const expanded = ref()
const params = computed(() => ({
  query: query.value,
  top_k: topK.value,
  page: page.value,
  limit: limit.value
}))

const { data, refresh } = useApi<PaginatedList<KnowledgeRetrievedItem>>(`/knowledges/${props.knowledge.code}/explore`, {
  query: params
})

async function onSearch(newPage = 1) {
  if (!queryInput.value.trim()) return
  query.value = queryInput.value.trim()
  page.value = newPage
  loading.value = true
  try {
    await refresh()
  } catch (error) {
    console.error('Search failed', error)
  } finally {
    loading.value = false
  }
}

const columns: TableColumn<KnowledgeRetrievedItem>[] = [
  {
    id: 'expand',
    cell: ({ row }) => (
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-down"
        square
        aria-label="Expand"
        ui={{
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : ''
          ]
        }}
        onClick={() => row.toggleExpanded()}
      />
    )
  },
  {
    accessorKey: 'chunk_number',
    header: 'Chunk Number'
  },
  {
    accessorKey: 'chunk_content',
    header: 'Chunk Content',
    cell: ({ row }) => (
      <TruncateCell>{row.original.chunk_content}</TruncateCell>
    ),
    meta: {
      class: {
        th: 'w-full'
      }
    }
  },
  {
    accessorKey: 'embedding_model',
    header: 'Embedding Model'
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => row.original.score?.toFixed(4)
  }
]
</script>

<template>
  <div class="flex flex-col gap-4 h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div v-if="data?.items.length > 0">
        <UTable
          v-model:expanded="expanded"
          :data="data.items"
          :columns="columns"
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
        >
          <template #expanded="{ row }">
            <pre>{{ row.original.chunk_content }}</pre>
          </template>
        </UTable>
      </div>

      <div v-else-if="!loading" class="text-center py-10 text-neutral-500">
        No results found.
      </div>

      <div v-if="data?.total > limit" class="flex justify-center border-t pt-4 mt-4">
        <UPagination
          v-model:page="page"
          :total="data.total"
          :page-count="limit"
          @update:page="onSearch"
        />
      </div>
    </div>

    <div class="pt-2">
      <UChatPrompt
        v-model="queryInput"
        variant="soft"
        placeholder="Enter search query..."
        :loading="loading"
        class="sticky bottom-5 [view-transition-name:chat-prompt] shadow-xs max-w-4xl mx-auto"
        @submit="async () => await onSearch()"
      >
        <template #footer>
          <div class="flex items-center gap-2">
            <UPopover
              arrow
              :content="{ side: 'top' }"
            >
              <UButton
                icon="i-lucide-settings"
                variant="ghost"
                color="neutral"
              />
              <template #content>
                <div class="flex flex-col gap-4 p-4">
                  <UFormField label="Top K" size="sm">
                    <div class="flex items-center gap-4 w-48">
                      <USlider
                        v-model="topK"
                        :min="1"
                        :max="20"
                        :step="1"
                        size="sm"
                      />
                      <span class="text-xs font-mono w-8 text-right">{{ topK }}</span>
                    </div>
                  </UFormField>
                  <UFormField label="Limit" size="sm">
                    <UInput
                      v-model.number="limit"
                      type="number"
                      placeholder="Default 10"
                    />
                  </UFormField>
                </div>
              </template>
            </UPopover>
          </div>
          <div class="flex justify-end w-full">
            <UChatPromptSubmit
              :status="loading ? 'submitted' : 'ready'"
              color="neutral"
              class="rounded-full"
            />
          </div>
        </template>
      </UChatPrompt>
    </div>
  </div>
</template>
