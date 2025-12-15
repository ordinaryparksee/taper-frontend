<script setup lang="tsx">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import { UButton, UCheckbox, UDropdownMenu } from '#components'

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
const isOpenUploader = ref(false)
const isOpenSearch = ref(false)
const uploaderOpened = ref<Knowledge>()
const exploreOpened = ref<Knowledge>()

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
} = useKnowledges(computed(() => props.projectCode || project.value?.code))

const { $api } = useNuxtApp()
const resetting = ref(false)

async function onReset(knowledge: Knowledge) {
  const confirmed = confirm(`This will delete all indexed vectors and reset file processing status for '${knowledge.name}'. This action cannot be undone.`)
  if (!confirmed) return
  try {
    resetting.value = true
    await $api(`/knowledges/${knowledge.code}/reset`, {
      method: 'POST'
    })
    toast.add({
      title: 'Success',
      description: 'Knowledge reset successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    await refresh()
  } catch (e) {
    toast.add({
      title: 'Error',
      description: (e as Error).message || 'Failed to reset knowledge.',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    resetting.value = false
  }
}

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

function getRowItems(row: Row<Knowledge>): DropdownMenuItem[] {
  return [
    { type: 'label', label: 'Actions' },
    {
      label: 'Copy knowledge code',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.code.toString())
        toast.add({
          title: 'Copied to clipboard',
          description: 'Knowledge code copied to clipboard'
        })
      }
    },
    { type: 'separator' },
    {
      label: 'View knowledge details',
      icon: 'i-lucide-list',
      to: `/knowledges/${row.original.code}`
    },
    {
      label: 'Manage files',
      icon: 'i-lucide-folder',
      async onSelect() {
        uploaderOpened.value = row.original
        isOpenUploader.value = true
      }
    },
    {
      label: 'Explore',
      icon: 'i-lucide-search',
      async onSelect() {
        exploreOpened.value = row.original
        isOpenSearch.value = true
      }
    },
    { type: 'separator' },
    {
      label: 'Reset knowledge',
      icon: 'i-lucide-refresh-cw',
      onSelect() {
        onReset(row.original)
      }
    },
    {
      label: 'Delete knowledge',
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

function getRowAttrs(row: Knowledge) {
  return {
    class: [
      'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
      props.selectable && selected.value?.includes(row.code) ? 'bg-gray-50/60 dark:bg-gray-800/60' : ''
    ].join(' '),
    onClick: () => toggle(row.code)
  }
}

const columns = computed<TableColumn<Knowledge>[]>(() => {
  const cols: TableColumn<Knowledge>[] = []

  // Selection controls
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
      meta: {
        class: { th: 'w-0', td: 'whitespace-nowrap' }
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
          <UDropdownMenu items={getRowItems(row as unknown as Row<Knowledge>)} content={{ align: 'end' }}>
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" class="ml-auto" size="xs" />
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
      meta: { class: { th: 'w-0', td: 'whitespace-nowrap' } }
    })
  }

  return cols
})
</script>

<template>
  <UEmpty
    v-if="!items || items.length < 1"
    title="No knowledges found"
    description="It looks like you haven't added any knowledges. Create one to get started."
    :icon="app.ui.icons.knowledge"
    variant="naked"
    :actions="[
      { icon: app.ui.icons.plus, label: 'Create new', to: '/knowledges/@new' },
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
          placeholder="Search knowledges..."
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

    <USlideover
      v-if="uploaderOpened"
      v-model:open="isOpenUploader"
      title="Manage files"
      :description="uploaderOpened.name"
    >
      <template #body>
        <KnowledgeUploader
          v-if="project"
          :project-code="project.code"
          :knowledge-code="uploaderOpened.code"
          class="h-full"
        />
      </template>
    </USlideover>
    <UModal
      v-if="exploreOpened"
      v-model:open="isOpenSearch"
      fullscreen
      title="Explore"
      :description="exploreOpened.name"
    >
      <template #body>
        <KnowledgeExplore
          :knowledge="exploreOpened"
          class="h-full"
        />
      </template>
    </UModal>
  </div>
</template>
