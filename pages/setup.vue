<template>
  <div class="w-full max-w-2xl h-full flex flex-col justify-center mx-auto px-4">
    <h1 class="text-3xl font-bold">Welcome to LLM-Client!</h1>
    <p class="text-base mb-8">Let's get you set up with your account.</p>

    <!-- Onboarding Content -->
    <Card class="p-8">
      <!-- Step 0: Account Type -->
      <div v-if="currentStep === 0" class="text-center">
        <template v-if="!onboardingMode">
          <h2 class="text-2xl font-semibold mb-4">Choose Account Type</h2>
          <div class="flex justify-center gap-4">
            <Button variant="outline" @click="selectMode('new')"
              :class="onboardingMode === 'new' && 'bg-primary text-white'">
              <Icon name="tabler:plus" /> New Account
            </Button>
            <Button variant="outline" @click="selectMode('sync')"
              :class="onboardingMode === 'sync' && 'bg-primary text-white'">
              <Icon name="tabler:share" /> Sync Account
            </Button>
          </div>
        </template>
        <template v-else-if="onboardingMode === 'sync'">
          <h2 class="text-2xl font-semibold mb-4">Bind Device to Existing Account</h2>
          <div class="mb-4">
            <Button @click="startScan" variant="outline">Start QR Scan</Button>
          </div>
          <div v-if="scanning" class="mb-4">
            <video ref="videoEl" autoplay playsinline class="w-full rounded mb-2"></video>
            <!-- canvas is hidden -->
            <canvas ref="canvasEl" class="hidden"></canvas>
            <p>Scanning in progress...</p>
          </div>
          <div class="mb-4">
            <Input v-model="scannedAccountId" placeholder="Enter Account ID manually" label="Account ID" />
          </div>
          <Button @click="finishSyncSetup" :disabled="!scannedAccountId">Bind Device</Button>
        </template>
      </div>

      <div v-if="currentStep === 1 && onboardingMode === 'new'">
        <h2 class="text-2xl font-semibold mb-4 text-center">Set Custom Instructions</h2>
        <div class="space-y-4">
          <div class="space-y-4">
            <div>
              <Label>How should the AI models call you?</Label>
              <Input v-model="localInstructions.name" placeholder="Your name" label="Name" />
            </div>
            <div>
              <Label>What's your occupation?</Label>
              <Input v-model="localInstructions.occupation" placeholder="Your occupation" label="Occupation" />
            </div>
            <div>
              <Label>What traits should the AI have?</Label>
              <Textarea v-model="localInstructions.traits" placeholder="Personal traits" label="Traits" />
            </div>
            <div>
              <Label>Any other information?</Label>
              <Textarea v-model="localInstructions.other" placeholder="Other instructions" label="Other" />
            </div>
          </div>
          <div class="flex justify-between">
            <Button @click="prevStep" variant="outline">Back</Button>
            <div class="space-x-4">
              <Button @click="nextStep" variant="outline">Skip</Button>
              <Button @click="nextStep" :disabled="!localInstructions.name || !localInstructions.occupation">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="(currentStep === 2)">
        <h2 class="text-2xl font-semibold mb-2 text-center">Select AI Providers</h2>
        <p class="text-center text-gray-500 mb-4">Choose the providers you want to use for AI models.</p>
        <div class="space-y-4">
          <!-- OpenRouter -->
          <div class="flex items-center justify-between p-4 border rounded">
            <div class="flex items-center gap-3">
              <Icon :name="openrouterIcon" />
              <div>
                <span>OpenRouter</span>
                <p class="text-sm text-gray-500">Recommended</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Button v-if="providers['openrouter']" :disabled="true" class="bg-green-600" size="sm">
                <Icon name="lucide:check" /> Connected
              </Button>
              <Button v-else size="sm" @click="enableProvider('openrouter')">
                <Icon name="lucide:plug" /> Connect
              </Button>
            </div>
          </div>
          <!-- Ollama -->
          <div class="flex items-center justify-between p-4 border rounded">
            <div class="flex items-center gap-3">
              <Icon :name="ollamaIcon" />
              <span>Ollama</span>
            </div>
            <div class="flex items-center gap-3">
              <Button v-if="providers['ollama']" :disabled="true" class="bg-green-600" size="sm">
                <Icon name="lucide:check" /> Connected
              </Button>
              <Button v-else size="sm" @click="enableProvider('ollama')">
                <Icon name="lucide:plug" /> Connect
              </Button>
            </div>
          </div>
          <!-- HuggingFace -->
          <div class="flex items-center justify-between p-4 border rounded">
            <div class="flex items-center gap-3">
              <Icon :name="huggingfaceIcon" />
              <span>HuggingFace</span>
            </div>
            <div class="flex items-center gap-3">
              <Button v-if="providers['huggingface']" :disabled="true" class="bg-green-600" size="sm">
                <Icon name="lucide:check" /> Connected
              </Button>
              <Button v-else size="sm" @click="enableProvider('huggingface')">
                <Icon name="lucide:plug" /> Connect
              </Button>
            </div>
          </div>
          <div class="flex justify-between">
            <Button @click="prevStep" variant="outline">Back</Button>
            <div class="space-x-4">
              <Button @click="nextStep" :disabled="Object.values(providers).every(v => !v)">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Customize Default Models -->
      <div v-if="currentStep === 3">
        <h2 class="text-2xl font-semibold mb-4 text-center">Customize Default Models</h2>
        <div class="space-y-4">
          <div v-for="(model, key) in userStore.defaultModels" :key="key"
            class="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <Icon :name="'lucide:' + getModelIcon(key)" class="w-6 h-6" />
              <div>
                <p class="font-medium">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</p>
                <p class="text-sm text-gray-500">{{ model.name }}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" @click="editDefault(key)">
              <Icon name="lucide:pen" class="w-4 h-4" />
            </Button>
          </div>
          <!-- ExploreModels dialog for editing a default -->
          <ExploreModels :open="exploreModelsOpen" :editingDefault="true" @update:open="exploreModelsOpen = $event"
            @select-model="updateDefaultModel" />
        </div>
        <div class="flex justify-between mt-4">
          <Button @click="prevStep" variant="outline">Back</Button>
          <Button @click="nextStep">Next</Button>
        </div>

      </div>

      <!-- Last Step: Server Sync -->
      <div v-if="currentStep === 4">
        <h2 class="text-2xl font-semibold mb-4">Enable Server Sync</h2>
        <p class="text-gray-500 mb-4">Enable server sync to save your data across devices. Data is synced in P2P by
          default, server sync allows to backup data even when on device is offline.</p>
        <div class="flex items-center justify-center gap-4">
          <Switch v-model:checked="useServerSync" />
          <span class="font-medium">{{ useServerSync ? 'Enabled' : 'Disabled' }}</span>
        </div>
        <div class="flex justify-between mt-4">
          <Button @click="prevStep" variant="outline">Back</Button>
          <Button @click="finishOnboarding" :disabled="onboardingMode === 'new' && !useServerSync">Finish</Button>
        </div>
      </div>

      <!-- Progress Dots -->
      <div class="flex justify-center mt-4">
        <span v-for="(step, index) in steps" :key="index"
          :class="{ 'text-primary': index === currentStep, 'text-gray-400': index !== currentStep }"
          class="text-xl mx-1">
          •
        </span>
      </div>
    </Card>
  </div>


  <Dialog v-model:open="deviceDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Device Setup</DialogTitle>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div>
          <Label for="deviceName">Device Name</Label>
          <Input id="deviceName" v-model="deviceSettings.name" placeholder="Enter device name" />
        </div>
        <div>
          <Label for="deviceIcon">Device Icon</Label>
          <IconPicker v-model="deviceSettings.icon" placeholder="Select device icon" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="deviceDialogOpen = false">Cancel</Button>
        <Button @click="finishDeviceSetup">Save Device</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import ExploreModels from '@/components/ExploreModels.vue';
