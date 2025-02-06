import OpenAI from 'openai'
import type { AIProvider, AIModel } from '@/composables/useAI'
import { useUserStore } from '@/stores/user'
import { toast } from 'vue-sonner'

function fetchWithoutXStainlessTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.delete('x-stainless-timeout')
  return fetch(input, { ...init, headers })
}

export class OllamaProvider implements AIProvider {
  id = 'ollama'
  name = 'Ollama'
  description = 'Access local ai models'
  icon = 'simple-icons:ollama' 
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      baseURL: "http://localhost:11434/v1",
      apiKey: '',
      dangerouslyAllowBrowser: true,
      fetch: fetchWithoutXStainlessTimeout,
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

  async disconnect(): Promise<void> {
    console.log('Disconnected from Ollama')
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
      max_completion_tokens: 2000,
      ...options
    })

    for await (const chunk of stream) {
      yield chunk
    }
  }
}

export const ollamaProvider = new OllamaProvider()

// NEW: RemoteOllamaProvider uses P2P messaging (as in db.ts) for remote requests.
export class RemoteOllamaProvider implements AIProvider {
  id = 'remote-ollama'
  name = 'Remote Ollama'
  description = 'Access remote ai models via P2P'
  icon = 'simple-icons:ollama'
  
  // For remote calls no client instance is needed.
  async connect(): Promise<void> { /* no-op */ }
  async disconnect(): Promise<void> { /* no-op */ }
  
  async fetchModels(): Promise<AIModel[]> {
    const peers = useNuxtApp().$getPeers()
    if (peers.length === 0) toast('No peer available for remote ollama');
    if (peers.length === 0) throw new Error('No peer available for remote ollama');
    peers[0].peer.send(JSON.stringify({
      method: 'token',
      data: { type: 'ollama-list-req' }
    }));

    let resolver: ((value: any) => void) | null = null;

    function onMessage(e: MessageEvent) {
      try {
        const message = JSON.parse(e.data);
        if (message.method === 'token' && message.data?.type === 'ollama-list-resp') {
          if (resolver) {
            resolver(message.data.models);
            resolver = null;
          }
        }
      } catch { /* ignore non-JSON messages */ }
    }

    window.addEventListener('message', onMessage);
    try {
      return await new Promise(resolve => resolver = resolve);
    } finally {
      window.removeEventListener('message', onMessage);
    }
  }
  
  async *chat(messages: any[], model: string, threadId: any): AsyncIterable<any> {
    const peers = useNuxtApp().$getPeers()
    if (peers.length === 0) throw new Error('No peer available for remote ollama');
    
    // Add toast to indicate remote request
    toast('Remote Generation', {
      description: 'Sending request to remote Ollama instance...',
      duration: 3000
    })
    
    peers[0].peer.send(JSON.stringify({
      method: 'token',
      data: {
        type: 'ollama-request',
        messages,
        model,
        threadId,
      }
    }));
    
    // Setup an event listener to capture remote tokens.
    const queue: any[] = [];
    let resolver: ((value: any) => void) | null = null;
    
    function onMessage(e: MessageEvent) {
      try {
        const message = JSON.parse(e.data);
        if (
          message.method === 'token' &&
          message.data?.type === 'completionResponse' &&
          message.data.threadId === threadId
        ) {
          if (resolver) {
            resolver(message.data.token);
            resolver = null;
          } else {
            queue.push(message.data.token);
          }
        }
      } catch { /* ignore non-JSON messages */ }
    }
    window.addEventListener('message', onMessage);
    try {
      // Yield tokens as they become available.
      while (true) {
        const token = queue.length > 0 
          ? queue.shift() 
          : await new Promise(resolve => resolver = resolve);
        if (!token) break; // Convention: if token is empty, finish stream.
        yield token;
      }
    } finally {
      window.removeEventListener('message', onMessage);
    }
  }
}
export const remoteOllamaProvider = new RemoteOllamaProvider()

// Register both providers
export default defineNuxtPlugin((nuxtApp) => {
  const { registerProvider } = useAI()
  registerProvider(ollamaProvider)
  registerProvider(remoteOllamaProvider)
})
