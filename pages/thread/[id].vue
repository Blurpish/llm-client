<template>
  <div class="flex flex-col items-center w-full h-[100dvh] p-4">
    <div ref="messageContainer" class="flex-grow overflow-y-auto space-y-4 w-full max-w-[1000px] pb-4">
      <div v-for="(msg, index) in messages" 
           :key="index" 
           :class="msg.role === 'assistant' ? 'w-full' : 'flex justify-end w-full'">
        <Card v-if="msg.role === 'user'" class="bg-gray-50 w-96">
          <CardContent class="p-2">
            <div class="flex items-center space-x-2 mb-1">
              <Icon name="lucide:user" />
              You
            </div>
            <div class="prose prose-sm max-w-none" v-html="processContent(msg.content)"></div>
          </CardContent>
        </Card>
        <div v-else class="w-full">
          <div class="prose prose-sm max-w-none" v-html="processContent(msg.content)"></div>
        </div>
      </div>
    </div>
    <div class="flex justify-center w-full max-w-[1100px]">
      <ChatInput 
        :pending="pending" 
        @send="send"
        @maskChange="handleMaskChange" 
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from "marked"
import DOMPurify from "dompurify"
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/stores/user'
import { useAI } from '@/composables/useAI'

type Message = { role: "system" | "user" | "assistant", content: string }

const route = useRoute()
const router = useRouter()
const threadId = route.params.id as string

const userStore = useUserStore()
const messages = ref<Message[]>([])
const pending = ref(false)
const showHistory = ref(false)
const masks = ref([])
let threadDoc: any = null

const { activeProvider, availableProviders } = useAI()

const activeMask = ref<any>(null)

function handleMaskChange(mask: any) {
  activeMask.value = mask
}

// NEW: Helper to build custom pre-prompt using custom instructions
async function getCustomPrompt(): Promise<string> {
  const db = (globalThis as any).database;
  const profileDoc = await db.profile.findOne().exec();
  let prompt = '';
  
  // If a mask is used, only use the mask content.
  if (userStore.currentMask) {
    prompt += userStore.currentMask.prompt;
    return prompt.trim();
  }
  
  // Otherwise, add custom instructions if they exist.
  if (profileDoc) {
    const { name, occupation, traits, other } = profileDoc.customInstructions;
    prompt += "Below are the custom instructions and infos provided by the user:\n";
    if (name) prompt += `Name: ${name.trim()}\n`;
    if (occupation) prompt += `Occupation: ${occupation.trim()}\n`;
    if (traits) prompt += `Traits: ${traits.trim()}\n`;
    if (other) prompt += `Other instructions: ${other.trim()}\n`;
  }
  
  return prompt.trim();
}

onMounted(async () => {
  threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  
  if (!threadDoc) {
    const newThread = {
      id: threadId,
      object: 'thread',
      created_at: Date.now(),
      title: 'New Thread',
      timestamp: Date.now(),
      tool_resources: null,
      messages: []
    }
    await (globalThis as any).database.threads.insert(newThread)
    threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  }

  if (threadDoc) {
    messages.value = threadDoc.toJSON().messages || []
    // Subscribe to changes if needed
    threadDoc.$.subscribe((doc: any) => {
      messages.value = doc?.messages || []
    })
  }

  // Only process initial message if thread is empty and we have an initialMessage
  if (messages.value.length === 0 && route.query.initialMessage) {
    const initialMsg = decodeURIComponent(route.query.initialMessage as string)
    send({ text: initialMsg })
  }

  // Load masks
  const db = (globalThis as any).database
  const allMasks = await db.masks.find().exec()
  masks.value = allMasks.map(doc => doc.toJSON())

  // Subscribe to mask changes
  db.masks.$.subscribe(() => {
    db.masks.find().exec().then((docs: any) => {
      masks.value = docs.map((doc: any) => doc.toJSON())
    })
  })
})

async function safePatch(patch: object): Promise<void> {
  let success = false;
  while (!success) {
    try {
      // Re-read document for up-to-date revision
      threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec();
      await threadDoc.patch(patch);
      success = true;
    } catch (err: any) {
      if (err.status === 409) {
        // Conflict: wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw err;
      }
    }
  }
}

// Update generateTitle() to select provider from user settings
async function generateTitle(message: string): Promise<string> {
  const titleProv = availableProviders.get(userStore.titleModel.provider)
  if (!titleProv) return 'New Thread'
  
  const prompt = `give a short title, TWO WORDS MAXIMUM to the conversation starting with the following message : ${message}. You must NOT UNDER ANY CIRCUMSTANCES exceed the two words maximum nor send ANYTHING ELSE the the TWO WORDS of the title. If you are unable to generate a title, please juste send "UNABLE TO GENERATE TITLE".`
  
  let title = ''
  const stream = await titleProv.chat([
    { role: "user", content: prompt }
  ], userStore.titleModel.id)

  for await (const chunk of stream) {
    if (chunk.choices[0].delta?.content) {
      title += chunk.choices[0].delta.content
    }
  }

  return title.trim()
}

