import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { Connector } from './Connector';
import { Alert } from 'react-native';
import { attachmentQueue } from '@/lib/attachments/attachmentQueue';
import { ATTACHMENT_WATCH_QUERY } from '@/lib/attachments/watchAttachments';
import { cleanupStagedAttachments } from '@/lib/attachments/cleanupStagedAttachments';

let isConnected = false;
let connectPromise: Promise<void> | null = null;

export const getCombinedUploadQueueStats = async (
  powersync: AbstractPowerSyncDatabase
): Promise<{ count: number; size?: number }> => {
  try {
    const crudStats = await powersync.getUploadQueueStats();
    let pendingAttachments = 0;
    if (typeof powersync.getOptional === 'function') {
      const attRow = await powersync.getOptional<{ count: number }>(
        `SELECT count(*) as count FROM attachments WHERE state IN (0, 2)`
      );
      pendingAttachments = attRow?.count ?? 0;
    }
    return {
      count: (crudStats?.count ?? 0) + pendingAttachments,
      size: crudStats?.size ?? undefined,
    };

  } catch (e) {
    console.warn('[PowerSync] getCombinedUploadQueueStats failed:', e);
    return { count: 0 };
  }
};

export const setupPowerSync = async (powersync: AbstractPowerSyncDatabase) => {
  if (isConnected) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      await powersync.connect(new Connector());
      isConnected = true;

      // Start attachment queue sync
      await attachmentQueue.startSync();

      // Log & assert resolved tables for the attachment watch query
      try {
        const resolvedTables = await powersync.resolveTables(ATTACHMENT_WATCH_QUERY);
        console.log('[PowerSync] Attachment watch resolved tables:', resolvedTables);
        const requiredTables = ['projects', 'drawings', 'profiles', 'reports'];
        const missing = requiredTables.filter((t) => !resolvedTables.includes(t));
        if (missing.length > 0) {
          console.warn('[PowerSync] WARNING: Attachment watch query missed required tables:', missing);
        }
      } catch (e) {
        console.warn('[PowerSync] Could not resolve tables for attachment watch query:', e);
      }


      // Reconcile and clean up any unreferenced attachments from abandoned drafts
      await cleanupStagedAttachments(powersync);
    } catch (error) {
      isConnected = false;
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

export const isPowerSyncConnected = () => isConnected;

export const resetPowerSyncConnectionStateForTesting = () => {
  isConnected = false;
  connectPromise = null;
};

const resetConnectionState = () => {
  isConnected = false;
  connectPromise = null;
};

const performDisconnectAndClear = async (
  powersync: AbstractPowerSyncDatabase,
  onConfirm: () => Promise<void>
) => {
  try {
    await attachmentQueue.stopSync();
    await attachmentQueue.clearQueue();
    await powersync.disconnectAndClear();
  } finally {
    resetConnectionState();
  }
  await onConfirm();
};

export const teardownPowerSync = async (powersync: AbstractPowerSyncDatabase) => {
  if (!isConnected && !connectPromise) return;
  try {
    const stats = await getCombinedUploadQueueStats(powersync);
    if (stats.count > 0) {
      Alert.alert(
        'Offline Changes Saved',
        `You have ${stats.count} unsynced changes. They have been saved securely on this device and will sync the next time you sign in.`,
        [{ text: 'OK' }]
      );
    }
    // Stop sync only; do NOT clear attachments (preserves queued files across sign-out)
    await attachmentQueue.stopSync();
    await powersync.disconnect();
  } catch (error) {
    console.warn('[PowerSync] teardown failed:', error);
  } finally {
    resetConnectionState();
  }
};

export const clearPowerSyncForNewUser = async (
  powersync: AbstractPowerSyncDatabase,
  onConfirm: () => Promise<void>,
  onCancel: () => void
) => {
  try {
    const stats = await getCombinedUploadQueueStats(powersync);
    if (stats.count > 0) {
      Alert.alert(
        'Warning: Unsynced Data',
        `The previous user left ${stats.count} unsynced changes on this device. Signing in as a different user will permanently delete these changes and any unsynced photos, drawings, or attachments.\n\nAre you sure you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          {
            text: 'Delete and Sign In',
            style: 'destructive',
            onPress: async () => {
              await performDisconnectAndClear(powersync, onConfirm);
            },
          },
        ]
      );
    } else {
      await performDisconnectAndClear(powersync, onConfirm);
    }
  } catch (error) {
    console.warn('[PowerSync] clear for new user failed:', error);
    await performDisconnectAndClear(powersync, onConfirm);
  }
};

