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
          object: { type: 'string', enum: ['thread'] },
          created_at: { type: 'integer', minimum: 0 },
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
  (async () => {
    Object.keys(collectionsConfig).forEach(async (collectionKey) => {
      console.log(`Replicating "${collectionKey}" collection`);
      console.log({
        collection: database[collectionKey],
        topic: `eban-${collectionKey}-pool-${(database as any).userId}`,
        ICE_USERNAME,
        ICE_CREDENTIAL
      })
      const replicationPool = await replicateWebRTC({
        collection: database[collectionKey],
        topic: `llmclient-{collectionKey}-pool-${(database as any).userId}`,
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
      replicationPool.error$.subscribe(err => {
        console.error(`Replication error in "${collectionKey}":`, err);
      });
      replicationPool.peerStates$.subscribe(() => {
        console.log(replicationPool.peerStates$)
      });
      // Optionally, you can cancel replication when needed:
      // replicationPool.cancel();
    });
  })();
});