import { useAI } from '@/composables/useAI';
import { toast } from 'vue-sonner';
import jsQR from 'jsqr';

const { connectProvider, availableProviders } = useAI();
const router = useRouter();
const userStore = useUserStore();

// Local copies for onboarding
const currentStep = ref(0);
const onboardingMode = ref<string | null>(null);
const localInstructions = ref({
  name: "",
  occupation: "",
  traits: "",
  other: ""
});
const providers = ref({ ...userStore.providers });
const useServerSync = ref(userStore.useServerSync);

const scanning = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let scanAnimationFrame: number | null = null;
let stream: MediaStream | null = null;
const scannedAccountId = ref("");

// For editing defaults via ExploreModels
const exploreModelsOpen = ref(false);
const editDefaultKey = ref<string | null>(null);

function selectMode(mode: 'new' | 'sync') {
  onboardingMode.value = mode;
  userStore.onboardingMode = mode;
  if (mode === 'new') {
    userStore.generateAccountId();
    deviceDialogOpen.value = true;
  } else {
    startScan();
  }
}

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
    scannedAccountId.value = code.data;
    stopScan();
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

function finishSyncSetup() {
  if (!scannedAccountId.value) {
    toast('Please scan or enter a valid Account ID', { type: 'error' });
    return;
  }
  userStore.accountId = scannedAccountId.value;
  toast(`Device bound to account ${scannedAccountId.value}`);
  deviceDialogOpen.value = true;
  stopScan();
}

