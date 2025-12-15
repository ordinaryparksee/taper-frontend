<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  collapsed?: boolean
}>()

const app = useAppConfig()
const { projects, project: currentProject, setProject, refresh } = useProject()

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    projects.value.map(project => ({
      label: project.name,
      color: project.code === currentProject.value?.code ? 'primary' : undefined,
      onSelect() {
        setProject(project.code)
      }
    })), [
      {
        label: 'Create project',
        icon: 'i-lucide-plus',
        onSelect() {
          navigateTo('/projects/@new')
        }
      },
      {
        to: '/projects',
        label: 'Manage projects',
        icon: app.ui.icons.project
      }
    ]
  ]
})

await refresh()
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: props.collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...currentProject,
        label: props.collapsed ? undefined : currentProject?.name,
        trailingIcon: props.collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="props.collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!props.collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
