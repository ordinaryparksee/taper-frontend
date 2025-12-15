<script setup lang="tsx">
import type { FormSubmitEvent } from '@nuxt/ui'
import { UButton } from '#components'
import * as z from 'zod'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const app = useAppConfig()
const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useProject()

const isNew = computed(() => route.params.knowledge_id === '@new')
const useOwnApiKey = ref(false)
const isExternalConnection = ref(false)

const { rawModels: models, formatModelName, detectIcon, detectAvatar } = useModels('embedding')

const { data, refresh, execute } = useApi<BaseResponse<KnowledgeType>>(`/knowledges/${route.params.knowledge_id}`, {
  immediate: false
})

// Connection selection moved to modal-based component
const chunkStrategyOptions = [
  { label: 'Recursive character splitting', value: 'RECURSIVE_CHAR_SPLIT' },
  { label: 'Character splitting', value: 'CHAR_SPLIT' }
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Korean', value: 'ko' }
]

const splitModeOptions = [
  { label: 'No split', value: null },
  { label: 'Context base', value: 'CONTEXT_BASE' },
  { label: 'Page base', value: 'PAGE_BASE' }
]

if (!isNew.value) {
  await execute()

  if (data.value?.data.embedding_model_credential_id) {
    useOwnApiKey.value = true
  }

  if (data.value?.data.connection_id) {
    isExternalConnection.value = true
  }
}

const knowledgeSchema = z.object({
  name: z.string().min(2, 'Too short'),
  connection_id: z.string().min(1, 'Required').nullish(),
  embedding_model_credential_id: z.string().min(1, 'Required').nullish(),
  embedding_model: z.string().min(1, 'Required'),
  embedding_dimension: z.number().int().positive('Must be a positive number'),
  chunk_strategy: z.string().min(1, 'Required'),
  chunk_size: z.coerce.number().int().positive('Must be a positive number'),
  chunk_overlap: z.coerce.number().int().min(0, 'Must be 0 or greater'),
  language: z.string().optional(),
  split_mode: z.string().nullish()
}).refine((val) => {
  // 가지고 있는 API_KEY를 사용하는 경우에만 embedding_model_credential_id 필수
  return !useOwnApiKey.value || (typeof val.embedding_model_credential_id === 'string' && val.embedding_model_credential_id.length > 0)
}, {
  path: ['embedding_model_credential_id'],
  message: 'Required'
}).refine((val) => {
  // 외부 커넥션을 사용하는 경우에만 connection_id 필수
  return !isExternalConnection.value || (typeof val.connection_id === 'string' && val.connection_id.length > 0)
}, {
  path: ['connection_id'],
  message: 'Required'
})
type KnowledgeFormSchema = z.output<typeof knowledgeSchema>

const form = ref<HTMLFormElement>()
const submitting = ref(false)

const knowledge = reactive<Partial<KnowledgeFormSchema>>({
  name: data.value?.data.name || '',
  connection_id: data.value?.data.connection_id ?? null,
  embedding_model_credential_id: data.value?.data.embedding_model_credential_id ?? null,
  embedding_model: data.value?.data.embedding_model,
  embedding_dimension: data.value?.data.embedding_dimension,
  chunk_strategy: data.value?.data.chunk_strategy ?? chunkStrategyOptions[0]?.value,
  chunk_size: data.value?.data.chunk_size ?? 1000,
  chunk_overlap: data.value?.data.chunk_overlap ?? 100,
  language: data.value?.data.language ?? languageOptions[0]?.value,
  split_mode: data.value?.data.split_mode ?? splitModeOptions[0]?.value
} as KnowledgeFormSchema)

const modelOptions = computed(() => (models.value || []).map((m) => {
  const value = `${m.provider}/${m.model}`
  return {
    label: formatModelName(value),
    value,
    icon: detectIcon(value),
    avatar: detectAvatar(value)
  }
}))

const dimensionOptions = computed(() => {
  if (!knowledge.embedding_model) return []
  const selectedModel = models.value?.find(m => `${m.provider}/${m.model}` === knowledge.embedding_model)
  if (!selectedModel) return []

  const dimensions = Array.isArray(selectedModel.output_tokens)
    ? selectedModel.output_tokens
    : [selectedModel.output_tokens]

  return dimensions.map(d => ({ label: d.toString(), value: d }))
})

async function submit() {
  form.value?.submit()
}

