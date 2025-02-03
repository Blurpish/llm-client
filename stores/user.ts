export const useUserStore = defineStore('user', () => {
  const openRouterToken = ref('');
  
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

  // NEW: Provider settings for multi-provider support
  const titleProvider = ref('openrouter');         // Provider to use for title generation
  const completionProvider = ref('openrouter');      // Provider to use for completions
  const enabledProviders = ref({                     // Enable/disable providers
    openrouter: true,
    ollama: true,
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
    savedModels,
    selectedModel,
    autoModelSelect,
    predefinedModels,
    updatePredefinedModel,
    currentMask,
    enabledProviders      
  }
}, {
  persist: true,
});
