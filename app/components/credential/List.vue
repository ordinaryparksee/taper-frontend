<script setup lang="tsx">
import type { Credential } from '#shared/types'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { UAvatar, UButton, UCheckbox, UDropdownMenu } from '#components'
import type { FetchError } from 'ofetch'

const props = withDefaults(defineProps<{
  selectable?: boolean
  multiple?: boolean
  control?: boolean
  projectCode?: string | null
}>(), {
  selectable: false,
  multiple: false,
  control: false,
  modelValue: null,
  projectCode: null
})

const app = useAppConfig()
const model = defineModel<string[] | string | null>({})
const selected = defineModel<string[]>('selected', { default: [] })

const { $api } = useNuxtApp()
const dayjs = useDayjs()
const toast = useToast()
const { project } = useProject()

// pagination & search state
const queryInput = defineModel<string>('query', { default: '' })
const page = ref(1)
const limit = ref(10)
const query = ref(queryInput.value)
const params = computed(() => ({ page, limit, query }))
const limitItems = ref([5, 10, 20])

const { data, status, refresh } = await useApi<PaginatedList<Credential>>('/credentials', {
  query: {
    ...params.value,
    project_code: computed(() => props.projectCode || project.value?.code)
  }
})
const total = computed(() => data.value?.total || 0)
const offset = computed(() => (page.value - 1) * limit.value)

async function search() {
  query.value = queryInput.value
  page.value = 1
  await refresh()
}

function isSelected(code: string) {
  return selected.value.includes(code)
}

function toggle(code: string) {
  if (isSelected(code)) {
    selected.value = selected.value.filter(c => c !== code)
  } else {
    selected.value = props.multiple ? [...selected.value, code] : [code]
  }
}

function getRowItems(row: Credential): DropdownMenuItem[] {
  return [
    { type: 'label', label: 'Actions' },
    {
      label: 'Copy credential code',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.code.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Credential code copied to clipboard'
        })
      }
    },
    { type: 'separator' },
    { label: 'View details', icon: 'i-lucide-list', to: `/credentials/${row.code}` },
    { type: 'separator' },
    {
      label: 'Delete',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        if (!confirm('Are you sure you want to delete this credential?')) return
        try {
          await $api(`/credentials/${row.code}`, { method: 'DELETE' })
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
    }
  ]
}

function onSelectClick(e: MouseEvent, code: string) {
  e.stopPropagation()
  toggle(code)
  model.value = props.multiple ? selected.value : (selected.value[0] || null)
}

function getRowAttrs(row: Credential) {
  return {
    class: [
      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
      props.selectable && selected.value?.includes(row.code) ? 'bg-gray-50/60 dark:bg-gray-800/60' : ''
    ].join(' '),
    onClick: () => toggle(row.code)
  }
}

