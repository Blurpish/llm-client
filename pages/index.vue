<template>
  <div id="container">
    <!-- Added menu icon button for toggling history -->
    <div id="menu-bar">
      <Icon name="lucide:menu" @click="toggleHistory" />
    </div>
    <History v-if="showHistory" />
    <div id="new-thread-form">
      <input type="text" v-model="message" placeholder="Type your message" />
      <button @click="createThread">Send</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import History from '~/components/history.vue'

// Reactive state
const message = ref("")
const showHistory = ref(false)
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

function toggleHistory() {
  showHistory.value = !showHistory.value
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
