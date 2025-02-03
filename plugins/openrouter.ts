import OpenAI from 'openai'
import type { AIProvider, AIModel } from '@/composables/useAI'
import { useUserStore } from '@/stores/user'

export class OpenRouterProvider implements AIProvider {
  id = 'openrouter'
  name = 'OpenRouter'
  description = 'Access multiple AI models through OpenRouter'
  private client: OpenAI

  constructor() {
    const userStore = useUserStore()
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: userStore.openRouterToken,
      dangerouslyAllowBrowser: true,
    })
  }

  async fetchModels(): Promise<AIModel[]> {
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
  }

  async *chat(messages: any[], model: string, options?: any): AsyncIterable<any> {
    const stream = await this.client.chat.completions.create({
      model,
      messages,
      stream: true,
      ...options
    })

    for await (const chunk of stream) {
      yield chunk
    }
  }
}

// Add default export as Nuxt plugin
export default defineNuxtPlugin((nuxtApp) => {
  const { registerProvider } = useAI()
  registerProvider(new OpenRouterProvider())
})
