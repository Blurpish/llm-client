<template>
  <SidebarProvider>
    <AppSidebar />
    <main class="w-full h-media relative">
      <SidebarTrigger class="absolute bg-white top-2 left-2" />
      <NuxtPage />
    </main>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleKeydown(e: KeyboardEvent) {
  // Prevent browser's default behavior for Ctrl+N
  if (e.ctrlKey && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    e.stopPropagation()
    
    // Only handle our custom navigation if it's exactly Ctrl+N
    if (e.key === 'n') {
      router.push('/')
      nextTick(() => {
        document.getElementById('query-input')?.focus()
      })
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
