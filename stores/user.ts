export const useUserStore = defineStore('user', () => {
  const openRouterToken = ref('');
  const huggingfaceToken = ref(''); // NEW: HuggingFace token
  
  const predefinedModels = ref({
    mini: { id: "openai/gpt-4o-mini", name: "Mini", provider: "openrouter", description: 'Fast model for simple tasks', icon: "lucide:zap" },
    base: { id: "anthropic/claude-2.1", name: "Base", provider: "openrouter", description: 'Balanced model for most tasks', icon: "lucide:bot" },
    max: { id: "openai/gpt-4", name: "Max", provider: "openrouter", description: 'Advanced model for complex tasks', icon: "lucide:brain" }
  });

  const savedModels = ref([
    predefinedModels.value.mini,
    predefinedModels.value.base,
    predefinedModels.value.max
  ]);
  
  const selectedModel = ref(predefinedModels.value.base);
  const autoModelSelect = ref(false);
  const currentMask = ref<any>(null);
  const titleModel = {
    id: 'meta-llama/llama-3.2-3b-instruct',
    provider: 'openrouter',
  }

  // NEW: Provider settings for multi-provider support
  const enabledProviders = ref({
    openrouter: false,
    ollama: false,
    huggingface: false,
  });

  function updatePredefinedModel(type: 'mini' | 'base' | 'max', model: any) {
    predefinedModels.value[type] = { ...model };
    // Update saved models to reflect changes
    savedModels.value = [
      predefinedModels.value.mini,
      predefinedModels.value.base,
      predefinedModels.value.max,
      ...savedModels.value.filter(m => 
        !Object.values(predefinedModels.value).some(pm => pm.id === m.id)
      )
    ];
  }

  return {
    openRouterToken,
    huggingfaceToken, // NEW: expose the HuggingFace token
    savedModels,
    selectedModel,
    autoModelSelect,
    predefinedModels,
    updatePredefinedModel,
    currentMask,
    enabledProviders,
    titleModel,
  }
}, {
  persist: true,
});
