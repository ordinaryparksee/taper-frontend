import type { Credential } from '#shared/types'
import type { FetchError } from 'ofetch'

export function useCredentials(projectCode?: MaybeRefOrGetter<string | null | undefined>) {
  const { $api } = useNuxtApp()
  const toast = useToast()

  // pagination & search state
  const queryInput = ref('')
  const page = ref(1)
  const limit = ref(10)
  const query = ref('')
  const params = computed(() => ({ page: page.value, limit: limit.value, query: query.value }))

  const { data, status, refresh } = useApi<PaginatedList<Credential>>('/credentials', {
    query: computed(() => ({
      ...params.value,
      project_code: toValue(projectCode)
    }))
  })

  const total = computed(() => data.value?.total || 0)
  const items = computed(() => data.value?.items || [])
  const offset = computed(() => (page.value - 1) * limit.value)

  async function search() {
    query.value = queryInput.value
    page.value = 1
    await refresh()
  }

  async function remove(code: string) {
    if (!confirm('Are you sure you want to delete this credential?')) return
    try {
      await $api(`/credentials/${code}`, { method: 'DELETE' })
      await refresh()
      toast.add({
        title: 'Credential deleted',
        description: 'The credential has been deleted.'
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
