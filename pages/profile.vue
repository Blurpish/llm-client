<template>
  <div class="container mt-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column -->
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex gap-4 flex-col">
              <div>
                <span class="block text-sm text-gray-500">User ID</span>
                <span class="block text-sm font-semibold">{{ userStore.accountId }}</span>
              </div>
              <div>
                <span class="block text-sm text-gray-500">Device</span>
                <span class="block text-sm font-semibold">
                  <Icon :name="'lucide:' + userStore.device.icon" />
                  {{ userStore.device.name }}
                </span>
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

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div v-for="provider in providersList" :key="provider.id" class="mb-4">
                <div class="flex items-center gap-4 justify-between">
                  <span>{{ provider.name }}</span>
                  <Button
                    @click="userStore.providers[provider.id] ? disconnect(provider.id) : connect(provider.id)"
                    :class="userStore.providers[provider.id] ? 'group bg-green-600 hover:bg-red-600' : ''"
                    size="sm"
                  >
                    <template v-if="userStore.providers[provider.id]">
                      <Icon name="lucide:plug-zap" class="group-hover:hidden" />
                      <Icon name="lucide:unplug" class="hidden group-hover:block" />
                      <span class="group-hover:hidden">Connected</span>
                      <span class="hidden group-hover:inline">Disconnect</span>
                    </template>
                    <template v-else>
                      <Icon name="lucide:plug" />
                      <span>Connect</span>
                    </template>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import jsQR from 'jsqr';
import { useUserStore } from '@/stores/user';
import { useAI } from '@/composables/useAI';

const userStore = useUserStore();
const { availableProviders, connectProvider, disconnectProvider: disconnectProviderFromAI } = useAI();
const providersList = computed(() => Array.from(availableProviders.values()));

const scanning = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let scanAnimationFrame: number | null = null;
let stream: MediaStream | null = null;

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
    const doc = await db.profile.findOne().exec();
    if (doc) {
      // Copy the database values to our local state
      const profile = doc.toJSON();
      Object.assign(localCustomInstructions.value, profile.customInstructions || {});
    }
  }
});

const qrCodeUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${userStore.accountId}`);

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

// Replace local enable/disconnect functions:
async function connect(providerId: string) {
  try {
    await connectProvider(providerId);
    userStore.providers[providerId] = true;
  } catch (error) {
    console.error(error);
  }
}
async function disconnect(providerId: string) {
  try {
    await disconnectProviderFromAI(providerId);
    userStore.providers[providerId] = false;
  } catch (error) {
    console.error(error);
  }
}
</script>
