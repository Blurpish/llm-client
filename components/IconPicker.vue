<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { DialogTitle } from '@/components/ui/dialog'

const props = defineProps<{
  modelValue: string,
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const searchQuery = ref('')
const showDialog = ref(false)
const icons = ref<string[]>([])
const displayedIcons = ref<string[]>([])
const isLoading = ref(false)
const pageSize = 100
const currentPage = ref(0)
const loadingMore = ref(false)

const filteredIcons = computed(() => {
  if (!searchQuery.value) return icons.value
  return icons.value.filter(icon => 
    icon.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const loadMoreIcons = () => {
  if (loadingMore.value) return

  loadingMore.value = true
  const start = currentPage.value * pageSize
  const newIcons = filteredIcons.value.slice(start, start + pageSize)
  displayedIcons.value = [...displayedIcons.value, ...newIcons]
  currentPage.value++
  loadingMore.value = false
}

const observerTarget = ref<HTMLElement | null>(null)
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && displayedIcons.value.length < filteredIcons.value.length) {
      loadMoreIcons()
    }
  },
  { threshold: 0.5 }
)

const ICONS_URL = 'https://raw.githubusercontent.com/iconify/icon-sets/refs/heads/master/json/lucide.json'

onMounted(async () => {
  isLoading.value = true
  try {
    const response = await fetch(ICONS_URL)
    const data = await response.json()
    icons.value = Object.keys(data.icons)
    displayedIcons.value = icons.value.slice(0, pageSize)
  } catch (error) {
    console.error('Failed to load icons:', error)
  }
  isLoading.value = false
  
  if (observerTarget.value) {
    observer.observe(observerTarget.value)
  }
})

watch(searchQuery, () => {
  currentPage.value = 0
  displayedIcons.value = filteredIcons.value.slice(0, pageSize)
})

onUnmounted(() => {
  observer.disconnect()
})
</script>

<template>
  <div>
    <Button variant="outline" @click="showDialog = true" class="w-full flex items-center gap-2 justify-start">
      <Icon v-if="modelValue" :name="'lucide:' + modelValue" class="w-5 h-5" />
      <Icon v-else name="lucide:smile" class="w-5 h-5" />
      <span>{{ modelValue || placeholder || 'Select an icon' }}</span>
    </Button>

    <ResponsiveDialog v-model:open="showDialog">
      <template #header>
        <DialogTitle>Select an icon</DialogTitle>
      </template>
      
      <template #content>
        <div class="sticky top-0 bg-white z-10 mb-4">
          <Input 
            v-model="searchQuery" 
            placeholder="Search icons..."
            class="w-full"
          />
        </div>

        <div class="h-[60vh] overflow-y-auto">
          <div v-if="isLoading" class="p-4 text-center text-gray-500">
            Loading icons...
          </div>

          <div v-else-if="displayedIcons.length === 0" class="p-4 text-center text-gray-500">
            No icons found
          </div>

          <div v-else class="grid grid-cols-8 gap-2">
            <button
              v-for="icon in displayedIcons"
              :key="icon"
              @click="() => { emit('update:modelValue', icon); showDialog = false }"
              class="aspect-square rounded-lg flex items-center justify-center hover:bg-gray-100"
              :class="modelValue === icon ? 'bg-gray-100' : ''"
            >
              <Icon :name="'lucide:' + icon" class="w-5 h-5" />
            </button>

            <div ref="observerTarget" class="col-span-8 h-4" />
          </div>
        </div>
      </template>
    </ResponsiveDialog>
  </div>
</template>
