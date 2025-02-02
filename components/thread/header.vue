<template>
  <section id="topbar">
    <div>
      <Icon name="lucide:menu" @click="toggleHistory" />
    </div>
    <div id="model-selector">
      GPT-3.5-Turbo
    </div>
    <div>
      <Icon name="lucide:pen-line" @click="newThread" />
    </div>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits(['toggle-history', 'new-thread'])
function toggleHistory() {
  emit('toggle-history')
}
function newThread() {
  emit('new-thread')
}
</script>

<style scoped>
#topbar {
  display: flex;
  padding: 16px;
  justify-content: space-between;
  align-items: center;
}
#model-selector {
  position: absolute;
  left: 50%;
  transform: translate(-50%);
}
</style>
