import { ref, reactive } from 'vue'
import { defaultModels } from '@/config/models'

export interface AIProvider {
  id: string
  name: string
  description?: string
  fetchModels: () => Promise<AIModel[]>
  chat: (messages: any[], model: string, options?: any) => Promise<AsyncIterable<any>>
}

export interface AIModel {
  id: string
  name: string
  description?: string
  icon?: string
  provider: string  // Add provider field
  pricing?: {
    prompt: string
    completion: string
  }
}

const providers = reactive(new Map<string, AIProvider>())
const activeProvider = ref<AIProvider | null>(null)

export function useAI() {
  const registerProvider = (provider: AIProvider) => {
    console.log('Registering provider', provider)
    providers.set(provider.id, provider)
    // Set as active if first provider or no active provider
    if (!activeProvider.value) {
      activeProvider.value = provider
    }
  }

  const setActiveProvider = (providerId: string) => {
    const provider = providers.get(providerId)
    if (provider) {
      activeProvider.value = provider
    }
  }

  const getDefaultModels = () => defaultModels

  return {
    providers,
    activeProvider,
    registerProvider,
    setActiveProvider,
    getDefaultModels
  }
}
