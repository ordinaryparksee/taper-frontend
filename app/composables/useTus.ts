import * as tus from 'tus-js-client'

interface UploadOptions {
  onUploaded?: (fileId: string, file: File) => void
}

export function useTus(options: tus.UploadOptions & UploadOptions) {
  const uploading = ref(false)
  const progress = ref(0)
  const bytesUploaded = ref(0)
  const bytesTotal = ref(0)
  const error = ref<Error | tus.DetailedError | null>(null)
  const uploadUrl = ref<string | null>(null)
  const uploadId = ref<string | null>(null)
  const currentUpload = ref<tus.Upload | null>(null)

  async function generateFileContentHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function createUploader(file: File): Promise<tus.Upload> {
    const contentHash = await generateFileContentHash(file)

    const uploader = new tus.Upload(file, {
      endpoint: options.endpoint,
      chunkSize: options.chunkSize || 5 * 1024 * 1024,
      retryDelays: options.retryDelays || [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: options.removeFingerprintOnSuccess ?? false,
      metadata: {
        filename: file.name,
        filetype: file.type,
        fingerprint: btoa(contentHash),
        ...options.metadata
      },
      // Expose upload URL/ID as soon as the server responds to the create request
      onAfterResponse: (req, res) => {
        try {
          // Call user-provided hook first to preserve behavior
          options.onAfterResponse?.(req, res)

          const location = res.getHeader?.('location') || res.getHeader?.('Location')
          if (location) {
            // Resolve absolute URL from possibly relative Location header
            const base = options.endpoint?.toString()
            const fullUrl = base ? new URL(location, base).toString() : String(location)
            uploadUrl.value = fullUrl
            uploadId.value = new URL(fullUrl).pathname.split('/').filter(Boolean).pop() || null
          }
        } catch {
          // ignore parsing errors
        }
      },
      onError(err) {
        error.value = err
        uploading.value = false
        options.onError?.(err)
      },
      onProgress(uploaded, total) {
        bytesUploaded.value = uploaded
        bytesTotal.value = total
        progress.value = total > 0 ? (uploaded / total) * 100 : 0
        options.onProgress?.(uploaded, total)
      },
      onChunkComplete(chunkSize, bytesAccepted, total) {
        options.onChunkComplete?.(chunkSize, bytesAccepted, total)
      },
      onSuccess(payload) {
        options.onSuccess?.(payload)

        uploading.value = false
        uploadUrl.value = uploader.url || null
        if (uploader.url) {
          uploadId.value = new URL(uploader.url).pathname.split('/').filter(Boolean).pop() || null
        }
        if (uploadId.value) {
          options.onUploaded?.(uploadId.value, file)
        }
      }
    })

    return uploader
  }

  async function upload(file: File) {
    try {
      error.value = null
      uploading.value = true

      const uploader = await createUploader(file)
      currentUpload.value = uploader

      const previousUploads = await uploader.findPreviousUploads()
      if (previousUploads.length > 0 && previousUploads[0]) {
        uploader.resumeFromPreviousUpload(previousUploads[0])
      }

      uploader.start()

      return uploader
    } catch (err) {
      error.value = err as Error
      uploading.value = false
      throw err
    }
  }

  async function terminate(file: File) {
    try {
      const uploader = await createUploader(file)
      const previousUploads = await uploader.findPreviousUploads()

      for (const previousUpload of previousUploads) {
        if (previousUpload.uploadUrl) {
          await tus.Upload.terminate(previousUpload.uploadUrl, options)
        }
        // Also remove cached resume info from UrlStorage (usually localStorage)
        const urlStorage = options.urlStorage || tus.defaultOptions.urlStorage
        if (previousUpload.urlStorageKey) {
          await urlStorage.removeUpload(previousUpload.urlStorageKey)
        }
      }
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  function abort() {
    if (currentUpload.value) {
      currentUpload.value.abort()
      uploading.value = false
      currentUpload.value = null
    }
  }

  function reset() {
    abort()
    error.value = null
    progress.value = 0
    bytesUploaded.value = 0
    bytesTotal.value = 0
    uploadUrl.value = null
    uploadId.value = null
  }

  return {
    upload,
    terminate,
    abort,
    reset,
    uploading: readonly(uploading),
    progress: readonly(progress),
    bytesUploaded: readonly(bytesUploaded),
    bytesTotal: readonly(bytesTotal),
    error: readonly(error),
    uploadUrl: readonly(uploadUrl),
    uploadId: readonly(uploadId),
    currentUpload: readonly(currentUpload)
  }
}
