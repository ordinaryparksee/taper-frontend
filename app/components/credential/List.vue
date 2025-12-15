<script setup lang="tsx">
import type { Credential } from '#shared/types'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { UAvatar, UButton, UCheckbox, UDropdownMenu } from '#components'

const props = withDefaults(defineProps<{
  selectable?: boolean
  multiple?: boolean
  control?: boolean
  projectCode?: string | null
}>(), {
  selectable: false,
  multiple: false,
  control: false,
  projectCode: null
})

const app = useAppConfig()
const model = defineModel<string[] | string | null>({})
const selected = defineModel<string[]>('selected', { default: [] })

const dayjs = useDayjs()
const toast = useToast()
const { project } = useProject()

const {
  queryInput,
  page,
  limit,
  items,
  status,
  total,
  offset,
  refresh,
  search,
  remove
} = useCredentials(computed(() => props.projectCode || project.value?.code))

const limitItems = ref([5, 10, 20])

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
        await remove(row.code)
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
        const pageItems = items.value
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
              ? <UAvatar size="md" class="rounded-md" icon={app.ui.icons.basicAuthCredential} />
              : row.original.type === 'SSH'
                ? <UAvatar size="md" class="rounded-md" icon={app.ui.icons.sshCredential} />
                : row.original.type === 'HTTP_HEADER'
                  ? <UAvatar size="md" class="rounded-md" icon={app.ui.icons.httpHeaderCredential} />
                  : <UAvatar size="md" class="rounded-md" icon={app.ui.icons.apiKeyCredential} />
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
    v-if="!items || items.length < 1"
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
          @update:model-value="async (value) => { limit = Number(value); page = 1; await refresh() }"
        />
      </div>
    </div>

    <UTable
      :loading="status === 'pending'"
      :columns="columns"
      :data="items"
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
        :total="total || 0"
        :items-per-page="limit"
        @update:page="async (value) => { page = value; await refresh() }"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
