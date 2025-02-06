<template>
  <div>Processing authentication...</div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const { code, service } = route.query

if (code) {
  const message = { code, service }
  if (window.opener) {
    window.opener.postMessage(message, window.location.origin)
  } else {
    localStorage.setItem(`auth_${service}`, JSON.stringify(message))
  }
  window.close()
}
</script>
