// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/icon', '@nuxt/fonts', '@nuxtjs/tailwindcss', 'shadcn-nuxt', "@pinia/nuxt", "@pinia-plugin-persistedstate/nuxt"],
  css: ['~/assets/css/main.css', 'assets/css/tailwind.css'],
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  ssr: false,
  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        baseUrl: '.'
      }
    }
  },
  runtimeConfig: {
    public: {
      RTC_ICE_USERNAME: process.env.METERED_TURN_USERNAME,
      RTC_ICE_CREDENTIAL: process.env.METERED_TURN_PASSWORD
    }
  },
  vite: {
    define: {
      global: 'globalThis'
    }
  }
})