async function onSubmit(event: FormSubmitEvent<KnowledgeFormSchema>) {
  try {
    submitting.value = true
    await $api<KnowledgeType>(data.value ? `/knowledges/${data.value.data.id}` : '/knowledges', {
      method: data.value ? 'PUT' : 'POST',
      params: {
        project_id: project.value?.id
      },
      body: {
        ...event.data
      }
    })
    toast.add({
      title: 'Success',
      description: 'Knowledge saved successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    if (isNew.value) {
      await navigateTo('/knowledges')
    } else {
      await refresh()
    }
  } finally {
    submitting.value = false
  }
}

const items = computed(() => [
  { label: 'Knowledges', icon: app.ui.icons.knowledge, to: '/knowledges' },
  { label: data.value?.data.name || 'New' }
])

const resetting = ref(false)

async function onReset() {
  if (!confirm('This will delete all indexed vectors and reset file processing status. This action cannot be undone.')) {
    return
  }

  try {
    resetting.value = true
    await $api(`/knowledges/${data.value?.data.id}/reset`, {
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
</script>

<template>
  <UDashboardPanel id="knowledges">
    <template #header>
      <UDashboardNavbar title="Knowledges" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-check"
            size="md"
            class="rounded-full"
            :loading="submitting"
            :disabled="submitting"
            @click="submit"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="items" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UForm
        id="knowledge"
        ref="form"
        class="space-y-4"
        :schema="knowledgeSchema"
        :state="knowledge"
        @submit="onSubmit"
      >
        <UPageCard
          title="Settings"
          description="These informations will be displayed publicly."
          variant="naked"
          orientation="horizontal"
        >
          <UButton
            form="knowledge"
            :label="submitting ? 'Saving…' : 'Save changes'"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
            :loading="submitting"
            :disabled="submitting"
          />
        </UPageCard>

        <UPageCard variant="naked">
          <UFormField
            name="name"
            label="Name"
            description="Will appear on receipts, invoices, and other communication."
            required
            class="space-y-2"
          >
            <UInput
              v-model="knowledge.name"
              icon="i-lucide-type"
              size="lg"
              placeholder="e.g., Movie data"
              autocomplete="off"
              class="w-full"
              :disabled="submitting"
              :autofocus="isNew"
            />
          </UFormField>

          <UFormField
            name="embedding_model"
            label="Embedding model"
            description="Select an embedding model to use."
            required
            class="space-y-2 mt-4"
          >
            <USelectMenu
              v-model="knowledge.embedding_model"
              :items="modelOptions"
              placeholder="Select model"
              :icon="knowledge.embedding_model ? detectIcon(knowledge.embedding_model) : 'i-lucide-cpu'"
              :avatar="detectAvatar(knowledge.embedding_model)"
              value-key="value"
              :disabled="submitting"
              class="w-full"
              @update:model-value="(value) => {
                const selectedModel = models?.find((_model) => {
                  const [provider, model] = value.split('/')
                  return _model.provider === provider && _model.model === model
                })
                if (selectedModel) {
                  knowledge.embedding_dimension = selectedModel.output_tokens[0]
                }
              }"
            />
          </UFormField>

          <UFormField
            name="embedding_dimension"
            label="Embedding dimension"
            description="Dimension of the embedding vector. Prefilled by selected model."
            required
            class="space-y-2 mt-4"
          >
            <USelect
              v-model="knowledge.embedding_dimension"
              :items="dimensionOptions"
              value-key="value"
              placeholder="Select dimension"
              :disabled="submitting"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="language"
            label="Language"
            description="Primary language of the content."
            class="space-y-2 mt-4"
          >
            <USelectMenu
              v-model="knowledge.language"
              value-key="value"
              :items="languageOptions"
              icon="i-lucide-languages"
              :disabled="submitting"
              clear
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="split_mode"
            label="Split mode"
            description="Default split mode for new files."
            class="space-y-2 mt-4"
          >
            <USelect
              v-model="knowledge.split_mode"
              :items="splitModeOptions"
              icon="i-lucide-split"
              :disabled="submitting"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Use your own api_key"
            description="Toggle to link this knowledge to your own API_KEY."
            class="space-y-2 mt-4"
          >
            <USwitch
              v-model="useOwnApiKey"
              @change="knowledge.embedding_model_credential_id = null"
            />
          </UFormField>

          <UFormField
            v-if="useOwnApiKey"
            name="embedding_model_credential_id"
            label="Credential"
            description="Select which connection this knowledge belongs to."
            :required="useOwnApiKey"
            class="space-y-2 mt-4"
          >
            <div class="flex items-center gap-3">
              <CredentialSelector
                v-model="knowledge.embedding_model_credential_id"
                :multiple="false"
                :project-id="project?.id || null"
                :disabled="submitting"
                button-label="Select credential"
              />
            </div>
          </UFormField>

          <UFormField
            label="Use external connection"
            description="Toggle to link this knowledge to an external connection."
            class="space-y-2 mt-4"
          >
            <USwitch
              v-model="isExternalConnection"
              @change="knowledge.connection_id = null"
            />
          </UFormField>

          <UFormField
            v-if="isExternalConnection"
            name="connection_id"
            label="Connection"
            description="Select which connection this knowledge belongs to."
            :required="isExternalConnection"
            class="space-y-2 mt-4"
          >
            <div class="flex items-center gap-3">
              <ConnectionSelector
                v-model="knowledge.connection_id"
                :multiple="false"
                :project-id="project?.id || null"
                :disabled="submitting"
                :drivers="['OPENSEARCH', 'PGVECTOR']"
                button-label="Select connection"
              />
            </div>
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <UFormField
              name="chunk_strategy"
              label="Chunk strategy"
              description="How to split content into chunks for indexing."
              required
              class="space-y-2"
            >
              <USelect
                v-model="knowledge.chunk_strategy"
                :items="chunkStrategyOptions"
                option-attribute="label"
                value-attribute="value"
                icon="i-lucide-split"
                :disabled="submitting"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="chunk_size"
              label="Chunk size"
              description="Target size for each chunk."
              required
              class="space-y-2"
            >
              <UInput
                v-model.number="knowledge.chunk_size"
                type="number"
                min="1"
                :disabled="submitting"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="chunk_overlap"
              label="Chunk overlap"
              description="Overlap between consecutive chunks."
              required
              class="space-y-2"
            >
              <UInput
                v-model.number="knowledge.chunk_overlap"
                type="number"
                min="0"
                :disabled="submitting"
                class="w-full"
              />
            </UFormField>
          </div>
        </UPageCard>
        <KnowledgeFileList v-if="data" :knowledge-id="data.data.id" />

        <UPageCard
          v-if="!isNew"
          title="Danger Zone"
          description="Irreversible actions for this knowledge."
          variant="naked"
          class="mt-12"
        >
          <div class="flex items-center gap-3">
            <UButton
              label="Reset Knowledge"
              color="error"
              variant="soft"
              icon="i-lucide-refresh-cw"
              :loading="resetting"
              @click="onReset"
            />
          </div>
        </UPageCard>
      </UForm>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
