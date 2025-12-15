import type { FileWithStatus } from '#shared/utils/file'
import { FILE_UPLOAD_CONFIG } from '#shared/utils/file'

export function useChatUpload(chatId: string) {
  const config = useRuntimeConfig()
  const { loggedIn } = useUserSession()
  const toast = useToast()
  const files = ref<FileWithStatus[]>([])

  async function uploadFiles(newFiles: File[]) {
    if (!loggedIn.value) {
      return
    }

    const filesWithStatus: FileWithStatus[] = newFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: 'uploading' as const
    }))

    files.value = [...files.value, ...filesWithStatus]

    for (const fileWithStatus of filesWithStatus) {
      const { upload, uploadId } = useTus({
        endpoint: `${config.public.apiBase}/tus/upload`,
        metadata: {
          namespace: `chat.${chatId}`,
          filename: fileWithStatus.file.name,
          filetype: fileWithStatus.file.type
        },
        onSuccess() {
          const index = files.value.findIndex(f => f.id === fileWithStatus.id)
          if (index !== -1) {
            files.value[index] = {
              ...files.value[index]!,
              status: 'uploaded',
              uploadedUrl: `/api/v1/tus/upload/${uploadId.value}`,
              uploadedPathname: uploadId.value || undefined
            }
          }
        },
        onError(err) {
          const index = files.value.findIndex(f => f.id === fileWithStatus.id)
          const errorMessage = err.message || 'Upload failed'
          if (index !== -1) {
            files.value[index] = {
              ...files.value[index]!,
              status: 'error',
              error: errorMessage
            }
          }
          toast.add({
            title: 'Upload failed',
            description: errorMessage,
            icon: 'i-lucide-alert-circle',
            color: 'error'
          })
        }
      })

      try {
        await upload(fileWithStatus.file)
      } catch (err) {
        console.error('Failed to upload file:', err)
      }
    }
  }

  const { dropzoneRef, isDragging } = useFileUpload({
    accept: FILE_UPLOAD_CONFIG.acceptPattern,
    multiple: true,
    onUpdate: uploadFiles
  })

  function removeFile(id: string) {
    const file = files.value.find(f => f.id === id)
    if (!file) return

    URL.revokeObjectURL(file.previewUrl)
    files.value = files.value.filter(f => f.id !== id)
  }

  function clearFiles() {
    files.value.forEach(f => URL.revokeObjectURL(f.previewUrl))
    files.value = []
  }

  const isUploading = computed(() => files.value.some(f => f.status === 'uploading'))

  const uploadedFiles = computed(() =>
    files.value
      .filter(f => f.status === 'uploaded' && f.uploadedUrl)
      .map(f => ({
        type: 'file' as const,
        mediaType: f.file.type,
        url: f.uploadedUrl!,
        id: f.uploadedPathname!
      }))
  )

  return {
    dropzoneRef,
    isDragging,
    files,
    isUploading,
    uploadedFiles,
    addFiles: uploadFiles,
    removeFile,
    clearFiles
  }
}
