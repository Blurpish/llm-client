<template>
  <div class="flex items-center p-4">
    <Select v-model="selectedModel">
      <SelectTrigger class="w-[180px]">
        <span class="truncate flex items-center gap-1">
          <Icon :name="getModelIcon(selectedModel)" class="w-4 h-4" />
          {{ getModelName(selectedModel) }}
        </span>
      </SelectTrigger>
      <SelectContent>
        <!-- Suggested models -->
        <SelectItem v-for="model in suggestedModels" :key="model.id" :value="model.id">
          <div>
            <div class="font-semibold flex items-center gap-1">
              <Icon :name="model.icon" class="w-4 h-4" />
              {{ model.name }}
            </div>
            <div class="text-xs text-gray-500">{{ model.description }}</div>
            <div class="text-xs text-gray-600">
              Pricing: ${{ computePricing(getPricing(model.id)) }} per 1M tokens
            </div>
          </div>
        </SelectItem>
        <!-- Explore more models button -->
        <div class="p-2 border-t mt-2">
          <button class="w-full text-sm text-center" type="button" @click="openRouterDialog = true">
            Explore more models
          </button>
        </div>
      </SelectContent>
    </Select>
  </div>

  <!-- Dialog for other models -->
  <Dialog v-model:open="openRouterDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Other Models from OpenRouter</DialogTitle>
        <DialogDescription>
          Select a model from the list below.
        </DialogDescription>
      </DialogHeader>
      <!-- Search input for filtering models -->
      <input type="text" v-model="searchTerm" placeholder="Search models" class="border p-2 w-full mb-2"/>
      <div class="space-y-2 max-h-60 overflow-auto">
        <div 
          v-for="model in filteredOtherModels" 
          :key="model.id" 
          class="p-2 border rounded cursor-pointer" 
          @click="selectOtherModel(model)"
        >
          <div class="font-semibold">
            {{ model.name }}
          </div>
          <div class="text-xs text-gray-500">
            {{ model.description || 'No description' }}
          </div>
          <div class="text-xs text-gray-600">
            Pricing: ${{ computePricing(model.pricing) }} per 1M tokens
          </div>
        </div>
      </div>
      <DialogFooter>
        <button type="button" @click="openRouterDialog = false" class="mt-4">
          Close
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// Selected model setup
const selectedModel = ref('nousresearch/hermes-2-pro-llama-3-8b')

// Change suggestedModels to a reactive ref
const suggestedModels = ref([
  {
    name: "Hermes-2 Pro Llama 3 8B",
    description: "A very cheap and fast language model for general-purpose tasks",
    id: "nousresearch/hermes-2-pro-llama-3-8b",
    icon: "lucide:bot"
  },
  {
    name: "4o",
    description: "The latest and greatest model from OpenAI",
    id: "openai/gpt-4o",
    icon: "lucide:pen"
  },
  {
    name: "4o-mini",
    description: "A smaller version of the GPT-4o model, cheaper than 4o",
    id: "openai/gpt-4o-mini",
    icon: "lucide:zap"
  },
  {
    name: "o3-mini",
    description: "A cost-efficient language model optimized for STEM reasoning tasks",
    id: "openai/gpt-o3-mini",
    icon: "lucide:lightbulb"
  },
  {
    name: "R1",
    description: "DeepSeek's latest reasoning model",
    id: "deepseek/r1",
    icon: "lucide:brain"
  }
])

// Reactive mapping for pricing details fetched from API
const pricingMapping = ref<Record<string, { prompt: string; completion: string }>>({})

// Helper to compute pricing per 1M tokens
function computePricing(pricing: { prompt: string, completion: string }): string {
  const price = (Number(pricing.prompt) + Number(pricing.completion)) * 1e6;
  return price.toFixed(2);
}

// Returns pricing from mapping, or a default if not available
function getPricing(modelId: string): { prompt: string, completion: string } {
  return pricingMapping.value[modelId] ?? { prompt: "0", completion: "0" };
}

// Helpers to get selected model details from suggestedModels or API list
function getModelIcon(modelId: string): string {
  const model = suggestedModels.value.find(m => m.id === modelId) || otherModels.value.find(m => m.id === modelId);
  return model ? model.icon : '';
}
function getModelName(modelId: string): string {
  const model = suggestedModels.value.find(m => m.id === modelId) || otherModels.value.find(m => m.id === modelId);
  return model ? model.name : '';
}

// For dialog & openrouter models
const openRouterDialog = ref(false)
const otherModels = ref<Array<any>>([])

// New search term for filtering models
const searchTerm = ref('')

// Computed filtered models based on searchTerm
const filteredOtherModels = computed(() =>
  otherModels.value.filter(model =>
    model.name.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
)

// New function: on clicking a model card, add model to suggestedModels (if not present), set selectedModel, and close dialog
function selectOtherModel(model: any) {
  if (!suggestedModels.value.find(m => m.id === model.id)) {
    suggestedModels.value.push({
      name: model.name,
      description: model.description,
      id: model.id,
      icon: model.icon || 'lucide:box'
    });
  }
  selectedModel.value = model.id;
  openRouterDialog.value = false;
}

async function fetchOtherModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const json = await res.json();
    // Update pricingMapping from API response
    json.data.forEach((model: any) => {
      if (model.pricing) {
        pricingMapping.value[model.id] = model.pricing;
      }
    });
    otherModels.value = json.data;
  } catch (err) {
    console.error('Failed to fetch models:', err);
  }
}

// Fetch pricing data on mount for suggestedModels and others
onMounted(() => {
  fetchOtherModels();
});
</script>
