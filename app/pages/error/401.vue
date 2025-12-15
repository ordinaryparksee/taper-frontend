<script setup lang="ts">
definePageMeta({
  layout: 'plain'
})

useSeoMeta({
  title: '인증 에러 - 401',
  description: '접근 권한이 없거나 세션이 만료되었습니다.'
})

useHead({
  htmlAttrs: {
    lang: 'ko'
  }
})

const { clear } = useUserSession()

const handleLogin = async () => {
  await clear()
  await navigateTo('/auth/login')
}

const handleHome = async () => {
  await navigateTo('/')
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
    <div class="max-w-md w-full text-center">
      <div class="mb-6">
        <UIcon name="i-lucide-lock" class="w-20 h-20 mx-auto text-primary" />
      </div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        401
      </h1>
      <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        인증 에러
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        접근 권한이 없거나 세션이 만료되었습니다.<br>
        다시 로그인해 주세요.
      </p>
      <div class="flex flex-col gap-3">
        <UButton
          label="로그인 페이지로 이동"
          block
          size="lg"
          @click="handleLogin"
        />
        <UButton
          label="홈으로 이동"
          variant="ghost"
          block
          size="lg"
          @click="handleHome"
        />
      </div>
    </div>
  </div>
</template>
