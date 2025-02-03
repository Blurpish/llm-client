<template>
  <div class="space-y-6 mt-4">
    <!-- User Profile Card -->
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex gap-4">
          <img :src="qrCodeUrl" alt="User QR Code" class="w-24 h-24 rounded" />
          <div>
            <p>User ID: {{ userId }}</p>
            <Button @click="startScan">Scan for Pairing</Button>
          </div>
        </div>
        <div v-if="scanning" class="mt-4">
          <video ref="videoEl" autoplay playsinline class="w-full rounded"></video>
          <canvas ref="canvasEl" class="hidden"></canvas>
          <p>Scanning in progress...</p>
        </div>
      </CardContent>
    </Card>

    <!-- Custom Instructions Card -->
    <Card>
      <CardHeader>
        <CardTitle>Custom Instructions</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div>
            <Label for="ci-name">How should the AI address you?</Label>
            <Input id="ci-name" type="text" v-model="localCustomInstructions.name" 
              @change="updateProfile" placeholder="Enter your name prompt" />
          </div>
          <div>
            <Label for="ci-occupation">What is your occupation?</Label>
            <Input id="ci-occupation" type="text" v-model="localCustomInstructions.occupation" 
              @change="updateProfile" placeholder="Enter occupation prompt" />
          </div>
          <div>
            <Label for="ci-traits">What traits should the AI have?</Label>
            <Input id="ci-traits" type="text" v-model="localCustomInstructions.traits" 
              @change="updateProfile" placeholder="Enter traits prompt" />
          </div>
          <div>
            <Label for="ci-other">Other instructions</Label>
            <Textarea id="ci-other" v-model="localCustomInstructions.other" 
              @change="updateProfile" placeholder="Other instructions"></Textarea>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import jsQR from 'jsqr';
import { useUserStore } from '/home/eban/Projects/Dev/Perso/llm-client/stores/user';

const userStore = useUserStore();

const userId = ref('');
const scanning = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let scanAnimationFrame: number | null = null;
let stream: MediaStream | null = null;

// Create a local copy of custom instructions
const localCustomInstructions = ref({
  name: '',
  occupation: '',
  traits: '',
  other: ''
});

onMounted(async () => {
  // Retrieve the user id from the globally stored database instance
  const db = (globalThis as any).database;
  if (db && db.userId) {
    userId.value = db.userId;
    const doc = await db.profile.findOne().exec();
    if (doc) {
      // Copy the database values to our local state
      const profile = doc.toJSON();
      Object.assign(localCustomInstructions.value, profile.customInstructions || {});
    }
  }
});

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
  const canvas = canvasEl.value;
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = videoEl.value.videoWidth;
  canvas.height = videoEl.value.videoHeight;
  context.drawImage(videoEl.value, 0, 0, canvas.width, canvas.height);
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

async function updateProfile() {
  const db = (globalThis as any).database;
  const doc = await db.profile.findOne().exec();
  if (doc) {
    // Convert the reactive ref to a plain object before saving
    const plainInstructions = {
      name: localCustomInstructions.value.name,
      occupation: localCustomInstructions.value.occupation,
      traits: localCustomInstructions.value.traits,
      other: localCustomInstructions.value.other
    };
    await doc.patch({ customInstructions: plainInstructions });
  }
}
</script>
