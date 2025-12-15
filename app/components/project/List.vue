<script setup lang="tsx">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { UButton, UCheckbox, UDropdownMenu } from '#components'
import type { Project } from '#shared/types'
import type { Row } from '@tanstack/table-core'

const props = withDefaults(defineProps<{
  selectable?: boolean
  multiple?: boolean
  control?: boolean
}>(), {
  selectable: false,
  multiple: false,
  control: false,
  modelValue: null
})

const model = defineModel<string[] | string | null>({})
const selected = defineModel<string[]>('selected', {
  default: []
})

const app = useAppConfig()
const dayjs = useDayjs()
const toast = useToast()

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
} = useProjects()

const limitItems = ref([5, 10, 20])

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

function getRowItems(row: Row<Project>): DropdownMenuItem[] {
  return [
    { type: 'label', label: 'Actions' },
    {
      label: 'Copy project code',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.code.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Project code copied to clipboard'
        })
      }
    },
    { type: 'separator' },
    {
      label: 'View project details',
      icon: 'i-lucide-list',
      to: `/projects/${row.original.code}`
    },
    { type: 'separator' },
    {
      label: 'Delete project',
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        await remove(row.original.code)
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

function getRowAttrs(row: Project) {
  return {
    class: [
      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
      props.selectable && selected.value?.includes(row.code) ? 'bg-gray-50/60 dark:bg-gray-800/60' : ''
    ].join(' '),
    onClick: () => toggle(row.code)
  }
}

const columns = computed<TableColumn<Project>[]>(() => {
  const cols: TableColumn<Project>[] = []

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
        return (
          <UCheckbox
            modelValue={isSelected(code)}
            aria-label="Select row"
            onUpdate:modelValue={(value: boolean | 'indeterminate') => {
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
        <div class="flex items-center gap-2">
          <div>
            <p class="font-medium text-highlighted">{row.original.name}</p>
            <p>{row.original.code}</p>
          </div>
        </div>
      ),
      meta: { class: { th: 'w-full' } }
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
          <UDropdownMenu items={getRowItems(row as unknown as Row<Project>)} content={{ align: 'end' }}>
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" class="ml-auto" size="xs" />
          </UDropdownMenu>
        </div>
      ),
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
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
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
    })
  }

  return cols
})
</script>

<template>
  <UEmpty
    v-if="!items || items.length < 1"
    title="No projects found"
    description="It looks like you haven't added any projects. Create one to get started."
    :icon="app.ui.icons.project"
    variant="naked"
    :actions="[
      { icon: 'i-lucide-plus', label: 'Create new', to: '/projects/@new' },
      { icon: 'i-lucide-refresh-cw', label: 'Refresh', color: 'neutral', variant: 'subtle', onClick: () => refresh() }
    ]"
  />
  <div v-else class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <UFieldGroup>
        <UInput
          v-model="queryInput"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search projects..."
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
