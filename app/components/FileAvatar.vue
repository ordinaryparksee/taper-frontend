<script setup lang="ts">
interface FileAvatarProps {
  name: string
  type: string
  previewUrl?: string
  status?: 'idle' | 'uploading' | 'uploaded' | 'error'
  error?: string
  removable?: boolean
}

const props = withDefaults(defineProps<FileAvatarProps>(), {
  status: 'idle',
  removable: false
})

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="relative group">
    <UTooltip arrow :text="removeRandomSuffix(name)">
      <UAvatar
        size="3xl"
        :src="type.startsWith('image/') ? previewUrl : undefined"
        :icon="getFileIcon(type, name)"
        class="border border-default rounded-lg"
        :class="{
          'opacity-50': props.status === 'uploading',
          'border-error': props.status === 'error'
        }"
      />
    </UTooltip>

    <div
      v-if="props.status === 'uploading'"
      class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"
    >
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-white" />
    </div>

    <UTooltip v-if="props.status === 'error'" :text="error">
      <div class="absolute inset-0 flex items-center justify-center bg-error/50 rounded-lg">
        <UIcon name="i-lucide-alert-circle" class="size-8 text-white" />
      </div>
    </UTooltip>

    <UButton
      v-if="props.removable && props.status !== 'uploading'"
      icon="i-lucide-x"
      size="xs"
      square
      color="neutral"
      variant="solid"
      class="absolute p-0 -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
      @click="emit('remove')"
    />
  </div>
</template>
