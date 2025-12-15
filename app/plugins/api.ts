export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const { session, clear } = useUserSession()

  const api = $fetch.create({
    baseURL: import.meta.server ? config.apiBase : config.public.apiBase,
    onRequest({ options }) {
      if (session.value?.token) {
        // note that this relies on ofetch >= 1.4.0 - you may need to refresh your lockfile
        options.headers.set('Authorization', `Bearer ${session.value?.token}`)
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        await nuxtApp.runWithContext(async () => {
          await clear()
          throw createError({ statusCode: 401 })
        })
      }
    }
  })

  // Expose to useNuxtApp().$api
  return {
    provide: {
      api
    }
  }
})