const columns = computed<TableColumn<Credential>[]>(() => {
  const cols: TableColumn<Credential>[] = []

  if (props.selectable && props.multiple) {
    cols.push({
      id: 'select',
      header: () => {
        const pageItems = data.value?.items || []
        const pageCodes = pageItems.map(i => i.code)
        const pageSelected = pageCodes.filter(code => selected.value.includes(code))
        const allSelected = pageItems.length > 0 && pageSelected.length === pageItems.length
        const someSelected = pageSelected.length > 0 && !allSelected
        return (
          <UCheckbox
            modelValue={someSelected ? 'indeterminate' : allSelected}
            aria-label="Select all"
            onUpdate:modelValue={(value: boolean | 'indeterminate') => {
              const shouldSelect = !!value
              if (shouldSelect) {
                const merged = new Set([...selected.value, ...pageCodes])
                selected.value = Array.from(merged)
              } else {
                selected.value = selected.value.filter(code => !pageCodes.includes(code))
              }
              model.value = selected.value
            }}
          />
        )
      },
      cell: ({ row }) => {
        const code = row.original.code
        const checked = isSelected(code)
        return (
          <UCheckbox
            modelValue={checked}
            aria-label="Select row"
            onUpdate:modelValue={(value: boolean | 'indeterminate') => {
              if (value) {
                if (!checked) selected.value = [...selected.value, code]
              } else {
                selected.value = selected.value.filter(c => c !== code)
              }
              model.value = selected.value
            }}
          />
        )
      },
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
    })
  }

  cols.push(
    {
      accessorKey: 'index',
      header: '#',
      cell: ({ row }) => (
        <div class="flex items-center gap-3">
          <div>
            <p class="font-medium text-highlighted">{total.value - (row.index + offset.value)}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div class="flex items-center gap-3">
          {
            row.original.type === 'BASIC_AUTH'
              ? <UAvatar size="md" class="rounded-md" icon="i-lucide-user" />
              : row.original.type === 'SSH'
                ? <UAvatar size="md" class="rounded-md" icon="i-lucide-terminal" />
                : row.original.type === 'HTTP_HEADER'
                  ? <UAvatar size="md" class="rounded-md" icon="i-lucide-braces" />
                  : <UAvatar size="md" class="rounded-md" icon="i-lucide-key-round" />
          }
          <div>
            <p class="font-medium text-highlighted">{row.original.name}</p>
            <div class="flex items-center gap-2 text-sm text-muted">
              <span class="font-mono">{row.original.code}</span>
            </div>
          </div>
        </div>
      ),
      meta: {
        class: {
          th: 'w-full'
        }
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <div class="text-sm text-muted">{dayjs(row.original.created_at).fromNow()}</div>
      )
    }
  )

  if (props.selectable && !props.multiple) {
    cols.push({
      id: 'actions',
      header: () => {},
      cell: ({ row }) => {
        const code = row.original.code
        const _isSelected = isSelected(code)
        return (
          <div class="text-right px-1">
            <UButton
              size="xs"
              color={_isSelected ? 'primary' : 'neutral'}
              variant={_isSelected ? 'solid' : 'outline'}
              onClick={(e: MouseEvent) => onSelectClick(e, code)}
            >
              {_isSelected ? 'Selected' : 'Select'}
            </UButton>
          </div>
        )
      },
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
    })
  }

  if (props.control) {
    cols.push({
      id: 'control',
      header: () => {},
      cell: ({ row }) => (
        <div class="text-right px-1">
          <UDropdownMenu items={getRowItems(row.original)}>
            <UButton size="xs" icon="i-lucide-ellipsis" color="neutral" variant="ghost" />
          </UDropdownMenu>
        </div>
      ),
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
    })
  }

  return cols
})
</script>

<template>
  <UEmpty
    v-if="!data || data?.total < 1"
    title="No credentials found"
    description="Create credentials to store and reuse secrets securely."
    :icon="app.ui.icons.credential"
    variant="naked"
    :actions="[
      { icon: app.ui.icons.plus, label: 'Create new', to: '/credentials/@new' },
      { icon: app.ui.icons.reload, label: 'Refresh', color: 'neutral', variant: 'subtle', onClick: () => refresh() }
    ]"
  />
  <div v-else class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <UFieldGroup>
        <UInput
          v-model="queryInput"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search credentials..."
          @keydown.enter="search"
        />
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="outline"
          @click="search"
        />
      </UFieldGroup>
      <div>
        <USelect
          :model-value="limit"
          :items="limitItems"
          @update:model-value="async (value) => { limit = value; page = 1; await refresh() }"
        />
      </div>
    </div>

    <UTable
      :loading="status === 'pending'"
      :columns="columns"
      :data="data?.items || []"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
        separator: 'h-0'
      }"
      :row-attributes="getRowAttrs"
    />

    <div class="flex justify-center border-t border-default pt-4 px-4">
      <UPagination
        v-model:page="page"
        :total="data?.total || 0"
        :items-per-page="limit"
        @update:page="async (value) => { page = value; await refresh() }"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
