<template>
  <div class="sidebar">
    <div class="sidebar-content">
      <h2>Threads</h2>
      <ul>
        <li v-for="thread in threads" :key="thread.id" :class="{active: route.params.id === thread.id}">
          <NuxtLink :to="`/thread/${thread.id}`">{{ thread.title }}</NuxtLink>
          <span v-if="route.params.id === thread.id" class="thread-actions">
            <button @click.stop.prevent="editThread(thread)">Edit</button>
            <button @click.stop.prevent="deleteThread(thread.id)">Delete</button>
          </span>
        </li>
      </ul>
      <button @click="addThread">New Thread</button>
    </div>
    <button class="user-button" @click="goToUserProfile">Profile</button>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const threads = ref([])

onMounted(async () => {
  if ((globalThis as any).database?.threads) {
    const threadsQuery = (globalThis as any).database.threads.find();
    threadsQuery.$.subscribe((docs: any) => {
      threads.value = docs;
    });
  }
})

function addThread() {
  const newThread = {
    id: Date.now().toString(),
    object: 'thread',
    created_at: Date.now(),
    title: 'New Thread',
    timestamp: Date.now(),
    tool_resources: null,
    messages: []
  }
  ;(globalThis as any).database.threads.insert(newThread)
}

async function deleteThread(id: string) {
  const doc = await (globalThis as any).database.threads.findOne({ selector: { id } }).exec()
  if (doc) {
    await doc.remove()
    threads.value = threads.value.filter(t => t.id !== id)
  }
}

async function editThread(thread: any) {
  const newTitle = prompt('Edit thread title', thread.title)
  if (newTitle && newTitle !== thread.title) {
    const doc = await (globalThis as any).database.threads.findOne({ selector: { id: thread.id } }).exec()
    if (doc) {
      await doc.patch({ title: newTitle })
      thread.title = newTitle
    }
  }
}

function goToUserProfile() {
  // Navigate to the userProfile page/component
  const router = useRouter();
  router.push('/profile');
}
</script>

<style scoped>
.sidebar {
  padding: 16px;
  border-right: 1px solid #ddd;
  background: #FFF;
  position: absolute;
  height: 100vh;
  width: 80vw;
  top: 0;
  z-index: 100;
  box-shadow: 0 0 0 500px rgba(0, 0, 0, 0.1);
}

.sidebar-content h2 {
  margin-bottom: 8px;
}
.sidebar-content ul {
  list-style-type: none;
  padding: 0;
}
.sidebar-content li {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-content li.active {
  background-color: #333;
  color: #fff;
}
.sidebar-content li a {
  text-decoration: none;
  color: inherit;
}
.thread-actions button {
  margin-left: 4px;
}

.user-button {
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 8px 12px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.user-button:hover {
  background: #0056b3;
}
</style>
