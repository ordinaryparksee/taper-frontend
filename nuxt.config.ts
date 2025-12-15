// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxthub/core',
    '@nuxtjs/mdc',
    'nuxt-auth-utils',
    'dayjs-nuxt'
  ],

  imports: {
    dirs: [
      '~/composables/**'
    ]
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    apiBase: process.env.API_BASE || 'http://localhost:8000/v1',
    session: {
      maxAge: 60 * 60 * 24 * 7,
      password: process.env.NUXT_SESSION_PASSWORD || 'a-random-password-with-at-least-32-characters',
      cookie: {
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/'
      }
    },
    public: {
      appEnv: process.env.NODE_ENV || 'local',
      apiBase: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  compatibilityDate: '2024-07-11',

  hub: {
    blob: true
  },

  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        clientPort: 3000
      },
      watch: {
        ignored: ['**/.nuxt/**']
      }
    }
  },

  dayjs: {
    plugins: ['relativeTime', 'utc', 'timezone']
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
