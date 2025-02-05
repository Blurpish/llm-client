<template>
  <Popover>
    <PopoverTrigger>
      <Button variant="outline" class="border p-1 rounded">
        <Icon :name="displaySortIcon" class="w-4 h-4" />
        <Icon name="lucide:chevron-down" class="w-4 h-4 ml-1" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-32 p-0">
      <div class="space-y-1">
        <div class="p-2 cursor-pointer hover:bg-gray-100 flex items-center" @click="setSortKey('date')">
          <Icon name="lucide:calendar" class="w-4 h-4 mr-2" />
          Date
        </div>
        <div class="p-2 cursor-pointer hover:bg-gray-100 flex items-center" @click="setSortKey('name')">
          <Icon name="lucide:file-text" class="w-4 h-4 mr-2" />
          Name
        </div>
        <div class="p-2 cursor-pointer hover:bg-gray-100 flex items-center" @click="setSortKey('pricing')">
          <Icon name="lucide:circle-dollar-sign" class="w-4 h-4 mr-2" />
          Pricing
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'

const props = defineProps<{ sortKey: string }>()
const emit = defineEmits<{ (e: 'update:sortKey', value: string): void }>()

const localSortKey = ref(props.sortKey)

watch(() => localSortKey.value, newVal => emit('update:sortKey', newVal))
watch(() => props.sortKey, newVal => { localSortKey.value = newVal })

function setSortKey(key: string) {
  localSortKey.value = key
}

// NEW: Computed property to return the correct icon for the current sort key
const displaySortIcon = computed(() => {
  const iconMap: Record<string, string> = {
    date: "lucide:calendar",
    name: "lucide:file-text",
    pricing: "lucide:circle-dollar-sign"
  }
  return iconMap[localSortKey.value] || "lucide:sort"
})
</script>
