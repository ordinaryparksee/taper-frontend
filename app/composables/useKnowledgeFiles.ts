import type { Color, Variant } from '~/types'

export function useKnowledgeFiles(knowledgeCode: string) {
  const hasInProgressFiles = ref(false)
  const watcherId = ref<number>()
  const page = ref(1)
  const limit = ref(10)

  const { data, refresh } = useApi<PaginatedList<KnowledgeFile>>(`/knowledges/${knowledgeCode}/files`, {
    query: {
      page,
      limit
    }
  })

  const total = computed(() => data.value?.total || 0)
  const items = computed(() => data.value?.items || [])

  function checkInProgress() {
    const items = data.value?.items || []
    hasInProgressFiles.value = items.some(f => !['COMPLETED', 'FAILED', 'CHUNKING_FAILED', 'EMBEDDING_FAILED'].includes(f.status))
  }

  function startWatch() {
    checkInProgress()
    if (hasInProgressFiles.value && !watcherId.value) {
      watcherId.value = window.setInterval(async () => {
        await refresh()
        checkInProgress()
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

  return {
    data,
    refresh,
    page,
    limit,
    total,
    items,
    hasInProgressFiles,
    startWatch,
    stopWatch,
    mapStatus,
    getStatusVariant,
    getStatusColor,
    checkInProgress,
    watcherId
  }
}
