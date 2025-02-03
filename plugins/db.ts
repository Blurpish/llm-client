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
        required: ['id', 'object', 'created_at', 'title', 'timestamp', 'messages']
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
        required: ['id', 'object', 'created_at', 'name', 'email', 'avatar', 'bio', 'threads']
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
        required: ['id', 'name', 'path', 'parentPath', 'created_at']
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
  
  // Setup replication for the threads collection using WebRTC
  const database = (globalThis as any).database;
  (async () => {
    const replicationPool = await replicateWebRTC({
      collection: database.threads,
      topic: `eban-threads-pool-${(database as any).userId}`,
      connectionHandlerCreator: getConnectionHandlerSimplePeer({
        signalingServerUrl: 'wss://llm-client-signaling.eban.eu.org'
      }),
      pull: {},
      push: {}
    });
    replicationPool.error$.subscribe(err => {
      console.error('Replication error:', err);
    });
    replicationPool.peerStates$.subscribe(() => {});
    // Optionally, you can cancel replication when needed:
    // replicationPool.cancel();
  })();
});
