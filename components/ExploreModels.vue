<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <!-- Provider chips -->
        <div class="flex gap-2 flex-wrap mb-4">
          <Button
            v-for="provider in enabledProviders"
            :key="provider.id"
            variant="outline"
            size="sm"
            :class="activeProvider?.id === provider.id && 'bg-primary/10'"
            @click="handleProviderClick(provider.id)"
          >
            <Icon name="lucide:server" class="w-4 h-4 mr-2" />
            {{ provider.name }}
          </Button>
        </div>
        <DialogTitle>
          {{ props.editingDefault ? "Select new default model" : "Models from " + (activeProvider?.name || 'Provider') }}
        </DialogTitle>
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

<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAI } from '@/composables/useAI'
import { useUserStore } from '@/stores/user'
import { set } from '@vueuse/core';

const props = defineProps<{ open: boolean; editingDefault?: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'select-model', model: any): void;
}>()

const open = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const { activeProvider, providers, setActiveProvider } = useAI()
const userStore = useUserStore()
const { enabledProviders: enabledProvidersRef } = storeToRefs(useUserStore())

const enabledProviders = computed(() => {
  return Array.from(providers.values()).filter(provider => enabledProvidersRef.value[provider.id])
})

setActiveProvider(enabledProviders.value[0]?.id)

watch(enabledProviders, (newProviders) => {
  if (newProviders.length && (!activeProvider.value || !newProviders.some(p => p.id === activeProvider.value.id))) {
    setActiveProvider(newProviders[0].id)
  }
})

const searchTerm = ref('')
const sortKey = ref('date')
const otherModels = ref<any[]>([])

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
    if (!activeProvider.value) return;
    console.log(activeProvider.value)
    if (activeProvider.value.searchHandler) {
      otherModels.value = await activeProvider.value.searchHandler(searchTerm.value.trim());
    } else {
      if (!userStore.enabledProviders[activeProvider.value.id]) {
        const enabled = enabledProviders.value;
        if (enabled.length) {
          setActiveProvider(enabled[0].id);
          await nextTick();
        }
      }
      otherModels.value = await activeProvider.value.fetchModels();
    }
  } catch (err) {
    console.error('Failed to fetch models:', err);
  }
}

async function handleProviderClick(providerId: string) {
  setActiveProvider(providerId)
  await nextTick()
  fetchOtherModels()
}

watch(() => props.open, (newVal) => {
  if (newVal) fetchOtherModels();
})

watch(searchTerm, () => {
  if (activeProvider.value?.searchHandler) fetchOtherModels();
});

function selectOtherModel(model: any) {
  emit('select-model', model)
  open.value = false
}

onMounted(() => {
  if (open.value) fetchOtherModels();
});
</script>