function finishDeviceSetup() {
  if (!deviceSettings.name || !deviceSettings.icon) {
    toast('Please fill both fields for device setup', { type: 'error' });
    return;
  }
  userStore.createDevice(deviceSettings.name, deviceSettings.icon);
  toast('Device settings saved', { description: `${deviceSettings.name} (${deviceSettings.icon})` });
  deviceDialogOpen.value = false;
  currentStep.value++;

  if (onboardingMode.value === 'sync') {
    nextStep();
  }
}

const steps = computed(() => {
  if (onboardingMode.value === 'new') {
    return ['Account Type', 'Custom Instructions', 'Customize Models', 'Providers', 'Server Sync'];
  }
  return ['Account Type', 'Customize Models', 'Providers', 'Server Sync'];
});

function nextStep() {
  currentStep.value++;
}
function prevStep() {
  currentStep.value--;
}

async function finishOnboarding() {
  userStore.useServerSync = useServerSync.value;
  const db = (globalThis as any).database;
  if (onboardingMode.value === 'new') {
    const userId = userStore.accountId;
    await db.profile.upsert({
      id: userId,
      object: 'profile',
      created_at: Date.now(),
      name: 'New User',
      email: '',
      avatar: '',
      bio: '',
      threads: [],
      customInstructions: { ...localInstructions.value }
    });
    db.userId = userId;
  } else {
    console.log('Syncing account with scanned Account ID...');
  }
  router.push('/');
}

// --- Customize predefinedModels with ExploreModels ---
function editDefault(key: string) {
  editDefaultKey.value = key;
  exploreModelsOpen.value = true;
}
function updateDefaultModel(model: any) {
  if (editDefaultKey.value) {
    userStore.predefinedModels[editDefaultKey.value] = {
      ...model,
      provider: model.provider || 'openrouter'
    };
    editDefaultKey.value = null;
  }
}

function getModelIcon(type: string): string {
  const icons = {
    mini: "zap",
    base: "bot",
    max: "brain"
  };
  return icons[type as keyof typeof icons] || "box";
}

async function enableProvider(providerId: string) {
  try {
    await connectProvider(providerId);
    providers.value[providerId] = true;
    userStore.providers[providerId] = true;
  } catch (error: any) {
    toast(`Failed to connect ${providerId}:`, { type: 'error', message: error.message });
  }
}

// --- New device dialog state (for new accounts) ---
const deviceDialogOpen = ref(false);
const deviceSettings = reactive({
  name: "",
  icon: ""
});

const openrouterIcon = computed(() => {
  const prov = availableProviders.get('openrouter');
  return prov?.icon || 'lucide:zap';
});
const ollamaIcon = computed(() => {
  const prov = availableProviders.get('ollama');
  return prov?.icon || 'simple-icons:ollama';
});
const huggingfaceIcon = computed(() => {
  const prov = availableProviders.get('huggingface');
  return prov?.icon || 'logos:hugging-face-icon';
});
</script>
