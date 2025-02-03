<template>
  <!-- A simple dropdown to select sort order -->
  <select v-model="localSortKey" class="border p-1 rounded">
    <option value="date">Date</option>
    <option value="name">Name</option>
    <option value="pricing">Pricing</option>
  </select>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

const props = defineProps<{ sortKey: string }>()
const emit = defineEmits<{ (e: 'update:sortKey', value: string): void }>()

const localSortKey = ref(props.sortKey)

watch(localSortKey, (newVal) => {
  emit('update:sortKey', newVal)
})

// Update localSortKey if prop updates externally
watch(() => props.sortKey, (newVal) => {
  localSortKey.value = newVal
})
</script>
