<template>
  <Card class="w-full shadow-lg bg-gray-100">
    <div class="flex flex-col space-y-2 p-2">
      <!-- Top row: Input only -->
      <Input id="query-input" type="text" placeholder="Ask me anything" v-model="query" :disabled="pending"
        @keyup.enter="handleSend"
        class="w-full bg-transparent border-none p-1 ![--tw-ring-offset-shadow:0] ![--tw-ring-shadow:0] !shadow-none" />

      <div class="flex items-center justify-between space-x-2">
        <div class="flex justify-between w-full">
          <div class="flex space-x-2">
            <Button @click="handleWebSearch" :disabled="pending" variant="outline" size="icon" class="bg-transparent">
              <Icon name="lucide:globe" class="w-5 h-5" />
            </Button>
            <Button @click="handleFileAttach" :disabled="pending" variant="outline" size="icon" class="bg-transparent">
              <Icon name="lucide:paperclip" class="w-5 h-5" />
            </Button>
            <Popover>
              <PopoverTrigger>
                <Button variant="outline">
                  <Icon :name="userStore.autoModelSelect ? 'lucide:cpu' : getSelectedModelIcon()" class="w-4 h-4 mr-2" />
                  {{ userStore.autoModelSelect ? 'Auto' : selectedModelDisplay }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-56 p-0">
                <div class="space-y-2">
                  <!-- Predefined models section -->
                  <div class="p-2 border-b">
                    <!-- Auto model option -->
                    <div class="flex items-center p-1 hover:bg-gray-100 cursor-pointer"
                         :class="{'bg-gray-100': userStore.autoModelSelect}"
                         @click="selectAuto()">
                      <div class="flex items-center gap-1">
                        <Icon name="lucide:cpu" class="w-4 h-4" />
                        Auto
                      </div>
                    </div>
                    
                    <!-- Predefined models with edit buttons -->
                    <div v-for="(model, key) in userStore.predefinedModels" :key="key"
                         class="flex items-center justify-between hover:bg-gray-100 cursor-pointer p-1"
                         :class="{'bg-gray-100': !userStore.autoModelSelect && userStore.selectedModel.id === model.id}">
                      <div class="flex items-center gap-1 flex-grow"
                           @click="selectPredefinedModel(model)">
                        <Icon :name="getModelIcon(key)" class="w-4 h-4" />
                        <div class="flex flex-col">
                          <span class="font-medium">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</span>
                          <span class="text-xs text-gray-500 truncate max-w-[120px]">{{ model.name }}</span>
                        </div>
                      </div>
                      <Button @click.stop="openEditDialog(key, model)" 
                             size="icon" 
                             variant="ghost" 
                             class="bg-transparent">
                        <Icon name="lucide:edit" class="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <!-- Custom saved models -->
                  <div v-for="model in customSavedModels" :key="model.id" class="flex items-center justify-between">
                    <div class="flex items-center gap-1 p-2 hover:bg-gray-100 cursor-pointer w-full"
                      @click="userStore.selectedModel = model">
                      <Icon :name="model.icon" class="w-4 h-4" />
                      {{ model.name }}
                    </div>
                    <Button @click="removeSavedModel(model)" size="icon" variant="ghost" class="bg-transparent">
                      <Icon name="lucide:x" class="w-4 h-4" />
                    </Button>
                  </div>
                  <!-- Explore more models button -->
                  <div class="p-2 border-t">
                    <button class="w-full text-sm text-center" type="button" @click="openRouterDialog = true">
                      Explore more models
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button @click="handleSend" size="icon"
            :disabled="!query.trim() || pending">
            <Icon name="lucide:send" class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </Card>
  <Dialog v-model:open="openRouterDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Other Models from OpenRouter</DialogTitle>
        <DialogDescription>
          Select a model from the list below.
        </DialogDescription>
      </DialogHeader>
      <!-- Replace previous sort button and search input with a flex container -->
      <div class="flex mb-2 items-center">
        <input type="text" v-model="searchTerm" placeholder="Search models" class="border p-2 w-full" />
        <Popover class="ml-2">
          <PopoverTrigger>
            <Button variant="outline" size="icon" class="bg-transparent">
              <Icon name="lucide:list-ordered" class="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="p-2">
            <div class="flex flex-col">
              <button @click="sortKey = 'name'" class="text-sm py-1 text-left">Name</button>
              <button @click="sortKey = 'pricing'" class="text-sm py-1 text-left">Pricing</button>
              <button @click="sortKey = 'date'" class="text-sm py-1 text-left">Date</button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <!-- The v-for now uses sortedOtherModels instead -->
      <div class="space-y-2 max-h-60 overflow-auto">
        <div v-for="model in sortedOtherModels" :key="model.id" class="p-2 border rounded cursor-pointer"
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
        <button type="button" @click="openRouterDialog = false" class="mt-4">
          Close
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Add new edit model dialog -->
  <Dialog v-model:open="editModelDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit {{ editingModel.type }} Model</DialogTitle>
      </DialogHeader>
      <!-- Add search and sort -->
      <div class="flex mb-2 items-center">
        <input type="text" v-model="searchTerm" placeholder="Search models" class="border p-2 w-full" />
        <Popover class="ml-2">
          <PopoverTrigger>
            <Button variant="outline" size="icon" class="bg-transparent">
              <Icon name="lucide:list-ordered" class="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="p-2">
            <div class="flex flex-col">
              <button @click="sortKey = 'name'" class="text-sm py-1 text-left">Name</button>
              <button @click="sortKey = 'pricing'" class="text-sm py-1 text-left">Pricing</button>
              <button @click="sortKey = 'date'" class="text-sm py-1 text-left">Date</button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <!-- Model list -->
      <div class="space-y-2 max-h-60 overflow-auto">
        <div v-for="model in sortedOtherModels" :key="model.id" 
             class="p-2 border rounded cursor-pointer hover:bg-gray-50"
             @click="selectModelToEdit(model)">
          <div class="font-semibold flex items-center gap-1">
            <Icon :name="model.icon" class="w-4 h-4" />
            {{ model.name }}
          </div>
          <div class="text-xs text-gray-600">
            Pricing: ${{ computePricing(model.pricing) }} per 1M tokens
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ pending: boolean }>()
const emit = defineEmits<{ (e: 'send', payload: { text: string, model: string }): void }>()

