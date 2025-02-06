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
      
      <!-- Pinned Threads -->
      <SidebarGroup v-if="pinnedThreads.length > 0">
        <SidebarGroupLabel>Pinned</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem 
              v-for="thread in pinnedThreads" 
              :key="thread.id"
              @mouseenter="hoveredThreadId = thread.id"
              @mouseleave="hoveredThreadId = null"
            >
              <SidebarMenuButton asChild :isActive="route.params.id === thread.id">
                <NuxtLink :to="`/thread/${thread.id}`" class="flex items-center justify-between">
                  <span>{{ thread.title }}</span>
                  <span>
                    <Icon 
                      name="lucide:pin" 
                      @click.stop.prevent="togglePin(thread)"
                      class="w-4 h-4 inline-block ml-1"
                    />
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

      <!-- Folders and Threads -->
      <SidebarGroup>
        <SidebarGroupLabel>Threads</SidebarGroupLabel>
        <SidebarGroupAction class="flex gap-2 w-max h-4">
            <Icon name="lucide:folder-plus" class="w-4 h-4" @click="addFolder" />
            <Icon name="lucide:plus" class="w-4 h-4" @click="addThread" />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            <!-- Root threads -->
            <SidebarMenuItem 
              v-for="thread in rootThreads"
              :key="thread.id"
            >
              <SidebarMenuButton asChild :isActive="route.params.id === thread.id">
                <NuxtLink :to="`/thread/${thread.id}`" class="flex items-center justify-between">
                  <span class="overflow-hidden text-ellipsis whitespace-nowrap w-36">{{ thread.title }}</span>
                  <span>
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
                    <Icon 
                      v-if="route.params.id === thread.id || hoveredThreadId === thread.id"
                      name="lucide:pin"
                      @click.stop.prevent="togglePin(thread)"
                      class="w-4 h-4 inline-block ml-1"
                    />
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- Folders and their threads -->
            <template v-for="folder in folders" :key="folder.path">
              <Collapsible defaultOpen class="group/collapsible">
                <SidebarMenuItem class="folder-item">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton class="pl-[calc(var(--depth,0)*1rem + 1rem)]">
                      <div class="flex items-center justify-between w-full">
                        <div class="flex items-center">
                          <Icon name="lucide:chevron-right" class="w-4 h-4 mr-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          <Icon name="lucide:folder" class="w-4 h-4 mr-2" />
                          <span>{{ folder.name }}</span>
                        </div>
                        <div class="flex items-center gap-1 opacity-0 group-hover/collapsible:opacity-100 transition-opacity">
                          <Icon 
                            name="lucide:pen" 
                            class="w-4 h-4" 
                            @click.stop="openEditFolderDialog(folder)"
                          />
                          <Icon 
                            name="lucide:trash" 
                            class="w-4 h-4" 
                            @click.stop="openDeleteFolderDialog(folder)"
                          />
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuItem 
                      v-for="thread in getFolderThreadList(folder.path)"
                      :key="thread.id"
                      :style="{ '--depth': getDepth(folder.path) }"
                    >
                      <SidebarMenuButton asChild :isActive="route.params.id === thread.id">
                        <NuxtLink :to="`/thread/${thread.id}`" class="flex items-center justify-between">
                          <span class="overflow-hidden text-ellipsis whitespace-nowrap w-24">{{ thread.title }}</span>
                          <span>
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
                            <Icon 
                              v-if="route.params.id === thread.id || hoveredThreadId === thread.id"
                              name="lucide:pin"
                              @click.stop.prevent="togglePin(thread)"
                              class="w-4 h-4 inline-block ml-1"
                            />
                          </span>
                        </NuxtLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </template>
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

  <!-- Add Folder Dialog -->
  <Dialog v-model:open="showFolderDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New Folder</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <Input v-model="newFolderName" placeholder="Folder name" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showFolderDialog = false">Cancel</Button>
        <Button @click="confirmAddFolder">Create</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Edit Folder Dialog -->
  <Dialog v-model:open="showEditFolderDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Folder</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <Input v-model="editFolderTitle" placeholder="Folder name" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showEditFolderDialog = false">Cancel</Button>
        <Button @click="confirmEditFolder">Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Folder Confirmation Dialog -->
  <Dialog v-model:open="showDeleteFolderDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Folder</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <p>Are you sure you want to delete this folder?</p>
        <p class="text-sm text-muted-foreground mt-2">All threads will be moved to root.</p>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showDeleteFolderDialog = false">Cancel</Button>
        <Button variant="destructive" @click="confirmDeleteFolder">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSidebar } from '@/components/ui/sidebar'

