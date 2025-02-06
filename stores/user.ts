import { toast } from 'vue-sonner'

export const useUserStore = defineStore('user', () => {
  const openRouterToken = ref('');
  const huggingfaceToken = ref('');
  const accountId = ref('');
  
  const device = ref({ id: '', name: '', icon: '', capabilities: [] });
  
  const defaultModels = ref({
    mini: { id: "google/gemini-2.0-flash-lite-preview", name: "Google: Gemini Flash Lite 2.0", provider: "openrouter", description: 'Fast model for simple tasks', icon: "lucide:zap" },
    base: { id: "google/gemini-2.0-flash", name: "Google: Gemini Flash 2.0", provider: "openrouter", description: 'Balanced model for most tasks', icon: "lucide:bot" },
    max: { id: "deepseek/r1", name: "DeepSeek: R1", provider: "openrouter", description: 'Advanced model for complex tasks', icon: "lucide:brain" }
  });

  const savedModels = ref([]);

  const selectedModel = ref(defaultModels.value.base);
  const autoModelSelect = ref(false);
  const currentMask = ref<any>(null);
  const titleModel = {
    id: 'meta-llama/llama-3.2-3b-instruct',
    provider: 'openrouter',
  }

  const providers = ref({
    openrouter: false,
    ollama: false,
    huggingface: false,
  });

  const onboardingMode = ref<'new' | 'sync'>('new');

  const useServerSync = ref(false);

  function updateDefaultModel(type: 'mini' | 'base' | 'max', model: any) {
    defaultModels.value[type] = model;
  }

  function generateAccountId() {
    accountId.value = 'user-' + Math.random().toString(36).substr(2, 9);
    toast('New account created', { description: accountId.value });
  }
  
  function createDevice(name: string, icon: string, canServeOllama: boolean = false) {
    device.value = {
      id: 'device-' + Math.random().toString(36).substr(2, 9),
      name,
      icon,
      capabilities: canServeOllama ? ['ollama-serve'] : [],
    };
    toast('New device created', { description: `${name} (${icon})` });
  }

  return {
    openRouterToken,
    huggingfaceToken,
    savedModels,
    defaultModels,
    selectedModel,
    autoModelSelect,
    updateDefaultModel,
    currentMask,
    providers,
    titleModel,
    onboardingMode,
    useServerSync,
    accountId,
    generateAccountId,
    device,
    createDevice,
  }
}, {
  persist: true,
});
