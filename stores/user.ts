export const useUserStore = defineStore('user', () => {
  const openRouterToken = ref('');
  
  const predefinedModels = ref({
    mini: { id: "openai/gpt-4o-mini", name: "Mini", description: 'Fast model for simple tasks', icon: "lucide:zap" },
    base: { id: "anthropic/claude-2.1", name: "Base", description: 'Balanced model for most tasks', icon: "lucide:bot" },
    max: { id: "openai/gpt-4", name: "Max", description: 'Advanced model for complex tasks', icon: "lucide:brain" }
  });

  const savedModels = ref([
    predefinedModels.value.mini,
    predefinedModels.value.base,
    predefinedModels.value.max
  ]);
  
  const selectedModel = ref(predefinedModels.value.base);
  const autoModelSelect = ref(false);
  const currentMask = ref<any>(null);

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
    currentMask
  }
}, {
  persist: true,
});
