export const useUserStore = defineStore('user', () => {
  const openRouterToken = ref('');
  const savedModels = ref([{ id: "openai/gpt-4o-mini", name: "GPT4o-mini", description: 'Fastest model from OpenAI', icon: "lucide:zap" }])
  const selectedModel = ref(savedModels.value[0])

  return {
    openRouterToken,
    savedModels,
    selectedModel,
  }
}, {
  persist: true,
},);
