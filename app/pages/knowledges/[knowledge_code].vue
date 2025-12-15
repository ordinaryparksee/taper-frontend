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

const isNew = computed(() => route.params.knowledge_code === '@new')
const useOwnApiKey = ref(false)
const isExternalConnection = ref(false)

const { data: models } = useApi<Model[]>('/models', {
  params: {
    type: 'embedding'
  }
})
const defaultModel = computed(() => {
  if (models.value?.[0]) {
    return models.value?.[0]
  } else {
    return null
  }
})

const { data, refresh, execute } = useApi<Knowledge>(`/knowledges/${route.params.knowledge_code}`, {
  immediate: false
})

// Connection selection moved to modal-based component
const chunkStrategyOptions = [
  { label: 'Character splitting', value: 'CHAR_SPLIT' },
  { label: 'Recursive character splitting', value: 'RECURSIVE_CHAR_SPLIT' }
]

if (!isNew.value) {
  await execute()

  if (data.value?.embedding_model_credential_code) {
    useOwnApiKey.value = true
  }

  if (data.value?.connection_code) {
    isExternalConnection.value = true
  }
}

const knowledgeSchema = z.object({
  name: z.string().min(2, 'Too short'),
  connection_code: z.string().min(1, 'Required').nullish(),
  embedding_model_credential_code: z.string().min(1, 'Required').nullish(),
  embedding_model: z.string().min(1, 'Required'),
  embedding_dimension: z.number().int().positive('Must be a positive number'),
  chunk_strategy: z.string().min(1, 'Required'),
  chunk_size: z.coerce.number().int().positive('Must be a positive number'),
  chunk_overlap: z.coerce.number().int().min(0, 'Must be 0 or greater')
}).refine((val) => {
  // 가지고 있는 API_KEY를 사용하는 경우에만 embedding_model_credential_code 필수
  return !useOwnApiKey.value || (typeof val.embedding_model_credential_code === 'string' && val.embedding_model_credential_code.length > 0)
}, {
  path: ['embedding_model_credential_code'],
  message: 'Required'
}).refine((val) => {
  // 외부 커넥션을 사용하는 경우에만 connection_code 필수
  return !isExternalConnection.value || (typeof val.connection_code === 'string' && val.connection_code.length > 0)
}, {
  path: ['connection_code'],
  message: 'Required'
})
type KnowledgeSchema = z.output<typeof knowledgeSchema>

const form = ref<HTMLFormElement>()
const submitting = ref(false)

const knowledge = reactive<Partial<KnowledgeSchema>>({
  name: data.value?.name || '',
  connection_code: data.value?.connection_code ?? null,
  embedding_model_credential_code: data.value?.embedding_model_credential_code ?? null,
  embedding_model: data.value?.embedding_model ?? (
    defaultModel.value ? `${defaultModel.value?.provider}/${defaultModel.value?.model}` : undefined
  ),
  embedding_dimension: data.value?.embedding_dimension ?? defaultModel.value?.output_tokens,
  chunk_strategy: data.value?.chunk_strategy ?? 'CHAR_SPLIT',
  chunk_size: data.value?.chunk_size ?? 500,
  chunk_overlap: data.value?.chunk_overlap ?? 50
})

const modelOptions = computed(() => (models.value || []).map(m => ({
  label: `${m.provider} / ${m.model}`,
  value: `${m.provider}/${m.model}`
})))

async function submit() {
  form.value?.submit()
}

async function onSubmit(event: FormSubmitEvent<KnowledgeSchema>) {
  try {
    submitting.value = true
    await $api<Knowledge>(data.value ? `/knowledges/${data.value.code}` : '/knowledges', {
      method: data.value ? 'PUT' : 'POST',
      params: {
        project_code: project.value?.code
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
  { label: data.value?.name || 'New' }
])
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
            <USelect
              v-model="knowledge.embedding_model"
              :items="modelOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="Select model"
              icon="i-lucide-cpu"
              :disabled="submitting"
              class="w-full"
              @update:model-value="(value) => {
                const selectedModel = models?.find((_model) => {
                  const [provider, model] = value.split('/')
                  return _model.provider === provider && _model.model === model
                })
                knowledge.embedding_dimension = selectedModel?.output_tokens
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
            <UInput
              v-model.number="knowledge.embedding_dimension"
              type="number"
              min="1"
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
              @change="knowledge.embedding_model_credential_code = null"
            />
          </UFormField>

          <UFormField
            v-if="useOwnApiKey"
            name="embedding_model_credential_code"
            label="Credential"
            description="Select which connection this knowledge belongs to."
            :required="useOwnApiKey"
            class="space-y-2 mt-4"
          >
            <div class="flex items-center gap-3">
              <CredentialSelector
                v-model="knowledge.embedding_model_credential_code"
                :multiple="false"
                :project-code="project?.code || null"
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
              @change="knowledge.connection_code = null"
            />
          </UFormField>

          <UFormField
            v-if="isExternalConnection"
            name="connection_code"
            label="Connection"
            description="Select which connection this knowledge belongs to."
            :required="isExternalConnection"
            class="space-y-2 mt-4"
          >
            <div class="flex items-center gap-3">
              <ConnectionSelector
                v-model="knowledge.connection_code"
                :multiple="false"
                :project-code="project?.code || null"
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
        <KnowledgeFileList v-if="data" :knowledge-code="data.code" />
      </UForm>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
