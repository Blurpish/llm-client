<template>
  <div class="flex flex-col h-full items-center justify-center w-[48rem] max-w-full mx-auto gap-2 px-8">
    <h1 class="text-4xl font-bold mb-4">Welcome to LLM Client</h1>
      <ChatInput :pending="false" @send="createThread" />
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Reactive state
const message = ref("")
const router = useRouter()

onMounted(async () => {
  // Check database.userId rather than localStorage
  const db = (globalThis as any).database;
  if (!db || !db.userId) {
    router.push('/setup')
  }
})

// Create new thread and delegate message processing to thread/[id].vue
async function createThread(messageData) {
  const id = Date.now().toString()
  router.push(`/thread/${id}?initialMessage=${messageData.text}`);
  message.value = ""
}
</script>
