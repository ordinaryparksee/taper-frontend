import type { PaginatedList, Project } from '#shared/types'

export const useProject = async () => {
  const { $api } = useNuxtApp()
  const projects = useState<Project[]>('projects', () => [])
  const project = useState<Project | undefined>('project')

  if (projects.value.length === 0) {
    const data = await $api<PaginatedList<Project>>('/projects')
    projects.value = data.items || []

    if (!project.value && projects.value.length > 0) {
      project.value = projects.value[0]
    }
  }

  return {
    projects, project
  }
}
