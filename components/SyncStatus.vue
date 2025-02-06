<template>
  <Popover>
    <PopoverTrigger class="fixed top-2 right-2 z-50">
      <div class="w-8 h-8 overflow-hidden flex items-center justify-center relative">
        <div class="h-4 w-4 rounded-full border border-white"
          :class="syncActive ? 'bg-green-500' : 'bg-gray-500'"></div>
        <div class="absolute inset-0 mx-auto my-auto w-4 h-4 rounded-full opacity-75 animate-ping pointer-events-none"
          :class="syncActive ? 'bg-green-200' : 'bg-gray-500'"></div>
      </div>
    </PopoverTrigger>
    <PopoverContent class="w-56 p-0">
      <div class="p-2">
        <span class="font-medium">Sync Status</span>
        <div class="flex items-center gap-2" v-for="peer in nuxtApp.$getPeers()" :key="peer.device.id">
          <Icon :name="'lucide:' + peer.device.icon" class="w-4 h-4" />
          <div class="flex flex-col">
            <span>{{ peer.device.name }}</span>
            <span class="text-xs text-gray-500">{{ peer.device.id }}</span>
            <Badge v-if="peer.device.capabilities" v-for="capability in peer.device.capabilities" :key="capability">{{
              capability }}</Badge>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
const syncActive = ref(false)
const nuxtApp = useNuxtApp()

function checkSyncStatus() {
  const count = nuxtApp.$getPeers()
  syncActive.value = count.length > 0
}

let intervalId: number

onMounted(() => {
  intervalId = window.setInterval(checkSyncStatus, 1000)
})
onUnmounted(() => {
  clearInterval(intervalId)
})
</script>
