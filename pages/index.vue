<template>
  <div id="container">
   <div id="new-thread-form">
      <Input type="text" v-model="message" placeholder="Type your message" />
      <Button @click="createThread">Send</Button>
    </div>
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
    router.push('/accountSetup')
  }
})

// Create new thread and delegate message processing to thread/[id].vue
async function createThread() {
  if (!message.value.trim()) return;
  const id = Date.now().toString()
  router.push(`/thread/${id}?initialMessage=${encodeURIComponent(message.value.trim())}`)
  message.value = ""
}
</script>

<style scoped>
#container {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background: #fff;
}
#menu-bar {
  position: absolute;
  top: 16px;
  left: 16px;
  cursor: pointer;
}
#new-thread-form {
  display: flex;
  gap: 8px;
}
#new-thread-form input {
  font-size: 1.2rem;
  padding: 12px;
  width: 300px;
}
#new-thread-form button {
  font-size: 1.2rem;
  padding: 12px;
}
</style>
