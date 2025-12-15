export default defineNuxtRouteMiddleware(async (to) => {
  // Allow the start page itself (avoid redirect loop)
  if (to.path === '/onboarding') {
    return
  }

  // Fetch projects using the shared composable (cached via useState)
  const { projects, refresh } = useProject()
  await refresh()

  // If there are no registered projects, redirect to /start
  if (!projects.value || projects.value.length === 0) {
    return navigateTo('/onboarding')
  }
})
