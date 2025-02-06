import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import OpenAI from 'openai'
import type { AIProvider, AIModel } from '@/composables/useAI'
import { toast } from 'vue-sonner'
import { useAI } from '@/composables/useAI'

function fetchWithoutXStainlessTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.delete('x-stainless-timeout')
  return fetch(input, { ...init, headers })
}

export class OpenRouterProvider implements AIProvider {
  id = 'openrouter'
  name = 'OpenRouter'
  description = 'Access multiple AI models through OpenRouter'
  private client: OpenAI

  constructor(config?: { apiKey?: string }) {
    const userStore = useUserStore()
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: config?.apiKey || userStore.openRouterToken,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'LLM-Client',
      },
      fetch: fetchWithoutXStainlessTimeout,
    })
  }

  async connect(): Promise<void> {
    const userStore = useUserStore()
    if (userStore.openRouterToken) {
      toast('Already connected to OpenRouter')
      return
    }
    const callbackUrl = `${window.location.origin}/callback?service=openrouter`
    const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`
    const popup = window.open(authUrl, 'openrouterPopup', 'width=600,height=600')
    if (!popup) {
      toast('Popup blocked', { description: 'Please allow popups for authentication' })
      return Promise.reject(new Error('Popup blocked'))
    }
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('message', messageListener)
        window.removeEventListener('storage', storageListener)
      }
      const messageListener = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data && (event.data.key || event.data.code)) {
          const apiKey = await fetch('https://openrouter.ai/api/v1/auth/keys', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: event.data.key || event.data.code,
            }),
          });
          userStore.openRouterToken = (await apiKey.json()).key
          popup.close()
          cleanup()
          resolve()
        }
      }
      const storageListener = async (event: StorageEvent) => {
        if (event.key === 'auth_openrouter' && event.newValue) {
          const data = JSON.parse(event.newValue)
          if (data.key || data.code) {
            const apiKey = await fetch('https://openrouter.ai/api/v1/auth/keys', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: data.key || data.code,
              }),
            });
            userStore.openRouterToken = (await apiKey.json()).key
            localStorage.removeItem('auth_openrouter')
            popup.close()
            cleanup()
            resolve()
          }
        }
      }
      window.addEventListener('message', messageListener)
      window.addEventListener('storage', storageListener)
      setTimeout(() => {
        cleanup()
        popup.close()
        reject(new Error("Authentication timed out"))
      }, 60000)
    })
  }

  async disconnect(): Promise<void> {
    const userStore = useUserStore();
    userStore.openRouterToken = '';
    console.log('Disconnected from OpenRouter');
  }

  async fetchModels(): Promise<AIModel[]> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models')
      const json = await res.json()
      return json.data.map((model: any) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        icon: model.icon || 'lucide:box',
        pricing: model.pricing,
        provider: 'openrouter'
      }))
    } catch (error: any) {
      toast(error.message, { description: 'Error fetching models from OpenRouter' })
      throw error
    }
  }

  async *chat(messages: any[], model: string, options?: any): AsyncIterable<any> {
    try {
      console.log(this.client)
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        stream: true,
        ...options
      })

      for await (const chunk of stream) {
        yield chunk
      }
    } catch (error: any) {
      toast(error.message, { description: 'Error in OpenRouter chat stream' })
      throw error
    }
  }
}

// Add default export as Nuxt plugin
export default defineNuxtPlugin((nuxtApp) => {
  const userStore = useUserStore()
  const provider = new OpenRouterProvider({ apiKey: userStore.openRouterToken })
  const { registerProvider } = useAI()
  registerProvider(provider)
})
