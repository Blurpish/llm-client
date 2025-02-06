import { ref, reactive } from 'vue'
import { defaultModels } from '@/config/models'
import { toast } from 'vue-sonner'

export interface AIProvider {
  id: string
  name: string
  description?: string
  icon?: string
  fetchModels: () => Promise<AIModel[]>
  chat: (messages: any[], model: string, options?: any) => AsyncIterable<any>
  connect: () => Promise<void>
  disconnect?: () => Promise<void>
  config?: { apiKey?: string }
  searchHandler?: (query: string) => Promise<AIModel[]>
}

export interface AIModel {
  id: string
  name: string
  description?: string
  icon?: string
  provider: string
  pricing?: {
    prompt: string
    completion: string
  }
}

const availableProviders = reactive(new Map<string, AIProvider>())
const activeProvider = ref<AIProvider | null>(null)

export function useAI() {
  const registerProvider = (provider: AIProvider) => {
    console.log('Registering provider', provider)
    availableProviders.set(provider.id, provider)
    // Set as active if first provider or no active provider
    if (!activeProvider.value) {
      activeProvider.value = provider
    }
  }

  const setActiveProvider = (providerId: string) => {
    const provider = availableProviders.get(providerId)
    if (provider) {
      activeProvider.value = provider
    }
  }

  const connectProvider = async (providerId: string): Promise<void> => {
    const provider = availableProviders.get(providerId)
    if (provider && provider.connect) {
      await provider.connect()
      toast(`Connected to ${provider.name}`, { description: 'Connection successful' })
      useUserStore().providers[provider.id] = true
      return Promise.resolve()
    } else {
      toast(`Provider ${providerId} does not implement connect method`)
    }
  }

  const disconnectProvider = async (providerId: string): Promise<void> => {
    const provider = availableProviders.get(providerId)
    if (provider && provider.disconnect) {
      await provider.disconnect()
      toast(`Disconnected from ${provider.name}`, { description: 'Disconnected successfully' })
      useUserStore().providers[provider.id] = false
      return Promise.resolve()
    } else {
      toast(`Provider ${providerId} does not implement disconnect method`)
    }
  }

  const getDefaultModels = () => defaultModels

  return {
    availableProviders,
    activeProvider,
    registerProvider,
    setActiveProvider,
    getDefaultModels,
    connectProvider,
    disconnectProvider
  }
}
