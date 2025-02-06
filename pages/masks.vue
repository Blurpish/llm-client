<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Masks</h1>
    
    <div class="mb-6">
      <Button @click="showNewMaskDialog">Create New Mask</Button>
    </div>

    <div class="flex gap-4">
      <Card v-for="mask in masks" :key="mask.id" class="w-96">
        <CardHeader>
          <div class="flex flex-wrap items-center gap-2">
            <Icon :name="'lucide:' + mask.icon || 'lucide:user'" class="w-5 h-5" />
            <CardTitle>{{ mask.name }}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
            <pre class="whitespace-pre-wrap line-clamp-4">{{ mask.prompt }}</pre>
        </CardContent>
        <CardFooter class="flex gap-2">
          <Button variant="outline" @click="editMask(mask)">Edit</Button>
          <Button variant="destructive" @click="deleteMask(mask)">Delete</Button>
        </CardFooter>
      </Card>
    </div>

    <ResponsiveDialog v-model:open="showDialog">
      <template #header>
        <DialogTitle>{{ isEditing ? 'Edit Mask' : 'Create New Mask' }}</DialogTitle>
      </template>

      <template #content>
        <div class="space-y-4 px-4">
          <Input v-model="maskForm.name" placeholder="Mask Name" />
          <IconPicker v-model="maskForm.icon" placeholder="Choose an icon" />
          <Textarea
            v-model="maskForm.prompt"
            placeholder="Enter the mask prompt..."
            rows="10"
          />
        </div>
      </template>

      <template #footer>
        <Button @click="saveMask">{{ isEditing ? 'Save' : 'Create' }}</Button>
      </template>
    </ResponsiveDialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const masks = ref([])
const showDialog = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const maskForm = ref({
  name: '',
  prompt: '',
  icon: ''
})

onMounted(async () => {
  const db = (globalThis as any).database
  const allMasks = await db.masks.find().exec()
  masks.value = allMasks.map(doc => doc.toJSON())

  // Subscribe to changes
  db.masks.$.subscribe(() => {
    db.masks.find().exec().then((docs: any) => {
      masks.value = docs.map((doc: any) => doc.toJSON())
    })
  })
})

function editMask(mask: any) {
  isEditing.value = true
  editingId.value = mask.id
  maskForm.value = {
    name: mask.name,
    prompt: mask.prompt,
    icon: mask.icon || 'lucide:user'
  }
  showDialog.value = true
}

function showNewMaskDialog() {
  isEditing.value = false
  editingId.value = null
  maskForm.value = { name: '', prompt: '', icon: '' }
  showDialog.value = true
}

async function saveMask() {
  if (!maskForm.value.name || !maskForm.value.prompt) return

  const db = (globalThis as any).database
  
  if (isEditing.value && editingId.value) {
    const doc = await db.masks.findOne({ selector: { id: editingId.value } }).exec()
    if (doc) {

      await doc.patch({
        name: maskForm.value.name,
        prompt: maskForm.value.prompt,
        icon: maskForm.value.icon || 'lucide:user'
      })
    }
  } else {
    await db.masks.insert({
      id: Date.now().toString(),
      name: maskForm.value.name,
      prompt: maskForm.value.prompt,
      icon: maskForm.value.icon || 'lucide:user',
      created_at: Date.now()
    })
  }

  maskForm.value = { name: '', prompt: '', icon: '' }
  showDialog.value = false
  isEditing.value = false
  editingId.value = null
}

async function deleteMask(mask: any) {
  const db = (globalThis as any).database
  const doc = await db.masks.findOne({ selector: { id: mask.id } }).exec()
  if (doc) await doc.remove()
}
</script>
