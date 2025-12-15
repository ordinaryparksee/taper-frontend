<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  collapsed?: boolean
}>()

const { projects, project: selectedProject } = await useProject()

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    projects.value.map(project => ({
      label: project.name,
      onSelect() {
        selectedProject.value = project
      }
    })), [
      {
        label: 'Create project',
        icon: 'i-lucide-circle-plus',
        onSelect() {
          navigateTo('/projects/@new')
        }
      },
      {
        to: '/projects',
        label: 'Manage projects',
        icon: 'i-lucide-cog'
      }
    ]
  ]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: props.collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedProject,
        label: props.collapsed ? undefined : selectedProject?.name,
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
