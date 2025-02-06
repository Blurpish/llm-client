<template>
  <div class="w-full max-w-2xl h-full flex flex-col justify-center mx-auto px-4">
    <h1 class="text-3xl font-bold">Welcome to LLM-Client!</h1>
    <p class="text-base mb-8">Let's get you set up with your account.</p>

    <!-- Onboarding Content -->
    <Card class="p-8">
      <!-- Step 0: Account Type -->
      <div v-if="currentStep === 0" class="text-center">
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
      </div>

      <!-- Step 1: Custom Instructions (only for new) -->
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
              <Icon name="lucide:zap" />
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
              <Icon name="simple-icons:ollama" />
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
              <Icon name="logos:hugging-face-icon" />
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
      <div v-if="(currentStep === (onboardingMode === 'new' ? 4 : 2))" class="text-center">
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

const { connectProvider } = useAI();

const router = useRouter();
const userStore = useUserStore();

// Local copies for onboarding
const currentStep = ref(0);
const onboardingMode = ref(userStore.onboardingMode);
const localInstructions = ref({
  name: "",
  occupation: "",
  traits: "",
  other: ""
});
const providers = ref({ ...userStore.providers });
const useServerSync = ref(userStore.useServerSync);

// New device dialog state
const deviceDialogOpen = ref(false);
const deviceSettings = reactive({
  name: "",
  icon: ""
});

// For editing defaults via ExploreModels
const exploreModelsOpen = ref(false);
const editDefaultKey = ref<string | null>(null);

function selectMode(mode: 'new' | 'sync') {
  onboardingMode.value = mode;
  userStore.onboardingMode = mode;
  if (mode === 'new') {
    userStore.generateAccountId();
  }
  deviceDialogOpen.value = true;
}

function finishDeviceSetup() {
  if (!deviceSettings.name || !deviceSettings.icon) {
    toast('Please fill both fields for device setup', { type: 'error' });
    return;
  }
  userStore.createDevice(deviceSettings.name, deviceSettings.icon);
  toast('Device settings saved', { description: `${deviceSettings.name} (${deviceSettings.icon})` });
  deviceDialogOpen.value = false;
  currentStep.value++; // Proceed to next step after device setup
}

// Compute steps based on mode
const steps = computed(() => {
  if (onboardingMode.value === 'new') {
    return ['Account Type', 'Custom Instructions', 'Customize Models', 'Providers', 'Server Sync'];
  }
  return ['Account Type', 'Providers', 'Server Sync'];
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
    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
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
    console.log('Syncing account with selected providers...');
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

// Replace icon mappings (remove "lucide:" prefix)
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
    await connectProvider(providerId)
    providers.value[providerId] = true
    userStore.providers[providerId] = true
  } catch (error) {
    toast(`Failed to connect ${providerId}:`, { type: 'error', message: error.message })
  }
}
</script>
