<template>
  <div class="flex flex-col items-center w-full h-screen p-4">
    <div class="flex-grow overflow-y-auto space-y-4 max-w-[1000px] pb-4">
      <Card v-for="(msg, index) in messages" :key="index" :class="msg.role === 'assistant' ? 'bg-gray-100' : 'bg-gray-50'">
        <CardContent class="p-2">
          <div class="flex items-center space-x-2 mb-1">
            <Icon :name="msg.role === 'assistant' ? 'lucide:bot' : 'lucide:user'" />
            {{ msg.role === 'assistant' ? 'Assistant' : 'You' }}
          </div>
          <div v-html="msg.content"></div>
        </CardContent>
      </Card>
    </div>
    <div class="flex justify-center w-full max-w-[1100px]">
      <ChatInput :pending="pending" @send="send" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OpenAI from "openai"
import { marked } from "marked"
import DOMPurify from "dompurify"
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/stores/user'

type Message = { role: "system" | "user" | "assistant", content: string }

const route = useRoute()
const router = useRouter()
const threadId = route.params.id as string

const userStore = useUserStore()
const messages = ref<Message[]>([])
const pending = ref(false)
const showHistory = ref(false)
let threadDoc: any = null

// Initialize OpenAI instance
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: userStore.openRouterToken,
  dangerouslyAllowBrowser: true,
})

// NEW: Helper to build custom pre-prompt using custom instructions
async function getCustomPrompt(): Promise<string> {
  const db = (globalThis as any).database;
  const profileDoc = await db.profile.findOne().exec();
  if (!profileDoc) return '';
  
  const { name, occupation, traits, other } = profileDoc.customInstructions;
  let prompt = "Below are the custom instructions and infos provided by the user, you should strictly follow them:\n";
  if (name) prompt += `Name: ${name.trim()}\n`;
  if (occupation) prompt += `Occupation: ${occupation.trim()}\n`;
  if (traits) prompt += `Traits: ${traits.trim()}\n`;
  if (other) prompt += `Other instructions: ${other.trim()}\n`;
  return prompt.trim();
}

onMounted(async () => {
  // Try to load the thread document by id
  threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  
  // If threadDoc doesn't exist and an initialMessage is provided, create it
  if (!threadDoc && route.query.initialMessage) {
    const initialMsg = decodeURIComponent(route.query.initialMessage as string)
    const newThread = {
      id: threadId,
      object: 'thread',
      created_at: Date.now(),
      title: 'New Thread',
      timestamp: Date.now(),
      tool_resources: null,
      messages: [
        { id: '1', role: 'user', content: initialMsg, timestamp: Date.now() }
      ]
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

  if (route.query.initialMessage) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg && lastMsg.role === "user") {
      processAssistant()
    }
  }
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

async function generateTitle(message: string): Promise<string> {
  const prompt = `give a short title (THREE WORDS MAXIMUM) to the conversation starting with the following message : ${message}. You must NOT UNDER ANY CIRCUMSTANCES exceed the three words maximum.`
  const response = await openai.chat.completions.create({
    model: "meta-llama/llama-3.2-1b-instruct",
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });
  // Return title as-is, without quotes.
  return response.choices[0].message.content.trim();
}

// Trigger the assistant reply process using the initialMessage
async function processAssistant() {
  if (!threadDoc) return
  pending.value = true

  // Re-fetch before adding assistant placeholder
  let freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  const currentMessages = freshDoc.get('messages') || []
  const assistantMsg = { id: (Date.now() + 1).toString(), role: "assistant", content: "", timestamp: Date.now() }
  let updatedMessages = [...currentMessages, assistantMsg]
  await safePatch({ messages: updatedMessages })
  messages.value = updatedMessages

  const prePrompt = await getCustomPrompt()
  const apiMessages = prePrompt ? [{ role: "system", content: prePrompt }, ...messages.value] : messages.value

  // Start streaming assistant reply
  const stream = await openai.chat.completions.create({
    model: userStore.selectedModel.id,
    messages: apiMessages,
    stream: true,
  })

  for await (const data of stream) {
    const delta = data.choices[0].delta
    if (delta && delta.content) {
      freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
      let current = freshDoc.get('messages') || []
      const lastMsg = { ...current[current.length - 1] }
      lastMsg.content += delta.content
      updatedMessages = [...current.slice(0, -1), lastMsg]
      await safePatch({ messages: updatedMessages })
      messages.value = updatedMessages
    }
    if (data.choices[0].finish_reason) break
  }
  pending.value = false
}

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

  // NEW: If it's the first message, generate and update the thread title
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

  const stream = await openai.chat.completions.create({
    model: userStore.selectedModel.id,
    messages: apiMessages,
    stream: true,
  })

  for await (const data of stream) {
    const delta = data.choices[0].delta
    if (delta && delta.content) {
      freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
      currentMessages = freshDoc.get('messages') || []
      const lastMsg = { ...currentMessages[currentMessages.length - 1] }
      lastMsg.content += delta.content
      updatedMessages = [...currentMessages.slice(0, -1), lastMsg]
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
</script>
