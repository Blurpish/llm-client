import type { AIProvider, AIModel } from '@/composables/useAI'
import { HfInference } from '@huggingface/inference'
import { listModels } from '@huggingface/hub'
import { toast } from 'vue-sonner'

export class HuggingFaceProvider implements AIProvider {
  id = 'huggingface'
  name = 'HuggingFace'
  description = 'Access multiple AI models through HuggingFace'
  icon = 'logos:hugging-face-icon'
  private client: HfInference
  token?: string

  async connect(): Promise<void> {
    if (this.token) {
      toast('Already connected to HuggingFace', { description: 'Connection successful' })
      return
    }
    const clientId = 'c8f1dc09-16a1-4a29-b103-be3e72367902'
    const state = 'STATE'
    const callbackUrl = `${window.location.origin}/callback?service=huggingface`
    // Use response_type=code for authorization code flow (PKCE is recommended)
    const authUrl = `https://huggingface.co/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent('openid inference-api')}&state=${state}&response_type=code`
    const popup = window.open(authUrl, 'hfPopup', 'width=600,height=600')
    if (!popup) {
      toast('Popup blocked', { description: 'Please allow popups for authentication' })
      return Promise.reject(new Error('Popup blocked'))
    }
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('message', messageListener)
        window.removeEventListener('storage', storageListener)
      }
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data && event.data.code) {
          this.token = event.data.code
          popup.close()
          cleanup()
          toast('Connected to HuggingFace', { description: 'Authorization code received' })
          resolve()
        }
      }
      const storageListener = (event: StorageEvent) => {
        if (event.key === 'auth_huggingface' && event.newValue) {
          const data = JSON.parse(event.newValue)
          if (data.code) {
            this.token = data.code
            localStorage.removeItem('auth_huggingface')
            popup.close()
            cleanup()
            toast('Connected to HuggingFace', { description: 'Authorization code received via storage' })
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
    this.token = undefined;
    console.log('Disconnected from HuggingFace');
  }

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
  const userStore = useUserStore && useUserStore()
  const provider = new HuggingFaceProvider({ apiKey: userStore?.huggingfaceToken })
  const { registerProvider } = useAI()
  registerProvider(provider)
})

