<template>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in menuItems" :key="item.title">
              <SidebarMenuButton asChild>
                <NuxtLink :to="item.url">
                  <Icon :name="item.icon" class="w-4 h-4" />
                  <span>{{ item.title }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Threads</SidebarGroupLabel>
        <SidebarGroupAction @click="addThread">
          <Icon name="lucide:plus" class="w-4 h-4 cursor-pointer" />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="thread in threads" :key="thread.id">
              <SidebarMenuButton asChild :isActive="route.params.id === thread.id">
                <NuxtLink :to="`/thread/${thread.id}`" class="flex items-center justify-between">
                  {{ thread.title }}
                  <span v-if="route.params.id === thread.id">
                    <Icon name="lucide:pen" @click.stop.prevent="editThread(thread)" class="w-4 h-4 inline-block ml-2" />
                    <Icon name="lucide:trash" @click.stop.prevent="deleteThread(thread.id)" class="w-4 h-4 inline-block ml-1" />
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>

<script setup lang="ts">
// ...existing imports for Sidebar components...

// New menu items using string identifiers from the Lucide pack
const menuItems = [
  { title: "Home", url: "/", icon: "lucide:house" },
  { title: "Profile", url: "/profile", icon: "lucide:user" },
]

const route = useRoute()
const threads = ref([])

onMounted(async () => {
  if ((globalThis as any).database?.threads) {
    const threadsQuery = (globalThis as any).database.threads.find();
    threadsQuery.$.subscribe((docs: any) => {
      threads.value = docs;
    });
    console.log(threads);
  }
})

// Modified addThread function to be async and check that insert exists
async function addThread() {
  const newThread = {
    id: Date.now().toString(),
    object: 'thread',
    created_at: Date.now(),
    title: 'New Thread',
    timestamp: Date.now(),
    tool_resources: null,
    messages: []
  }
  if ((globalThis as any).database?.threads &&
      typeof (globalThis as any).database.threads.insert === 'function') {
    await (globalThis as any).database.threads.insert(newThread)

    navigateTo('/thread/' + newThread.id)
  } else {
    console.error('Insert function is not available on database.threads')
  }
}

async function deleteThread(id: string) {
  const doc = await (globalThis as any).database.threads.findOne({ selector: { id } }).exec()
  if (doc) {
    await doc.remove()
    threads.value = threads.value.filter(t => t.id !== id)

    navigateTo('/')
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
</script>
