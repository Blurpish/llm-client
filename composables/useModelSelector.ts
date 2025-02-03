import { ref } from 'vue'

const models = ref([
  { name: "GPT-3.5 Turbo", id: "openai/gpt-3.5-turbo", icon: "lucide:bot" },
  { name: "GPT-4", id: "gpt-4", icon: "lucide:star" }
])

const selectedModel = ref(models.value[0].id)

function getModelIcon(modelId: string): string {
  const model = models.value.find(m => m.id === modelId)
  return model ? model.icon : ''
}

function getModelName(modelId: string): string {
  const model = models.value.find(m => m.id === modelId)
  return model ? model.name : ''
}

export function useModelSelector() {
  return { models, selectedModel, getModelIcon, getModelName }
}
