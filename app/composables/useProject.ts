export const useProject = () => {
  const { $api } = useNuxtApp()
  const projects = useState<ProjectSchema[]>('projects', () => [])
  const projectId = useCookie<string | undefined>('project', {
    path: '/'
  })
  const project = useState<ProjectSchema | undefined>('project')
  const loading = ref(false)

  // 프로젝트 목록 로드
  const refresh = async () => {
    loading.value = true
    try {
      const data = await $api<PaginatedResponse<ProjectSchema>>('/projects')
      projects.value = data.data || []

      // 데이터 로드 후 현재 프로젝트 동기화
      syncCurrentProject()
    } finally {
      loading.value = false
    }
  }

  // 쿠키 기반으로 현재 활성화된 프로젝트 객체 설정
  const syncCurrentProject = () => {
    if (projectId.value) {
      const found = projects.value.find(p => p.id === projectId.value)
      if (found) {
        project.value = found
        return
      }
    }

    // 쿠키가 없거나 못 찾은 경우 첫 번째 프로젝트를 기본값으로 (선택 사항)
    if (projects.value.length > 0 && projects.value[0]) {
      project.value = projects.value[0]
      projectId.value = projects.value[0].id
    } else {
      project.value = undefined
      projectId.value = undefined
    }
  }

  function setProject(newId: string) {
    const found = projects.value.find(p => p.id === newId)
    if (!found) return

    project.value = found
    projectId.value = found.id
  }

  return {
    projects,
    project,
    loading,
    refresh,
    setProject,
    syncCurrentProject
  }
}
