<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAI } from '@/composables/useAI'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'select-model', model: any): void;
}>()

const open = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const { activeProvider, providers, setActiveProvider } = useAI()
const searchTerm = ref('')
const sortKey = ref('date')
const otherModels = ref<any[]>([])

const providersList = computed(() => Array.from(providers.values()))

const sortedOtherModels = computed(() => {
  let filtered = otherModels.value.filter(model =>
    (model.name || "").toLowerCase().includes(searchTerm.value.toLowerCase())
  )
  if (sortKey.value === "pricing") {
    filtered.sort((a, b) => {
      const priceA = (a.pricing && a.pricing.prompt && a.pricing.completion)
        ? Number(a.pricing.prompt) + Number(a.pricing.completion)
        : Number.MAX_VALUE
      const priceB = (b.pricing && b.pricing.prompt && b.pricing.completion)
        ? Number(b.pricing.prompt) + Number(b.pricing.completion)
        : Number.MAX_VALUE
      return priceA - priceB
    })
  } else if (sortKey.value === "date") {
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } else {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  }
  return filtered
})

function computePricing(pricing: { prompt: string, completion: string }): string {
  if (!pricing || !pricing.prompt || !pricing.completion) return "N/A";
  const price = (Number(pricing.prompt) + Number(pricing.completion)) * 1e6;
  return price.toFixed(2);
}

async function fetchOtherModels() {
  try {
    if (!activeProvider.value) return
    otherModels.value = await activeProvider.value.fetchModels()
  } catch (err) {
    console.error('Failed to fetch models:', err);
  }
}

watch(() => props.open, (newVal) => {
  if (newVal) fetchOtherModels();
});

function changeProvider(provider: any) {
  setActiveProvider(provider.id)
  fetchOtherModels()
}

function selectOtherModel(model: any) {
  emit('select-model', model)
  open.value = false
}

onMounted(() => {
  if (open.value) fetchOtherModels();
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <!-- Provider chips -->
        <div class="flex gap-2 flex-wrap mb-4">
          <Button
            v-for="provider in providersList"
            :key="provider.id"
            variant="outline"
            size="sm"
            :class="activeProvider?.id === provider.id && 'bg-primary/10'"
            @click="changeProvider(provider)"
          >
            <Icon name="lucide:server" class="w-4 h-4 mr-2" />
            {{ provider.name }}
          </Button>
        </div>
        <DialogTitle>Models from {{ activeProvider?.name || 'Provider' }}</DialogTitle>
        <DialogDescription>
          Select a model from the list below.
        </DialogDescription>
      </DialogHeader>

      <div class="flex mb-2 items-center">
        <input type="text" v-model="searchTerm" placeholder="Search models" class="border p-2 w-full" />
        <ModelSorter v-model:sort-key="sortKey" />
      </div>

      <div class="space-y-2 max-h-60 overflow-auto">
        <div v-for="model in sortedOtherModels" :key="model.id" 
             class="p-2 border rounded cursor-pointer"
             @click="selectOtherModel(model)">
          <div class="font-semibold flex items-center gap-1">
            <Icon :name="model.icon" class="w-4 h-4" />
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
        <Button variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
