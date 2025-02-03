import OpenAI from 'openai'
import type { AIProvider, AIModel } from '@/composables/useAI'
import { useUserStore } from '@/stores/user'

export class OpenRouterProvider implements AIProvider {
  id = 'ollama'
  name = 'Ollama'
  description = 'Access local ai models'
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      baseURL: "http://localhost:11434/v1",
      apiKey: '',
      dangerouslyAllowBrowser: true,
    })
  }

  async fetchModels(): Promise<AIModel[]> {
    const res = await fetch('http://localhost:11434/api/tags')
    const json = await res.json()
    return json.models.map((model: any) => ({
      id: model.digest,
      name: model.name,
      description: '',
      icon: 'lucide:box',
      pricing: '0',
      provider: 'ollama'
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
