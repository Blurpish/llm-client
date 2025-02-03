<template>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in menuItems" :key="item.title">
              <SidebarMenuButton asChild :isActive="route.path === item.url">
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
            <!-- Each list item is now its own group -->
            <SidebarMenuItem 
              v-for="thread in threads" 
              :key="thread.id"
              @mouseenter="hoveredThreadId = thread.id"
              @mouseleave="hoveredThreadId = null"
            >
              <SidebarMenuButton asChild :isActive="route.params.id === thread.id">
                <NuxtLink :to="`/thread/${thread.id}`" class="flex items-center justify-between">
                  <span>{{ thread.title }}</span>
                  <span>
                    <!-- Conditionally render buttons if active or hovered -->
                    <Icon 
                      v-if="route.params.id === thread.id || hoveredThreadId === thread.id" 
                      name="lucide:pen" 
                      @click.stop.prevent="openEditDialog(thread)" 
                      class="w-4 h-4 inline-block ml-2" 
                    />
                    <Icon 
                      v-if="route.params.id === thread.id || hoveredThreadId === thread.id" 
                      name="lucide:trash" 
                      @click.stop.prevent="handleDeleteClick($event, thread)" 
                      class="w-4 h-4 inline-block ml-1" 
                    />
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  
  <!-- Edit Thread Dialog -->
  <Dialog v-model:open="showEditDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Thread</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <Input v-model="editTitle" placeholder="Thread title" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showEditDialog = false">Cancel</Button>
        <Button @click="confirmEdit">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  
  <!-- Delete Thread Confirmation Dialog -->
  <Dialog v-model:open="showDeleteDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Deletion</DialogTitle>
      </DialogHeader>
      <div class="py-4">Are you sure you want to delete this thread?</div>
      <DialogFooter>
        <Button variant="secondary" @click="showDeleteDialog = false">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

const showEditDialog = ref(false)
const currentEditThread = ref(null)
const editTitle = ref('')

const showDeleteDialog = ref(false)
const threadToDelete = ref(null)

const hoveredThreadId = ref<string | null>(null)

function openEditDialog(thread: any) {
  currentEditThread.value = thread
  editTitle.value = thread.title
  showEditDialog.value = true
}

async function confirmEdit() {
  if (currentEditThread.value) {
    const doc = await (globalThis as any).database.threads.findOne({ selector: { id: currentEditThread.value.id } }).exec()
    if (doc) {
      await doc.patch({ title: editTitle.value })
      currentEditThread.value = { ...currentEditThread.value, title: editTitle.value }
    }
    showEditDialog.value = false
  }
}

function openDeleteDialog(thread: any) {
  threadToDelete.value = thread
  showDeleteDialog.value = true
}

// NEW: Consolidated delete function
async function deleteThread(thread: any) {
  const doc = await (globalThis as any).database.threads.findOne({ selector: { id: thread.id } }).exec()
  if (doc) {
    await doc.remove()
    threads.value = threads.value.filter(t => t.id !== thread.id)
    navigateTo('/')
  }
}

async function confirmDelete() {
  if (threadToDelete.value) {
    await deleteThread(threadToDelete.value)
    showDeleteDialog.value = false
  }
}

async function directDelete(thread: any) {
  await deleteThread(thread)
}

function handleDeleteClick(event: MouseEvent, thread: any) {
  if (event.shiftKey) {
    directDelete(thread)
  } else {
    openDeleteDialog(thread)
  }
}
</script>
