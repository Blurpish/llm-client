<template>
  <div class="flex flex-col gap-2 w-full">
    <!-- Mask selector chips -->
    <div class="flex gap-2 flex-wrap">
      <Button 
        variant="outline" 
        size="sm"
        :class="!userStore.currentMask && 'bg-primary/10'"
        @click="selectMask(null)"
      >
        <Icon name="lucide:bot" class="w-4 h-4 mr-2" />
        Default
      </Button>
      <Button
        v-for="mask in masks"
        :key="mask.id"
        variant="outline"
        size="sm"
        :class="userStore.currentMask?.id === mask.id && 'bg-primary/10'"
        @click="selectMask(mask)"
      >
        <Icon :name="'lucide:' + (mask.icon || 'user')" class="w-4 h-4 mr-2" />
        {{ mask.name }}
      </Button>
    </div>

    <Card class="w-full shadow-lg bg-gray-100">
      <div class="flex flex-col space-y-2 p-2">
        <!-- Top row: Input only -->
        <Textarea id="query-input" type="text" placeholder="Ask me anything" v-model="query" :disabled="pending"
          @keyup.enter="handleSend($event)" autocomplete="off"
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
              <ModelSelector @update:model="userStore.selectedModel = $event" />
            </div>
            <Button @click="handleSend" size="icon"
              :disabled="!query.trim() || pending">
              <Icon name="lucide:send" class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import ModelSelector from './ModelSelector.vue'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = defineProps<{ pending: boolean }>()
const emit = defineEmits<{ (e: 'send', payload: { text: string, model: string }): void }>()

const query = ref("")
const userStore = useUserStore()

function handleSend(e: KeyboardEvent) {
  if (e.shiftKey) return
  if (!query.value.trim()) return
  emit("send", { text: query.value, model: userStore.selectedModel.id })
  query.value = ""
}

function handleWebSearch() {
  console.log("Web search triggered")
}

function handleFileAttach() {
  console.log("File attach triggered")
}

const masks = ref([])
// Remove selectedMask ref since we're using store

onMounted(async () => {
  const db = (globalThis as any).database
  const allMasks = await db.masks.find().exec()
  masks.value = allMasks.map(doc => doc.toJSON())

  db.masks.$.subscribe(() => {
    db.masks.find().exec().then((docs: any) => {
      masks.value = docs.map((doc: any) => doc.toJSON())
    })
  })
})

function selectMask(mask: any) {
  userStore.currentMask = mask
}
</script>
