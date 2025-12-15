<script setup lang="tsx">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { UAvatar, UButton, UCheckbox, UDropdownMenu } from '#components'
import type { FetchError } from 'ofetch'
import type { Row } from '@tanstack/table-core'
import type { PaginatedList, Connection, Project } from '#shared/types'

const props = withDefaults(defineProps<{
  selectable?: boolean
  multiple?: boolean
  control?: boolean
  projectCode?: string | null
  drivers?: string[]
}>(), {
  selectable: false,
  multiple: false,
  control: false,
  modelValue: null,
  projectCode: null,
  drivers: () => []
})

const model = defineModel<string[] | string | null>({})
const selected = defineModel<string[]>('selected', {
  default: []
})

const { $api } = useNuxtApp()
const dayjs = useDayjs()
const toast = useToast()
const project = useState<Project>('project')

// pagination & search state
const queryInput = defineModel<string>('query', { default: '' })
const page = ref(1)
const limit = ref(10)
const query = ref(queryInput.value)
const params = computed(() => ({
  page,
  limit,
  query,
  driver: props.drivers
}))
const limitItems = ref([5, 10, 20])

const { data, status, refresh } = await useAPI<PaginatedList<Connection>>('/connections', {
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
  const index = selected.value.indexOf(code)
  return index > -1
}

function toggle(code: string) {
  const index = selected.value.indexOf(code)
  if (index > -1) {
    const newValue = [...selected.value]
    newValue.splice(index, 1)
    selected.value = [...newValue]
  } else {
    if (props.multiple) {
      selected.value = [...selected.value, code]
    } else {
      selected.value = [code]
    }
  }
}

function getRowItems(row: Row<Connection>): DropdownMenuItem[] {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'Copy connection uri',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.code.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Connection uri copied to clipboard'
        })
      }
    },
    { type: 'separator' },
    {
      label: 'View connection details',
      icon: 'i-lucide-list',
      to: `/connections/${row.original.code}`
    },
    { type: 'separator' },
    {
      label: 'Delete connection',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        if (!confirm('Are you sure you want to delete this connection?')) return
        try {
          await $api(`/connections/${row.original.code}`, { method: 'DELETE' })
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
    }
  ]
}

function onSelectClick(e: MouseEvent, code: string) {
  e.stopPropagation()
  toggle(code)
  if (props.multiple) {
    model.value = selected.value
  } else {
    model.value = selected.value[0] || null
  }
}

function getRowAttrs(row: Connection) {
  return {
    class: [
      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
      props.selectable && selected.value?.includes(row.code) ? 'bg-gray-50/60 dark:bg-gray-800/60' : ''
    ].join(' '),
    onClick: () => toggle(row.code)
  }
}

const columns = computed<TableColumn<Connection>[]>(() => {
  const cols: TableColumn<Connection>[] = []

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
        return (
          <UCheckbox
            modelValue={isSelected(code)}
            aria-label="Select row"
            onUpdate:modelValue={(value: boolean | 'indeterminate') => {
              // toggle selection for this row
              if (value) {
                if (!selected.value.includes(code)) selected.value = [...selected.value, code]
              } else {
                selected.value = selected.value.filter(c => c !== code)
              }
              model.value = selected.value
            }}
          />
        )
      },
      meta: {
        class: {
          th: 'w-0',
          td: 'whitespace-nowrap'
        }
      }
    })
  }

  cols.push(
    {
      accessorKey: 'index',
      header: '#',
      cell: ({ row }) => {
        return (
          <div class="flex items-center gap-3">
            <div>
              <p class="font-medium text-highlighted">{total.value - (row.index + offset.value)}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div class="flex items-center gap-2">
          {
            row.original.driver === 'OPENSEARCH'
              ? (
                  <UAvatar
                    src="/icon/opensearch_mark_default.svg"
                    alt="OpenSearch logo"
                    size="sm"
                  />
                )
              : row.original.driver === 'POSTGRESQL'
                ? (
                    <UAvatar
                      src="/icon/postgres_mark_default.png"
                      alt="PostgreSQL logo"
                      size="sm"
                    />
                  )
                : row.original.driver === 'SSH'
                  ? (
                      <UAvatar
                        icon="i-lucide-terminal"
                        size="sm"
                      />
                    )
                  : (
                      <UAvatar
                        icon="i-lucide-plug"
                        size="sm"
                      />
                    )
          }
          <div>
            <p class="font-medium text-highlighted">{row.original.name}</p>
            <p>{row.original.code}</p>
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
      accessorKey: 'uri',
      header: 'URI',
      cell: ({ row }) => (
        <code class="text-xs break-all">{row.original.uri}</code>
      )
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <div class="text-sm text-muted">{dayjs(row.original.created_at).fromNow()}</div>
      )
    }
  )

  if (props.control) {
    cols.push({
      id: 'menu',
      header: () => {},
      cell: ({ row }) => (
        <div class="text-right px-1" onClick={(e: MouseEvent) => e.stopPropagation()}>
          <UDropdownMenu
            items={getRowItems(row as unknown as Row<Connection>)}
            content={{ align: 'end' }}
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              class="ml-auto"
              size="xs"
            />
          </UDropdownMenu>
        </div>
      ),
      meta: {
        class: {
          th: 'w-0',
          td: 'whitespace-nowrap'
        }
      }
    })
  }

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
      meta: {
        class: {
          th: 'w-0',
          td: 'whitespace-nowrap'
        }
      }
    })
  }

  return cols
})
</script>

<template>
  <UEmpty
    v-if="!data || data?.total < 1"
    title="No connections found"
    description="It looks like you haven't added any connections. Create one to get started."
    icon="i-lucide-plug"
    variant="naked"
    :actions="[
      {
        icon: 'i-lucide-plus',
        label: 'Create new',
        to: '/connections/@new'
      },
      {
        icon: 'i-lucide-refresh-cw',
        label: 'Refresh',
        color: 'neutral',
        variant: 'subtle',
        onClick: () => refresh()
      }
    ]"
  />
  <div v-else class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <UFieldGroup>
        <UInput
          v-model="queryInput"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search connections..."
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