// Replace selectModelForMessage with this version that handles streaming properly
async function selectModelForMessage(message: string): Promise<string> {
  if (!activeProvider.value) return userStore.predefinedModels.base.id

  const prompt = `You are a model selector. Your task is to analyze a given user message and determine the most appropriate model to handle it. You must return one of the following options:

1 ("mini") if the message is simple, fact-based, or requires only basic responses. Example: definitions, short answers, trivia, or direct lookup tasks.
2 ("base") if the message requires standard responses, general knowledge, creative tasks, or common tasks like summarization, explanations, or structured responses.
3 ("max") if the message is complex, involves reasoning, coding, multi-step logic, or detailed analysis.

Rules:
Do not explain your choice—only return the number.
Consider complexity, length, and required reasoning.

Message to analyze: ${message}`

  let choice = ''
  const stream = await activeProvider.value.chat([
    { role: "user", content: prompt }
  ], userStore.predefinedModels.base.id)

  for await (const chunk of stream) {
    if (chunk.choices[0].delta?.content) {
      choice += chunk.choices[0].delta.content
    }
  }

  choice = choice.trim()
  const modelMap: Record<string, keyof typeof userStore.predefinedModels> = {
    "1": "mini",
    "2": "base",
    "3": "max"
  };

  return userStore.predefinedModels[modelMap[choice] || "base"].id;
}

// Update send() to use completion provider based on user settings
async function send(payload: { text: string }) {
  if (!threadDoc) return
  pending.value = true

  // Add the user message to the thread
  let freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  const userMsg: Message = { 
    id: Date.now().toString(), 
    role: "user", 
    content: payload.text.trim(), 
    timestamp: Date.now() 
  }
  let currentMessages = freshDoc.get('messages') || []
  let updatedMessages = [...currentMessages, userMsg]
  await safePatch({ messages: updatedMessages })
  messages.value = updatedMessages

  if (freshDoc.get('title') === 'New Thread') {
    const title = await generateTitle(payload.text)
    await safePatch({ title })
  }

  // Then trigger assistant reply as in processAssistant
  freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  currentMessages = freshDoc.get('messages') || []
  const assistantMsg: Message = { 
    id: (Date.now() + 1).toString(), 
    role: "assistant", 
    content: "", 
    timestamp: Date.now() 
  }
  updatedMessages = [...currentMessages, assistantMsg]
  await safePatch({ messages: updatedMessages })
  messages.value = updatedMessages

  const prePrompt = await getCustomPrompt()
  const apiMessages = prePrompt ? [{ role: "system", content: prePrompt }, ...messages.value] : messages.value

  const modelToUse = userStore.autoModelSelect 
    ? await selectModelForMessage(payload.text)
    : userStore.selectedModel.id;
      
  // Look up the model in predefinedModels (search in all values)
  let chosenModel: any;
  for (const key in userStore.defaultModels) {
    const m = userStore.defaultModels[key];
    if (m.id === modelToUse) {
      chosenModel = m;
      break;
    }
  }
  console.log(chosenModel)
  let chosenProv = userStore.selectedModel.provider ? availableProviders.get(userStore.selectedModel.provider) : null
  if (!chosenProv || !userStore.providers[chosenProv.id]) {
    chosenProv = activeProvider.value;
  }
  
  const stream = await chosenProv.chat(apiMessages, modelToUse)

  for await (const data of stream) {
    const delta = data.choices[0].delta
    if (delta && delta.content) {
      freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
      let currentMessages = freshDoc.get('messages') || []
      const lastMsg = { ...currentMessages[currentMessages.length - 1] }
      lastMsg.content += delta.content
      const updatedMessages = [...currentMessages.slice(0, -1), lastMsg]
      await safePatch({ messages: updatedMessages })
      messages.value = updatedMessages
    }
    if (data.choices[0].finish_reason) break
  }
  pending.value = false
}

function toggleHistory() {
  showHistory.value = !showHistory.value
}

async function newThread() {
  // Create a new thread and navigate to it
  const id = Date.now().toString()
  const newThreadObj = {
    id,
    object: 'thread',
    created_at: Date.now(),
    title: 'New Thread',
    timestamp: Date.now(),
    tool_resources: null,
    messages: []
  }
  await (globalThis as any).database.threads.insert(newThreadObj)
  router.push(`/thread/${id}`)
}

// Add helper function to process content with markdown and sanitization
function processContent(content: string): string {
  const markedContent = marked.parse(content, { breaks: true });
  return DOMPurify.sanitize(markedContent);
}

const messageContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

// Add watcher for messages
watch(() => messages.value, () => {
  // Use nextTick to ensure DOM is updated before scrolling
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })
</script>

<style>
.prose pre {
  background: #f3f4f6;
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

.prose code {
  background: #f3f4f6;
  padding: 0.25rem;
  border-radius: 0.25rem;
}
</style>
