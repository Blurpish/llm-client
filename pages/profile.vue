<template>
  <div class="user-profile">
    <h2>User Profile</h2>
    <p>User ID: {{ userId }}</p>
    <div class="qr-code">
      <img :src="qrCodeUrl" alt="User QR Code" />
    </div>
    <button @click="startScan">Scan for Pairing</button>
    <!-- Scanning view -->
    <div v-if="scanning">
      <video ref="videoEl" autoplay playsinline style="width:100%;"></video>
      <canvas ref="canvasEl" style="display:none;"></canvas>
      <p>Scanning in progress...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import jsQR from 'jsqr';

const userId = ref('');
const scanning = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let scanAnimationFrame: number | null = null;
let stream: MediaStream | null = null;

onMounted(() => {
  // Retrieve the user id from the globally stored database instance
  const db = (globalThis as any).database;
  if (db && db.userId) {
    userId.value = db.userId;
  }
});

// Using an external API to create a QR code for the user id
const qrCodeUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${userId.value}`);

async function startScan() {
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

function scanLoop() {
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
    // Handle scanned data as needed
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
.user-profile {
  padding: 16px;
}
.qr-code {
  margin: 16px 0;
}
.qr-code img {
  width: 150px;
  height: 150px;
}
</style>
