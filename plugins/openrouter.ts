import OpenAI from 'openai'
import type { AIProvider, AIModel } from '@/composables/useAI'
import { useUserStore } from '@/stores/user'
import { toast } from 'vue-sonner'

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
    })
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
