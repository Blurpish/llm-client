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
              <div class="mt-4">
                <template v-if="showQr">
                  <span class="block text-sm text-gray-500">Pairing QR Code</span>
                  <img :src="qrCodeUrl" alt="QR Code" class="w-10 h-10 border rounded mb-2" />
                  <Button size="sm" @click="showQr = false">Hide pairing QR Code</Button>
                </template>
                <template v-else>
                  <Button size="sm" @click="showQr = true">Show pairing QR Code</Button>
                </template>
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
                <Input id="ci-name" type="text" v-model="localCustomInstructions.name" @change="updateProfile"
                  placeholder="Enter your name prompt" />
              </div>
              <div>
                <Label for="ci-occupation">What is your occupation?</Label>
                <Input id="ci-occupation" type="text" v-model="localCustomInstructions.occupation"
                  @change="updateProfile" placeholder="Enter occupation prompt" />
              </div>
              <div>
                <Label for="ci-traits">What traits should the AI have?</Label>
                <Input id="ci-traits" type="text" v-model="localCustomInstructions.traits" @change="updateProfile"
                  placeholder="Enter traits prompt" />
              </div>
              <div>
                <Label for="ci-other">Other instructions</Label>
                <Textarea id="ci-other" v-model="localCustomInstructions.other" @change="updateProfile"
                  placeholder="Other instructions"></Textarea>
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
                  <div class="flex items-center gap-2">
                    <Icon :name="provider.icon" class="w-4 h-4" /> <!-- new icon display -->
                    <span>{{ provider.name }}</span>
                  </div>
                  <Button @click="userStore.providers[provider.id] ? disconnect(provider.id) : connect(provider.id)"
                    :class="userStore.providers[provider.id] ? 'group bg-green-600 hover:bg-red-600' : ''" size="sm">
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
                <div class="mt-4" v-if="provider.id === 'ollama' && userStore.providers[provider.id]">
                    <Label for="ollama-serve-switch" class="block text-sm text-gray-500">
                      Serve to other devices
                    </Label>
                    <Switch id="ollama-serve-switch" v-model:checked="shouldServe" />
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
// New reactive variable for controlling QR code visibility:
const showQr = ref(false);

const { availableProviders, connectProvider, disconnectProvider: disconnectProviderFromAI } = useAI();
const providersList = computed(() => Array.from(availableProviders.values()));

const localCustomInstructions = ref({
  name: '',
  occupation: '',
  traits: '',
  other: ''
});

const qrCodeUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${userStore.accountId}`);

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

async function connect(providerId: string) {
  try {
    await connectProvider(providerId);
  } catch (error) {
    console.error(error);
  }
}
async function disconnect(providerId: string) {
  try {
    await disconnectProviderFromAI(providerId);
  } catch (error) {
    console.error(error);
  }
}

const shouldServe = computed({
  get: () => (userStore.device.capabilities as string[]).includes('ollama-serve'),
  set: (value: boolean) => {
    const capabilities = userStore.device.capabilities as string[];
    if (value && !capabilities.includes('ollama-serve')) {
      capabilities.push('ollama-serve');
    } else if (!value) {
      userStore.device.capabilities = capabilities.filter((c) => c !== 'ollama-serve');
    }
  }
});
</script>
