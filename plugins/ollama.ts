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

  async connect(): Promise<void> {
    try {
      const response = await fetch('http://localhost:11434/api/version')
      if (!response.ok) {
        console.error('Failed to connect to Ollama')
        throw new Error('Failed to connect to Ollama')
      }
      console.log('Connected to Ollama')
    } catch (error: any) {
      console.error('Ollama connection error:', error)
      throw error
    }
  }

  // NEW: disconnect method to clear any stored API key/state
  async disconnect(): Promise<void> {
    // For demonstration, reset API key if stored or perform any cleanup
    // (Assuming client has a property to clear; here we simply log)
    console.log('Disconnected from Ollama')
    // Optionally, recreate the client with an empty API key:
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
      id: model.name,
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
