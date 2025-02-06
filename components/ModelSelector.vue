<template>
  <div>
    <Popover>
      <PopoverTrigger>
        <Button variant="outline">
          <Icon :name="userStore.autoModelSelect ? 'lucide:cpu' : getSelectedModelIcon()" class="w-4 h-4 mr-2" />
          {{ userStore.autoModelSelect ? 'Auto' : selectedModelDisplay }}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-56 p-0">
        <div class="space-y-2">
          <div class="p-2 border-b">
            <!-- Auto selection -->
            <div class="flex items-center group p-1 hover:bg-gray-100 cursor-pointer"
                :class="{'bg-gray-100': userStore.autoModelSelect}"
                @click="selectAuto()">
              <div class="flex items-center gap-1">
                <Icon name="lucide:cpu" class="w-4 h-4" />
                Auto
              </div>
            </div>
            <!-- Predefined models -->
            <div v-for="(model, key) in userStore.defaultModels" :key="key"
                class="flex items-center group hover:bg-gray-100 cursor-pointer p-1"
                :class="{'bg-gray-100': !userStore.autoModelSelect && userStore.selectedModel.id === model.id}">
              <div class="flex items-center gap-1 flex-grow"
                  @click="selectPredefinedModel(model)">
                <Icon :name="getModelIcon(key)" class="w-4 h-4" />
                <div class="flex flex-col">
                  <span class="font-medium">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</span>
                  <span class="text-xs text-gray-500 truncate max-w-[120px]">{{ model.name }}</span>
                </div>
              </div>
              <!-- Edit button on right; visible on hover -->
              <Button @click.stop="editDefault(key, model)" size="icon" variant="ghost" class="invisible group-hover:visible">
                <Icon name="lucide:edit" class="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div v-for="model in userStore.savedModels" v-if="userStore.savedModels.length > 0" :key="model.id" class="flex items-center justify-between">
            <div class="flex items-center gap-1 p-2 hover:bg-gray-100 cursor-pointer w-full"
              @click="selectCustomModel(model)">
              <Icon :name="model.icon" class="w-4 h-4" />
              {{ model.name }}
            </div>
            <Button @click="removeSavedModel(model)" size="icon" variant="ghost" class="bg-transparent">
              <Icon name="lucide:x" class="w-4 h-4" />
            </Button>
          </div>
          <div class="p-2 border-t">
            <button class="w-full text-sm text-center" type="button" @click="exploreModelsOpen = true">
              Explore more models
            </button>
          </div>
          <!-- Removed previous Edit Defaults button -->
        </div>
      </PopoverContent>
    </Popover>

    <!-- Pass 'editingDefault' flag when editing a default -->
    <ExploreModels :open="exploreModelsOpen" :editingDefault="!!editDefaultKey" @update:open="exploreModelsOpen = $event" @select-model="selectOtherModel" />
  </div>
</template>

<script lang="ts" setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const exploreModelsOpen = ref(false)
const editDefaultKey = ref<string | null>(null)

function selectOtherModel(model: any) {
  console.log(model)
  if (editDefaultKey.value) {
    userStore.updateDefaultModel(editDefaultKey.value, model)
    editDefaultKey.value = null
  } else {
    const exists = userStore.savedModels.find((m: any) => m.id === model.id)
    if (!exists) {
      userStore.savedModels.push({
        id: model.id,
        name: model.name,
        description: model.description,
        icon: model.icon || 'lucide:box',
        provider: model.provider
      })
    }
  }
  userStore.selectedModel = model;
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

// Emit selected model changes
const emit = defineEmits<{
  (e: 'update:model', value: any): void
}>()

function selectPredefinedModel(model: any) {
  userStore.autoModelSelect = false
  userStore.selectedModel = model
  emit('update:model', model)
}

// Add new function for custom saved models with debugging logs
function selectCustomModel(model: any) {
  console.log("selectCustomModel triggered", model);
  userStore.autoModelSelect = false;
  userStore.selectedModel = model;
  emit('update:model', model);
  console.log("Model updated to", userStore.selectedModel);
}

function selectAuto() {
  userStore.autoModelSelect = true
  userStore.selectedModel = userStore.defaultModels.base
}

const selectedModelDisplay = computed(() => {
  const model = userStore.selectedModel
  for (const [key, value] of Object.entries(userStore.defaultModels)) {
    if (value.id === model.id) {
      return key.charAt(0).toUpperCase() + key.slice(1)
    }
  }
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
  for (const [key, value] of Object.entries(userStore.defaultModels)) {
    if (value.id === model.id) {
      return getModelIcon(key);
    }
  }
  return model.icon || 'lucide:box';
}

function editDefault(key: string, model: any) {
  editDefaultKey.value = key
  exploreModelsOpen.value = true
}
</script>
