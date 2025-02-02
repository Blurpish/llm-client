<template>
  <div>
    <Header @toggle-history="toggleHistory" @new-thread="newThread" />
    <History v-if="showHistory" />
    <div id="thread-container">
      <section id="chat-container">
        <article v-for="(msg, index) in messages" :key="index">
          <div v-if="msg.role === 'user'">
            <Icon name="lucide:user" />
            <strong>You</strong>
          </div>
          <div v-if="msg.role === 'assistant'">
            <Icon name="lucide:bot" />
            <strong>OpenRouter</strong>
          </div>
          <div v-html="msg.content"></div>
        </article>
      </section>
      <section id="input">
        <Icon name="lucide:plus" />
        <input id="query-input" type="text" placeholder="Ask me anything" v-model="query" :disabled="pending">
        <Icon name="lucide:send" @click="send" />
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Header from '~/components/thread/header.vue'
import History from '~/components/history.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OpenAI from "openai"
import { marked } from "marked"
import DOMPurify from "dompurify"

type Message = { role: "system" | "user" | "assistant", content: string }

const route = useRoute()
const router = useRouter()
const threadId = route.params.id as string

const messages = ref<Message[]>([])
const query = ref("")
const pending = ref(false)
const showHistory = ref(false)
let threadDoc: any = null

// Initialize OpenAI instance
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: useCookie("api-key").value ?? undefined,
  dangerouslyAllowBrowser: true,
})

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

  // If there's an initialMessage and the last message is user, trigger assistant reply
  if (route.query.initialMessage) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg && lastMsg.role === "user") {
      processAssistant()
    }
  }
})

// Trigger the assistant reply process using the initialMessage
async function processAssistant() {
  if (!threadDoc) return
  pending.value = true

  // Re-fetch before adding assistant placeholder
  let freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  const currentMessages = freshDoc.get('messages') || []
  const assistantMsg = { id: (Date.now() + 1).toString(), role: "assistant", content: "", timestamp: Date.now() }
  let updatedMessages = [...currentMessages, assistantMsg]
  await freshDoc.patch({ messages: updatedMessages })
  messages.value = updatedMessages

  // Start streaming assistant reply
  const stream = await openai.chat.completions.create({
    model: "openai/gpt-3.5-turbo",
    messages: messages.value,
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
      await freshDoc.patch({ messages: updatedMessages })
      messages.value = updatedMessages
    }
    if (data.choices[0].finish_reason) break
  }
  pending.value = false
}

async function send() {
  if (!threadDoc) return
  pending.value = true

  // Add the user message to the thread
  let freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  const userMsg: Message = { 
    id: Date.now().toString(), 
    role: "user", 
    content: query.value.trim(), 
    timestamp: Date.now() 
  }
  let currentMessages = freshDoc.get('messages') || []
  let updatedMessages = [...currentMessages, userMsg]
  await freshDoc.patch({ messages: updatedMessages })
  messages.value = updatedMessages
  query.value = ""

  // Then trigger assistant reply as in processAssistant
  // Re-fetch and add assistant placeholder, then stream reply (code similar to processAssistant)
  freshDoc = await (globalThis as any).database.threads.findOne({ selector: { id: threadId } }).exec()
  currentMessages = freshDoc.get('messages') || []
  const assistantMsg: Message = { 
    id: (Date.now() + 1).toString(), 
    role: "assistant", 
    content: "", 
    timestamp: Date.now() 
  }
  updatedMessages = [...currentMessages, assistantMsg]
  await freshDoc.patch({ messages: updatedMessages })
  messages.value = updatedMessages

  const stream = await openai.chat.completions.create({
    model: "openai/gpt-3.5-turbo",
    messages: messages.value,
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
      await freshDoc.patch({ messages: updatedMessages })
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

<style scoped>
#thread-container {
  display: flex;
  flex-direction: column;
  height: 95vh;
}
#chat-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
}
article {
  margin-bottom: 16px;
  padding: 8px;
  border-bottom: 1px solid #eee;
}
#input {
  display: flex;
  padding: 16px;
  align-items: center;
  border-top: 1px solid #ddd;
}
#query-input {
  flex-grow: 1;
  margin-left: 12px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
