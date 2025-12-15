import type { FetchError } from 'ofetch'

interface UseConnectionsOptions {
  projectId?: MaybeRefOrGetter<string | null | undefined>
  drivers?: MaybeRefOrGetter<string[]>
}

export function useConnections(options: UseConnectionsOptions = {}) {
  const { $api } = useNuxtApp()
  const toast = useToast()

  // pagination & search state
  const queryInput = ref('')
  const page = ref(1)
  const limit = ref(10)
  const query = ref('')
  const params = computed(() => ({
    page: page.value,
    limit: limit.value,
    query: query.value,
    driver: toValue(options.drivers)
  }))

  const { data, status, refresh } = useApi<PaginatedResponse<ConnectionSchema>>('/connections', {
    query: computed(() => ({
      ...params.value,
      project_id: toValue(options.projectId)
    }))
  })

  const total = computed(() => data.value?.meta.total || 0)
  const items = computed(() => data.value?.data || [])
  const offset = computed(() => (page.value - 1) * limit.value)

  async function search() {
    query.value = queryInput.value
    page.value = 1
    await refresh()
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to delete this connection?')) return
    try {
      await $api(`/connections/${id}`, { method: 'DELETE' })
      await refresh()
      toast.add({
        title: 'Connection deleted',
        description: 'The connection has been deleted.'
      })
    } catch (error) {
      toast.add({
        color: 'error',
        title: 'Failed to delete',
        description: (error as FetchError).data?.detail
      })
    }
  }

  return {
    queryInput,
    page,
    limit,
    query,
    data,
    items,
    status,
    total,
    offset,
    refresh,
    search,
    remove
  }
}