const menuItems = [
  { title: "Home", url: "/", icon: "lucide:house" },
  { title: "Profile", url: "/profile", icon: "lucide:user" },
  { title: "Masks", url: "/masks", icon: "lucide:venetian-mask" },
]

const route = useRoute()
const threads = ref([])

const pinnedThreads = computed(() => threads.value.filter(t => t.pinned))
const folders = ref([])
const showFolderDialog = ref(false)
const newFolderName = ref('')

const { 
  toggleSidebar 
} = useSidebar()

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === '\\') {
    event.preventDefault()
    toggleSidebar()
  }
}

onMounted(async () => {
  if ((globalThis as any).database?.folders) {
    const foldersQuery = (globalThis as any).database.folders.find();
    foldersQuery.$.subscribe((docs: any) => {
      folders.value = docs.map((doc: any) => doc.toJSON());
    });
  }
  
  if ((globalThis as any).database?.threads) {
    const threadsQuery = (globalThis as any).database.threads.find();
    threadsQuery.$.subscribe({
      next: (docs: any) => {
        threads.value = docs.map((doc: any) => doc.toJSON());
      },
      error: (error: any) => {
        console.error('Threads subscription error:', error)
      }
    });
    
    const currentThreads = await threadsQuery.exec();
    threads.value = currentThreads.map((doc: any) => doc.toJSON());
  }
})

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

async function togglePin(thread: any) {
  const doc = await (globalThis as any).database.threads.findOne({ selector: { id: thread.id } }).exec()
  if (doc) {
    await doc.patch({ pinned: !thread.pinned })
  }
}

async function addFolder() {
  showFolderDialog.value = true
}

async function confirmAddFolder() {
  const newFolder = {
    id: Date.now().toString(),
    name: newFolderName.value,
    path: `/${newFolderName.value}`,
    parentPath: '/',
    created_at: Date.now()
  }
  await (globalThis as any).database.folders.insert(newFolder)
  showFolderDialog.value = false
  newFolderName.value = ''
}

// Replace getRootThreads with a simple computed property
const rootThreads = computed(() => 
  threads.value.filter(t => !t.folderPath || t.folderPath === '/')
)

// Simplify folder thread list getter
function getFolderThreadList(folderPath: string) {
  return threads.value.filter(t => t.folderPath === folderPath)
}

function getDepth(path: string) {
  return (path.match(/\//g) || []).length - 1
}

// Add folder management state
const currentFolder = ref(null)
const editFolderTitle = ref('')
const showEditFolderDialog = ref(false)
const showDeleteFolderDialog = ref(false)
const folderToDelete = ref(null)

function openEditFolderDialog(folder: any) {
  currentFolder.value = folder
  editFolderTitle.value = folder.name
  showEditFolderDialog.value = true
}

async function confirmEditFolder() {
  if (currentFolder.value) {
    const doc = await (globalThis as any).database.folders.findOne({ selector: { id: currentFolder.value.id } }).exec()
    if (doc) {
      const newPath = `/${editFolderTitle.value}`
      await doc.patch({ 
        name: editFolderTitle.value,
        path: newPath
      })
      // Update threads in this folder to use new path
      const threadsInFolder = threads.value.filter(t => t.folderPath === currentFolder.value.path)
      for (const thread of threadsInFolder) {
        const threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: thread.id } }).exec()
        if (threadDoc) {
          await threadDoc.patch({ folderPath: newPath })
        }
      }
    }
    showEditFolderDialog.value = false
  }
}

async function deleteFolder(folder: any) {
  openDeleteFolderDialog(folder)
}

function openDeleteFolderDialog(folder: any) {
  folderToDelete.value = folder
  showDeleteFolderDialog.value = true
}

async function confirmDeleteFolder() {
  if (folderToDelete.value) {
    const doc = await (globalThis as any).database.folders.findOne({ selector: { id: folderToDelete.value.id } }).exec()
    if (doc) {
      // Move threads to root before deleting folder
      const threadsInFolder = threads.value.filter(t => t.folderPath === folderToDelete.value.path)
      for (const thread of threadsInFolder) {
        const threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: thread.id } }).exec()
        if (threadDoc) {
          await threadDoc.patch({ folderPath: '/' })
        }
      }
      await doc.remove()
    }
    showDeleteFolderDialog.value = false
    folderToDelete.value = null
  }
}
</script>

<style scoped>
.folder-item {
  padding-left: calc(var(--depth, 0) * 1rem);
}

.group-data-\[state\=open\]\/collapsible .rotate-90 {
  transform: rotate(90deg);
}
</style>
