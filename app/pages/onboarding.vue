<script setup lang="ts">
import type { Project } from '#shared/types'
import * as z from 'zod'

definePageMeta({
  layout: 'plain',
  middleware: ['auth']
})

const toast = useToast()

// Load current projects; if any exist, send user to dashboard
const { projects, project, refresh } = useProject()
if (projects.value.length > 0) {
  navigateTo('/')
}

const projectSchema = z.object({
  name: z.string().min(2, 'Too short')
})
type ProjectSchema = z.output<typeof projectSchema>

const form = ref<HTMLFormElement>()
const state = reactive<Partial<ProjectSchema>>({
  name: ''
})
const loading = ref(false)

const { data, execute } = useApi<Project>(`/projects`, {
  method: 'post',
  body: state,
  immediate: false,
  lazy: true
})

async function onSubmit() {
  loading.value = true
  try {
    await execute()
    await refresh()

    // Update shared state so global middleware won’t bounce back to /start
    if (data.value) {
      // Prepend if not already present
      if (!projects.value.find(p => p.id === data.value.id)) {
        projects.value = [data.value, ...projects.value]
      }
      project.value = data.value
    }

    toast.add({
      title: '프로젝트가 생성되었습니다.',
      description: '대시보드로 이동합니다.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    navigateTo('/')
  } catch (error) {
    loading.value = false
    toast.add({
      title: '프로젝트 생성 실패',
      description: '프로젝트 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    console.error(error)
  }
}
</script>

<template>
  <div class="min-h-svh grid place-items-center py-10 px-4">
    <div class="w-full max-w-lg">
      <UPageCard
        title="프로젝트 생성"
        description="처음 시작하시는군요! 사용할 프로젝트를 등록해주세요."
      >
        <UForm
          id="start-project"
          ref="form"
          :schema="projectSchema"
          :state="state"
          @submit="onSubmit"
        >
          <UFormField
            name="name"
            label="프로젝트 이름"
            description="영수증, 인보이스 등 여러 곳에 표시됩니다."
            required
            class="mb-4"
          >
            <UInput
              v-model="state.name"
              size="xl"
              autocomplete="off"
              placeholder="예: Acme"
              class="w-full"
            />
          </UFormField>

          <div class="flex gap-3">
            <UButton
              type="submit"
              form="start-project"
              trailing-icon="i-lucide-arrow-right"
              size="xl"
              block
              :loading="loading"
              :disabled="loading"
              class="flex-1"
            >
              <div class="w-full">
                프로젝트 만들기
              </div>
            </UButton>
          </div>
        </UForm>
      </UPageCard>

      <div class="text-center mt-6 text-xs text-muted">
        프로젝트는 이후 설정에서 언제든지 수정할 수 있어요.
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
