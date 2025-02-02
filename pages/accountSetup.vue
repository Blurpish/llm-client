<template>
  <div class="account-setup">
    <h2>Account Setup</h2>
    <div v-if="!scanning">
      <button @click="createNewAccount">New Account</button>
      <button @click="startPairing">Pair Account</button>
    </div>
    <div v-if="scanning">
      <video ref="videoEl" autoplay playsinline style="width:100%;"></video>
      <canvas ref="canvasEl" style="display:none;"></canvas>
      <p>Scanning in progress...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import jsQR from 'jsqr';

const scanning = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let scanAnimationFrame: number | null = null;
let stream: MediaStream | null = null;
const router = useRouter();

async function createNewAccount() {
  const userId = 'user-' + Math.random().toString(36).substr(2, 9);
  const db = (globalThis as any).database;
  // Upsert a profile with required default fields
  await db.profile.upsert({
    id: userId,
    object: 'profile',
    created_at: Date.now(),
    name: 'New User',
    email: '',
    avatar: '',
    bio: '',
    threads: []
  });
  db.userId = userId;
  router.push('/');
}

async function startPairing() {
  scanning.value = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      videoEl.value.onloadedmetadata = () => {
        videoEl.value?.play();
        scanLoop();
      };
    }
  } catch (err) {
    console.error('Camera access error:', err);
    scanning.value = false;
  }
}

async function scanLoop() {
  if (!videoEl.value || !canvasEl.value) return;
  const video = videoEl.value;
  const canvas = canvasEl.value;
  const context = canvas.getContext('2d');
  if (!context) return;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height);
  
  if (code) {
    console.log('QR code detected:', code.data);
    stopScan();
    const db = (globalThis as any).database;
    // Upsert a profile with scanned user id
    await db.profile.upsert({
      id: code.data,
      object: 'profile',
      created_at: Date.now(),
      name: 'Paired User',
      email: '',
      avatar: '',
      bio: '',
      threads: []
    });
    db.userId = code.data;
    router.push('/');
  } else {
    scanAnimationFrame = requestAnimationFrame(scanLoop);
  }
}

function stopScan() {
  scanning.value = false;
  if (scanAnimationFrame) {
    cancelAnimationFrame(scanAnimationFrame);
    scanAnimationFrame = null;
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}
</script>

<style scoped>
.account-setup {
  padding: 16px;
}
button {
  margin: 8px;
  padding: 8px 16px;
}
</style>
