import type { AIProvider, AIModel } from '@/composables/useAI'
import { HfInference } from '@huggingface/inference'
import { listModels } from '@huggingface/hub'
import { toast } from 'vue-sonner'

export class HuggingFaceProvider implements AIProvider {
  id = 'huggingface'
  name = 'HuggingFace'
  description = 'Access multiple AI models through HuggingFace'
  private client: HfInference

  searchHandler = async (query: string): Promise<AIModel[]> => {
    try {
      const models: AIModel[] = []
      for await (const model of listModels({ search: { query, task: 'text-generation' }, limit: 100 })) {
        models.push({
          id: model.name,
          name: model.name,
          description: model.task,
          icon: 'lucide:box',
          pricing: model.pricing,
          provider: 'huggingface'
        })
      }
      return models
    } catch (error: any) {
      toast(error.message, { description: 'Error searching models on HuggingFace' })
      throw error
    }
  }

  constructor(config?: { apiKey?: string }) {
    this.client = new HfInference(config?.apiKey)
  }

  async fetchModels(): Promise<AIModel[]> {
    try {
      const models: AIModel[] = []
      for await (const model of listModels({ search: { task: 'text-generation' }, limit: 100 })) {
        models.push({
          id: model.name,
          name: model.name,
          description: model.task,
          icon: 'lucide:box',
          pricing: model.pricing,
          provider: 'huggingface'
        })
      }
      return models
    } catch (error: any) {
      toast(error.message, { description: 'Error fetching models from HuggingFace' })
      throw error
    }
  }

  async *chat(messages: any[], model: string, options?: any): AsyncIterable<any> {
    try {
      const stream = await this.client.chatCompletionStream({
        model,
        messages,
        ...options
      })

      for await (const chunk of stream) {
        yield chunk
      }
    } catch (error: any) {
      toast(error.message, { description: 'Error in HuggingFace chat stream' })
      throw error
    }
  }
}


// Add default export as Nuxt plugin
export default defineNuxtPlugin((nuxtApp) => {
  const userStore = useUserStore()
  const provider = new HuggingFaceProvider({ apiKey: userStore.huggingfaceToken })
  const { registerProvider } = useAI()
  registerProvider(provider)
})

