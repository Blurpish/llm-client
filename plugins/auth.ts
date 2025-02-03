import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

export default defineNuxtPlugin(nuxt => {
  addRouteMiddleware('auth', async (to) => {
    const userPrefs = useUserStore(nuxt.$pinia)
    
    if (userPrefs.openRouterToken) return

    const { code } = to.query
    const callbackUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://llm-client-two.vercel.app'

    if (!code) {
      return navigateTo(`https://openrouter.ai/auth?callback_url=${callbackUrl}`, { external: true })
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        body: JSON.stringify({ code })
      })
      const { key } = await res.json()
      userPrefs.openRouterToken = key
    } catch (error) {
      return navigateTo('/login')
    }
  }, { global: true })
})