const query = ref("")
const userStore = useUserStore()

// Dialog and extended models state (from header.vue)
const openRouterDialog = ref(false)
const otherModels = ref<Array<any>>([])
const searchTerm = ref('')

// Retain reactive sortKey
const sortKey = ref("date")

// Computed property sorting models based on searchTerm and sortKey remains unchanged:
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

// Compute filtered models based on search term
const filteredOtherModels = computed(() =>
  otherModels.value.filter(model =>
    (model.name || "").toLowerCase().includes(searchTerm.value.toLowerCase())
  )
)

// Compute pricing per 1M tokens with fallback
function computePricing(pricing: { prompt: string, completion: string }): string {
  if (!pricing || !pricing.prompt || !pricing.completion) return "N/A";
  const price = (Number(pricing.prompt) + Number(pricing.completion)) * 1e6;
  return price.toFixed(2);
}

// Select a model from the dialog: add it to models if new, set as selected, close dialog.
function selectOtherModel(model: any) {
  const exists = userStore.savedModels.find((m: any) => m.id === model.id)
  if (!exists) {
    userStore.savedModels.push({
      id: model.id,
      name: model.name,
      description: model.description,
      icon: model.icon || 'lucide:box'
    })
  }
  userStore.selectedModel = model;
  openRouterDialog.value = false;
}

function removeSavedModel(model: any) {
  const index = userStore.savedModels.findIndex((m: any) => m.id === model.id)
  if (index > -1) {
    userStore.savedModels.splice(index, 1)
    if (userStore.selectedModel === model) {
      userStore.selectedModel = userStore.savedModels[0] || ""
    }
  }
}

// Fetch external models from API and update otherModels with pricing info.
async function fetchOtherModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const json = await res.json();
    json.data.forEach((model: any) => {
      if (model.pricing) {
        // Ensure pricing is available on the model
        model.pricing = model.pricing;
      }
      // Fallback for icon to prevent undefined errors in Icon component
      model.icon = model.icon || 'lucide:box';
    });
    otherModels.value = json.data;
  } catch (err) {
    console.error('Failed to fetch models:', err);
  }
}

onMounted(() => {
  fetchOtherModels();
})

function handleSend() {
  if (!query.value.trim()) return
  emit("send", { text: query.value })
  query.value = ""
}

function handleWebSearch() {
  // Placeholder: implement web search feature
  console.log("Web search triggered")
}

function handleFileAttach() {
  // Placeholder: implement file attachment feature
  console.log("File attach triggered")
}

// Computed property for custom saved models (excluding predefined ones)
const customSavedModels = computed(() => 
  userStore.savedModels.filter(model => 
    !Object.values(userStore.predefinedModels).some(pm => pm.id === model.id)
  )
);

const editModelDialog = ref(false)
const editingModel = ref<{ type: string; data: any }>({ type: '', data: {} })

function openEditDialog(type: string, model: any) {
  editingModel.value = { 
    type,
    data: { ...model }
  }
  editModelDialog.value = true
}

function selectModelToEdit(model: any) {
  saveModelEdit(model);
  editModelDialog.value = false;
}

// Update saveModelEdit to take model as parameter
function saveModelEdit(model: any) {
  userStore.updatePredefinedModel(
    editingModel.value.type as 'mini' | 'base' | 'max',
    {
      id: model.id,
      name: model.name,
      description: model.description,
      icon: model.icon || 'lucide:box'
    }
  );
}

function selectAuto() {
  userStore.autoModelSelect = true
  userStore.selectedModel = userStore.predefinedModels.base
}

function selectPredefinedModel(model: any) {
  userStore.autoModelSelect = false
  userStore.selectedModel = model
}

// Add computed property for selected model display
const selectedModelDisplay = computed(() => {
  const model = userStore.selectedModel
  // Check if it's one of the predefined models
  for (const [key, value] of Object.entries(userStore.predefinedModels)) {
    if (value.id === model.id) {
      return key.charAt(0).toUpperCase() + key.slice(1)
    }
  }
  // If not predefined, return full name
  return model.name
})

function getModelIcon(type: string): string {
  const icons = {
    mini: "lucide:zap",
    base: "lucide:bot",
    max: "lucide:brain"
  };
  return icons[type as keyof typeof icons] || "lucide:box";
}

function getSelectedModelIcon(): string {
  const model = userStore.selectedModel;
  // Check if it's one of the predefined models
  for (const [key, value] of Object.entries(userStore.predefinedModels)) {
    if (value.id === model.id) {
      return getModelIcon(key);
    }
  }
  // If not predefined, return model's icon or default
  return model.icon || 'lucide:box';
}

</script>
