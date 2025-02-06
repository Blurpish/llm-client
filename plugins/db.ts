// Polyfill process.nextTick in the browser if not defined
if (typeof process === 'undefined' || !process.nextTick) {
  (window as any).process = {
    nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0)
  };
}

import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { replicateWebRTC, getConnectionHandlerSimplePeer } from 'rxdb/plugins/replication-webrtc';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { ollamaProvider } from '@/plugins/ollama'
import { useUserStore } from '@/stores/user'

let globalPeers = [];
export function getPeers() {
  return globalPeers;
}

let threadDoc: any = null

async function safePatch(patch: object, id): Promise<void> {
  let success = false;
  while (!success) {
    try {
      threadDoc = await (globalThis as any).database.threads.findOne({ selector: { id: id } }).exec();
      await threadDoc.patch(patch);
      success = true;
    } catch (err: any) {
      if (err.status === 409) {
        // Conflict: wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw err;
      }
    }
  }
}

function handleReplicationPool(replicationPool: any, database: any) {
  replicationPool.peerStates$.subscribe(() => {
    const peers = replicationPool.peerStates$.getValue().values().toArray();
    console.log('Peers:', peers);
    if (peers.length > 0) {
      peers[0].peer.on('data', async (data: any) => {
        const message = JSON.parse(data.toString());
        if (message.method == 'token' && message.data && message.data.device) {
          if (!globalPeers.find(peer => peer.device.id == message.data.device.id)) {
            globalPeers.push({
              peer: peers[0].peer,
              device: message.data.device
            });
          }
        }
        else if (message.method === 'token' && message.data && message.data.type === 'ollama-request') {
          const { messages, model, threadId } = message.data;
          const userStore = useUserStore();
          if (userStore.device.capabilities.includes('ollama-serve')) {
            const toast = useToast()
            toast.toast({
              title: 'Remote Ollama Request',
              description: 'Processing generation request...',
              duration: 3000
            })
            
            try {
              // Send start signal to client
              peers[0].peer.send(JSON.stringify({
                method: 'token',
                data: {
                  type: 'completionStatus',
                  status: 'started',
                  threadId
                }
              }));
              
              for await (const tokenChunk of ollamaProvider.chat(messages, model)) {
                const delta = tokenChunk.choices[0].delta
                const freshDoc = await database.threads.findOne({ selector: { id: threadId } }).exec()
                let currentMessages = freshDoc.get('messages') || []
                const lastMsg = { ...currentMessages[currentMessages.length - 1] }
                lastMsg.content += delta.content
                const updatedMessages = [...currentMessages.slice(0, -1), lastMsg]
                await safePatch({ messages: updatedMessages }, threadId)
                messages.value = updatedMessages
              }
              
              // Send completion signal
              peers[0].peer.send(JSON.stringify({
                method: 'token',
                data: {
                  type: 'completionStatus',
                  status: 'completed',
                  threadId
                }
              }));
            } catch (error) {
              console.error('Error processing AI completion:', error);
              // Send error status
              peers[0].peer.send(JSON.stringify({
                method: 'token',
                data: {
                  type: 'completionStatus',
                  status: 'error',
                  threadId,
                  error: error.message
                }
              }));
            }
          }
        } else if (message.method === 'token' && message.data && message.data.type === 'ollama-list-req') {
          const userStore = useUserStore();
          if (userStore.device.capabilities.includes('ollama-serve')) {
            console.log('Fetching AI models...');
            try {
              const models = await ollamaProvider.fetchModels();
              peers[0].peer.send(
                JSON.stringify({
                  method: 'token',
                  data: {
                    type: 'ollama-list-resp',
                    models
                  }
                })
              );
            } catch (error) {
              console.error('Error fetching AI models:', error);
            }
          }
        } else if (message.method === 'token' && message.data && message.data.type === 'ollama-list-resp') {
          window.postMessage(JSON.stringify({
            method: 'token',
            data: {
              type: 'ollama-list-resp',
              models: message.data.models
            }
          }), '*');
        }
      });
      peers.forEach((peer) => {
        peer.peer.send(
          JSON.stringify({
            method: 'token',
            data: {
              accountId: useUserStore().accountId,
              device: {
                id: useUserStore().device.id,
                name: useUserStore().device.name,
                icon: useUserStore().device.icon,
                capabilities: useUserStore().device.capabilities,
              },
            }
          })
        );
      });
    } else {
      globalPeers = [];
    }
  });
}

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();
  const ICE_USERNAME = config.public.RTC_ICE_USERNAME;
  const ICE_CREDENTIAL = config.public.RTC_ICE_CREDENTIAL;

  addRxPlugin(RxDBDevModePlugin);
  addRxPlugin(RxDBMigrationSchemaPlugin);

  const collectionsConfig = {
    threads: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          title: { type: 'string' },
          timestamp: { type: 'number' },
          tool_resources: { type: ['object', 'null'], default: null },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', maxLength: 100 },
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { oneOf: [{ type: 'string' }, { type: 'array' }] },
                attachments: { type: ['array', 'null'], default: null },
                timestamp: { type: 'number' }
              },
              required: ['id', 'role', 'content', 'timestamp']
            }
          },
          pinned: { type: 'boolean', default: false },
          folderPath: { type: 'string', default: '/' }
        },
      }
    },
    profile: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          object: { type: 'string', enum: ['profile'] },
          created_at: { type: 'integer', minimum: 0 },
          name: { type: 'string' },
          email: { type: 'string' },
          avatar: { type: 'string' },
          bio: { type: 'string' },
          threads: {
            type: 'array',
            items: { type: 'string' }
          },
          customInstructions: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              occupation: { type: 'string' },
              traits: { type: 'string' },
              other: { type: 'string' }
            },
            default: { name: "", occupation: "", traits: "", other: "" }
          }
        },
      }
    },
    folders: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string' },
          path: { type: 'string' },
          parentPath: { type: 'string' },
          created_at: { type: 'integer', minimum: 0 }
        },
      }
    },
    masks: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string' },
          prompt: { type: 'string' },
          icon: { type: 'string', default: 'lucide:user' },
          created_at: { type: 'integer', minimum: 0 }
        },
      }
    }
  };

  if (!(globalThis as any).database) {
    const database = await createRxDatabase({
      name: 'database',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      })
    });
    (globalThis as any).database = database;
    await database.addCollections(collectionsConfig);

    const profileDoc = await database.profile.findOne().exec();
    (database as any).userId = profileDoc ? profileDoc.id : null;
  } else {
    const database = (globalThis as any).database;
    const profileDoc = await database.profile.findOne().exec();
    (database as any).userId = profileDoc ? profileDoc.id : null;
    for (const [name, config] of Object.entries(collectionsConfig)) {
      if (!database.collections[name]) {
        await database.addCollections({ [name]: config });
      } else {
        const currentVersion = database.collections[name].schema.version;
        const newVersion = config.schema.version;
        if (currentVersion < newVersion && (database.collections[name] as any).migrate) {
          await database.collections[name].migrate();
        }
      }
    }
  }

  const database = (globalThis as any).database;
  let firstSubscriptionAdded = false;

  (async () => {
    Object.keys(collectionsConfig).forEach(async (collectionKey) => {
      const replicationPool = await replicateWebRTC({
        collection: database[collectionKey],
        topic: `llmclient-${collectionKey}-pool-${useUserStore().accountId}`,
        connectionHandlerCreator: getConnectionHandlerSimplePeer({
          signalingServerUrl: 'wss://llm-client-signaling.eban.eu.org',
          config: {
            iceServers: [
              {
                urls: "stun:stun.relay.metered.ca:80",
              },
              {
                urls: "turn:global.relay.metered.ca:80",
                username: ICE_USERNAME,
                credential: ICE_CREDENTIAL,
              },
              {
                urls: "turn:global.relay.metered.ca:80?transport=tcp",
                username: ICE_USERNAME,
                credential: ICE_CREDENTIAL,
              },
              {
                urls: "turn:global.relay.metered.ca:443",
                username: ICE_USERNAME,
                credential: ICE_CREDENTIAL,
              },
              {
                urls: "turns:global.relay.metered.ca:443?transport=tcp",
                username: ICE_USERNAME,
                credential: ICE_CREDENTIAL,
              },
            ]
          }
        }),
        pull: {},
        push: {}
      });
      // Call the external function only for the first replication
      if (!firstSubscriptionAdded) {
        handleReplicationPool(replicationPool, (globalThis as any).database);
        firstSubscriptionAdded = true;
      }
      replicationPool.error$.subscribe(err => {
        console.error(`Replication error in "${collectionKey}":`, err);
      });
    });
  })();

  return {
    provide: {
      getPeers
    }
  }
});
